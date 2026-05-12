// Shared helpers for Pages Functions. Imported via relative path from each
// endpoint, e.g.: import { jsonResponse, rateCheck, callClaude } from "../_lib.js";

export function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      ...extraHeaders
    }
  });
}

export function corsPreflight(allowedMethods = 'POST') {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': `${allowedMethods}, OPTIONS`,
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}

export function methodNotAllowed(allowedMethods = 'POST') {
  return jsonResponse({ error: 'Method not allowed.' }, 405, {
    'Allow': `${allowedMethods}, OPTIONS`
  });
}

export async function ipHash(request) {
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
  // Day-bucketed hash so the fingerprint rotates daily and we don't hold a
  // long-term identifier of the user.
  const day = new Date().toISOString().slice(0, 10);
  const enc = new TextEncoder().encode(ip + ':' + day);
  const hash = await crypto.subtle.digest('SHA-256', enc);
  // 64-bit (8-byte) fingerprint is sufficient for daily rate-limiting:
  // collision probability at 10k unique daily IPs is ~3e-12 (birthday-bound).
  // Truncating shortens the KV key without weakening privacy; the daily
  // rotation is what does the real privacy work.
  return [...new Uint8Array(hash)].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Seconds remaining until 00:00 UTC tomorrow — used for Retry-After on
// daily-bucket rate limits so polite clients can backoff intelligently.
function secondsUntilMidnightUtc() {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1
  ));
  return Math.max(60, Math.floor((tomorrow.getTime() - now.getTime()) / 1000));
}

export async function rateCheck(env, fingerprint, tool, perIpDaily, globalDaily) {
  if (!env.RATE_LIMITS) {
    return { ok: true, reason: 'KV not configured (dev)' };
  }
  const day = new Date().toISOString().slice(0, 10);
  const ipKey = `ip:${tool}:${fingerprint}:${day}`;
  const globalKey = `global:${tool}:${day}`;

  const [ipCountStr, globalCountStr] = await Promise.all([
    env.RATE_LIMITS.get(ipKey),
    env.RATE_LIMITS.get(globalKey)
  ]);
  const ipCount = parseInt(ipCountStr || '0', 10);
  const globalCount = parseInt(globalCountStr || '0', 10);

  const retryAfterSec = secondsUntilMidnightUtc();
  if (ipCount >= perIpDaily) return { ok: false, status: 429, reason: 'Personal daily limit reached. Try tomorrow.', retryAfterSec };
  if (globalCount >= globalDaily) return { ok: false, status: 429, reason: 'Site-wide daily limit reached. Try in a few hours.', retryAfterSec: Math.min(3600, retryAfterSec) };

  await Promise.all([
    env.RATE_LIMITS.put(ipKey, String(ipCount + 1), { expirationTtl: 86400 * 2 }),
    env.RATE_LIMITS.put(globalKey, String(globalCount + 1), { expirationTtl: 86400 * 2 })
  ]);
  return { ok: true };
}

// Structured error class so endpoints can give users specific reasons
// instead of swallowing the upstream message into a generic "could not".
export class ClaudeError extends Error {
  constructor(code, status, bodySnippet, message) {
    super(message || `${code} (${status})`);
    this.name = 'ClaudeError';
    this.code = code;          // 'auth' | 'rate_limit' | 'invalid_request' | 'overloaded' | 'timeout' | 'server_error' | 'network' | 'unknown'
    this.status = status;      // upstream HTTP status (or 0 for timeout/network)
    this.bodySnippet = bodySnippet || '';
  }
}

// Google Cloud Vision OCR — extracts text from an image without going through
// any LLM content classifier. Used by /api/ocr to give us reliable handwriting
// extraction; the resulting text is then sent to Anthropic for the actual
// marking/assessment work.
//
// Throws a ClaudeError-shape error on failure so userFacingClaudeError can
// translate it. Codes used: 'auth' (401/403 — bad/missing key), 'rate_limit'
// (429), 'invalid_request' (400 — image rejected), 'timeout', 'network',
// 'server_error', 'unknown'.
export async function callGoogleVision(env, { base64, mime, timeoutMs = 30000 }) {
  if (!env.GOOGLE_VISION_API_KEY) {
    throw new ClaudeError('auth', 0, '', 'GOOGLE_VISION_API_KEY not set');
  }
  const body = {
    requests: [{
      image: { content: base64 },
      features: [{ type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }],
      imageContext: { languageHints: [] }  // auto-detect
    }]
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let r;
  try {
    r = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(env.GOOGLE_VISION_API_KEY)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });
  } catch (e) {
    clearTimeout(timer);
    if (e.name === 'AbortError') throw new ClaudeError('timeout', 0, '', `Vision aborted after ${timeoutMs}ms`);
    throw new ClaudeError('network', 0, e.message || '', 'Network error talking to Google Vision');
  }
  clearTimeout(timer);

  if (!r.ok) {
    const errText = await r.text().catch(() => '');
    const snippet = errText.slice(0, 800);
    let code;
    if (r.status === 401 || r.status === 403) code = 'auth';
    else if (r.status === 429) code = 'rate_limit';
    else if (r.status === 400 || r.status === 422) code = 'invalid_request';
    else if (r.status >= 500) code = 'server_error';
    else code = 'unknown';
    throw new ClaudeError(code, r.status, snippet);
  }
  const data = await r.json().catch(() => ({}));
  const resp = data && data.responses && data.responses[0];
  if (resp && resp.error) {
    // Vision can return 200 with a per-image error in the body
    throw new ClaudeError('invalid_request', 200, JSON.stringify(resp.error).slice(0, 800));
  }
  const text = (resp && resp.fullTextAnnotation && resp.fullTextAnnotation.text) || '';
  return text;
}

// Single attempt. Used internally by callClaude. Throws ClaudeError on failure.
//
// Prompt caching: when the system prompt is a long stable string (>1024 chars
// is roughly the threshold worth caching), automatically wrap it in a
// content-array form with cache_control: ephemeral so Anthropic caches the
// prefix for 5 minutes. Cuts input-token cost ~90% on cache hits during
// launch traffic. Endpoints can opt out by passing `cache: false`.
async function callClaudeOnce(env, { model, system, user, max_tokens = 1500, timeoutMs = 55000, cache = true }) {
  if (!env.ANTHROPIC_API_KEY) {
    throw new ClaudeError('auth', 0, '', 'ANTHROPIC_API_KEY not set');
  }
  const userContent = typeof user === 'string'
    ? [{ type: 'text', text: user }]
    : user;

  // Build the system param. If it's a string and long enough, wrap with
  // ephemeral cache_control. If it's already an array, pass through (caller
  // has full control). If it's short or cache=false, leave as a plain string.
  let systemParam;
  if (Array.isArray(system)) {
    systemParam = system;
  } else if (typeof system === 'string' && cache && system.length > 1024) {
    systemParam = [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }];
  } else {
    systemParam = system;
  }

  const body = {
    model,
    max_tokens,
    system: systemParam,
    messages: [{ role: 'user', content: userContent }]
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let r;
  try {
    r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
  } catch (e) {
    clearTimeout(timer);
    if (e.name === 'AbortError') {
      throw new ClaudeError('timeout', 0, '', `Aborted after ${timeoutMs}ms`);
    }
    throw new ClaudeError('network', 0, e.message || '', 'Network error talking to Anthropic');
  }
  clearTimeout(timer);

  if (!r.ok) {
    const errText = await r.text().catch(() => '');
    const snippet = errText.slice(0, 800);
    let code;
    if (r.status === 401 || r.status === 403) code = 'auth';
    else if (r.status === 429) code = 'rate_limit';
    else if (r.status === 400 || r.status === 422) code = 'invalid_request';
    else if (r.status === 529) code = 'overloaded';
    else if (r.status >= 500) code = 'server_error';
    else code = 'unknown';
    throw new ClaudeError(code, r.status, snippet);
  }
  const data = await r.json();
  return (data.content || []).map(c => c.text || '').join('');
}

// Multi-step model fallback. If the primary model returns 403 (gating /
// alias / tier issue, NOT a 401 invalid-key issue), retry through the chain.
// The chain prioritizes Sonnet quality, then degrades to Haiku as a last
// resort. Configurable via ANTHROPIC_FALLBACK_MODELS env (comma-separated).
const DEFAULT_FALLBACK_CHAIN = [
  'claude-sonnet-4-5',           // common alias if 4-6 isn't recognized
  'claude-sonnet-4-5-20250929',  // dated alias as a third try
  'claude-haiku-4-5'             // final fallback — broadly available
];

export async function callClaude(env, opts) {
  const primary = opts.model;
  const envChain = env.ANTHROPIC_FALLBACK_MODELS
    ? env.ANTHROPIC_FALLBACK_MODELS.split(',').map(s => s.trim()).filter(Boolean)
    : DEFAULT_FALLBACK_CHAIN;
  // Build the full chain: primary first, then any fallback we haven't tried
  const chain = [primary, ...envChain.filter(m => m !== primary)];

  let firstErr = null;
  for (let i = 0; i < chain.length; i++) {
    const model = chain[i];
    try {
      const result = await callClaudeOnce(env, { ...opts, model });
      if (i > 0) console.error(`[claude_fallback] primary=${primary} failed, succeeded with ${model}`);
      return result;
    } catch (err) {
      if (!firstErr) firstErr = err;
      // Only retry on 403 (model gating) — other errors won't be fixed by
      // changing models, surface them immediately.
      if (!(err instanceof ClaudeError && err.code === 'auth' && err.status === 403)) {
        throw err;
      }
      console.error(`[claude_fallback] ${model} returned 403, trying next in chain`);
    }
  }
  // All models in chain returned 403 — surface the original error since
  // it points at the primary's gating (most diagnostically useful).
  throw firstErr;
}

// Pull human-readable detail out of an Anthropic error body. Tries (in
// order): JSON.parse the whole snippet, regex for nested error.message,
// regex for any top-level message, then falls back to the raw bytes
// truncated. We also surface error.type when present (e.g.
// "permission_error", "invalid_request_error") because that's
// diagnostically useful even without a message.
function extractUpstreamDetail(snippet) {
  if (!snippet) return '';
  // 1. Try strict JSON parse
  try {
    const obj = JSON.parse(snippet);
    const inner = obj && obj.error;
    if (inner && typeof inner === 'object') {
      const parts = [];
      if (inner.type) parts.push(inner.type);
      if (inner.message) parts.push(inner.message);
      if (parts.length) return parts.join(': ');
    }
    if (obj && obj.message) return String(obj.message);
  } catch {}

  // 2. Regex for nested error.message
  const m1 = /"error"\s*:\s*\{[^}]*?"message"\s*:\s*"((?:[^"\\]|\\.)*)"/m.exec(snippet);
  if (m1) {
    const typeMatch = /"error"\s*:\s*\{[^}]*?"type"\s*:\s*"((?:[^"\\]|\\.)*)"/m.exec(snippet);
    const msg = m1[1].replace(/\\"/g, '"').replace(/\\n/g, ' ');
    return typeMatch ? `${typeMatch[1]}: ${msg}` : msg;
  }

  // 3. Regex for any top-level message
  const m2 = /"message"\s*:\s*"((?:[^"\\]|\\.)*)"/m.exec(snippet);
  if (m2) return m2[1].replace(/\\"/g, '"').replace(/\\n/g, ' ');

  // 4. Regex for error.type alone (e.g. body has type but no message)
  const m3 = /"error"\s*:\s*\{[^}]*?"type"\s*:\s*"((?:[^"\\]|\\.)*)"/m.exec(snippet);
  if (m3) return m3[1].replace(/\\"/g, '"');

  // 5. Last resort: include the raw body so the user has SOMETHING. Trim
  // whitespace and cap at 200 chars; surround with brackets so they know
  // it's verbatim from the upstream provider.
  const raw = snippet.replace(/\s+/g, ' ').trim().slice(0, 200);
  return raw ? `(raw response: ${raw})` : '';
}
// Backwards-compat alias for any future callers
const extractUpstreamMessage = extractUpstreamDetail;

// Translate a thrown error into a user-facing { error, status } pair so
// each endpoint's catch block can speak the same language. The `action`
// arg is the verb that failed ("mark the sample", "generate the lesson
// plan", etc.) — used in the user-visible message. The `context` arg is
// "text" (default — text-only endpoints like marking/cefr/lesson-plan/
// worksheet/slideshow) or "image" (the OCR endpoint, where the upstream
// is Google Vision rather than Anthropic).
//
// Always tries to surface the upstream provider's message first — that's
// almost always more specific than anything we'd write ourselves.
export function userFacingClaudeError(err, action = 'complete the request', context = 'text') {
  const ts = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15); // ref code for support
  // Log full server-side context so issues are debuggable from CF logs even
  // when the user-facing message is intentionally trimmed. Visible in
  // `wrangler pages tail` and Cloudflare dashboard's runtime logs.
  if (err instanceof ClaudeError) {
    console.error(`[claude_error] action="${action}" context=${context} ref=${ts} code=${err.code} status=${err.status} body=${(err.bodySnippet || '').slice(0, 400)}`);
  } else {
    console.error(`[claude_error] action="${action}" context=${context} ref=${ts} non-ClaudeError name=${err && err.name} message=${err && err.message}`);
  }
  if (err instanceof ClaudeError) {
    const upstream = extractUpstreamDetail(err.bodySnippet);
    const upstreamSuffix = upstream ? ` Upstream said: "${upstream.slice(0, 250)}${upstream.length > 250 ? '…' : ''}"` : '';
    // Detect content-classifier 403s. Anthropic returns 403 with bodies
    // like "forbidden: Request not allowed" / "content_filter" / "blocked"
    // when its safety classifier refuses content. Branches by context so
    // text-only endpoints don't show image-flavored messages (and don't
    // wrongly blame student names — names alone never trip the filter).
    const upstreamLower = (upstream || '').toLowerCase();
    const looksContentBlocked = err.status === 403 && (
      upstreamLower.includes('not allowed') ||
      upstreamLower.includes('forbidden') ||
      upstreamLower.includes('content') && upstreamLower.includes('block') ||
      upstreamLower.includes('safety') ||
      upstreamLower.includes('content_filter') ||
      upstreamLower.includes('refused')
    );
    switch (err.code) {
      case 'auth':
        if (looksContentBlocked && context === 'image') {
          // OCR path — Google Vision returned 403. Almost always an auth/quota/
          // billing issue (DOCUMENT_TEXT_DETECTION doesn't content-filter the
          // way Anthropic does). Don't claim "child's face" — that's
          // misleading and incorrectly blames the user's photo content.
          return {
            error: `The OCR service couldn't process this image right now. This is on us, not your photo.

What to try:
• Type or paste the writing into the text box below — that always works.
• Or wait a minute and re-attach.

(Server ref ${ts})`,
            status: 503,
            content_blocked: true
          };
        }
        if (looksContentBlocked) {
          // Text-only endpoint (marking / cefr / lesson-plan / worksheet /
          // slideshow). Anthropic refused the text payload — explicit
          // violence, self-harm, sexual content, etc. NAMES AND SCHOOL
          // CONTEXT ARE FINE — the classifier doesn't refuse on those.
          return {
            error: `Our AI couldn't process this specific writing — the safety classifier refused it. This typically happens with explicit violence, self-harm, or sexual content in the text.

Names and school details are fine — they're not what trips the filter, and nothing is stored or logged either way.

What to try:
• Edit the sample to soften any explicit phrasing and resubmit.
• If the writing is benign, try once more — the classifier is occasionally over-cautious.
• Email hello@slatework.tools if this keeps happening.

(Server ref ${ts})`,
            status: 422,  // Unprocessable Entity — the content was rejected
            content_blocked: true
          };
        }
        return {
          error: err.status === 0
            ? `Slatework's AI key isn't configured on the server. This is on us, not you — please email hello@slatework.tools and mention ref ${ts}.`
            : err.status === 401
              ? `Our AI provider rejected the API key (HTTP 401). This is on us — please email hello@slatework.tools and mention ref ${ts}.${upstreamSuffix}`
              : `Our AI provider denied permission for this request (HTTP ${err.status}).${upstreamSuffix} If this keeps happening, email hello@slatework.tools (ref ${ts}).`,
          status: 503
        };
      case 'rate_limit':
        return { error: `Hit a short-term rate limit with our AI provider. Try again in 1-2 minutes.${upstreamSuffix} (ref ${ts})`, status: 429 };
      case 'overloaded':
        return { error: `Our AI provider is temporarily overloaded.${upstreamSuffix} Try again in a minute. (ref ${ts})`, status: 503 };
      case 'invalid_request':
        return {
          error: upstream
            ? `Could not ${action}: ${upstream.slice(0, 200)}${upstream.length > 200 ? '…' : ''} (ref ${ts})`
            : `Could not ${action} — the input was rejected. Try shorter text or a smaller / clearer image. (ref ${ts})`,
          status: 400
        };
      case 'timeout':
        return { error: `The model took too long to respond and the request timed out. Try again — sometimes shorter input or a clearer photo helps. (ref ${ts})`, status: 504 };
      case 'network':
        return { error: `Network error reaching our AI provider.${err.bodySnippet ? ' (' + err.bodySnippet.slice(0, 120) + ')' : ''} Try again in a moment. (ref ${ts})`, status: 502 };
      case 'server_error':
        return { error: `Our AI provider returned an error (HTTP ${err.status}).${upstreamSuffix} Try again in a few minutes. (ref ${ts})`, status: 502 };
      default:
        return { error: `Could not ${action} — unexpected error from our AI provider (HTTP ${err.status}).${upstreamSuffix} (ref ${ts})`, status: 502 };
    }
  }
  // Non-ClaudeError catch — likely a bug in our own code.
  return { error: `Could not ${action} — unexpected internal error. Please email hello@slatework.tools (ref ${ts}).`, status: 500 };
}
