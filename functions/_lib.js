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

  if (ipCount >= perIpDaily) return { ok: false, status: 429, reason: 'Personal daily limit reached. Try tomorrow.' };
  if (globalCount >= globalDaily) return { ok: false, status: 429, reason: 'Site-wide daily limit reached. Try in a few hours.' };

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

// Single attempt. Used internally by callClaude. Throws ClaudeError on failure.
async function callClaudeOnce(env, { model, system, user, max_tokens = 1500, timeoutMs = 55000 }) {
  if (!env.ANTHROPIC_API_KEY) {
    throw new ClaudeError('auth', 0, '', 'ANTHROPIC_API_KEY not set');
  }
  const userContent = typeof user === 'string'
    ? [{ type: 'text', text: user }]
    : user;
  const body = {
    model,
    max_tokens,
    system,
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

// Fallback model to retry on permission/auth errors. If the primary model is
// gated (account tier, sunset, region), auto-retry with the more broadly
// accessible Haiku 4.5 so users still get a result. Configurable via env.
const FALLBACK_MODEL = 'claude-haiku-4-5';

export async function callClaude(env, opts) {
  const primary = opts.model;
  const fallback = env.ANTHROPIC_FALLBACK_MODEL || FALLBACK_MODEL;
  try {
    return await callClaudeOnce(env, opts);
  } catch (err) {
    // Auto-retry once with the fallback model on auth/permission errors —
    // covers the case where the key is fine but the primary model is gated.
    // Don't fall back on rate limits, timeouts, or invalid input — those are
    // not solved by changing models.
    if (err instanceof ClaudeError && err.code === 'auth' && err.status === 403 && primary !== fallback) {
      console.error(`[claude_fallback] primary=${primary} 403, retrying with ${fallback}`);
      try {
        return await callClaudeOnce(env, { ...opts, model: fallback });
      } catch (err2) {
        // If fallback also fails, surface the ORIGINAL error (more useful
        // diagnostically since it points at the primary model's gating).
        throw err;
      }
    }
    throw err;
  }
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
// plan", etc.) — used in the user-visible message.
//
// Always tries to surface the upstream provider's message first — that's
// almost always more specific than anything we'd write ourselves.
export function userFacingClaudeError(err, action = 'complete the request') {
  const ts = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15); // ref code for support
  // Log full server-side context so issues are debuggable from CF logs even
  // when the user-facing message is intentionally trimmed. Visible in
  // `wrangler pages tail` and Cloudflare dashboard's runtime logs.
  if (err instanceof ClaudeError) {
    console.error(`[claude_error] action="${action}" ref=${ts} code=${err.code} status=${err.status} body=${(err.bodySnippet || '').slice(0, 400)}`);
  } else {
    console.error(`[claude_error] action="${action}" ref=${ts} non-ClaudeError name=${err && err.name} message=${err && err.message}`);
  }
  if (err instanceof ClaudeError) {
    const upstream = extractUpstreamDetail(err.bodySnippet);
    const upstreamSuffix = upstream ? ` Upstream said: "${upstream.slice(0, 250)}${upstream.length > 250 ? '…' : ''}"` : '';
    switch (err.code) {
      case 'auth':
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
