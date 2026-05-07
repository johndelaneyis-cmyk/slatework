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

export async function callClaude(env, { model, system, user, max_tokens = 1500, timeoutMs = 55000 }) {
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
    const snippet = errText.slice(0, 400);
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

// Translate a thrown error into a user-facing { error, status } pair so
// each endpoint's catch block can speak the same language. The `action`
// arg is the verb that failed ("mark", "generate the lesson plan", etc.)
// — used in the user-visible message.
export function userFacingClaudeError(err, action = 'complete the request') {
  const ts = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15); // ref code for support
  if (err instanceof ClaudeError) {
    switch (err.code) {
      case 'auth':
        return { error: `Our AI provider rejected the request (auth). This is on us, not you — please email hello@slatework.tools and mention ref ${ts}.`, status: 503 };
      case 'rate_limit':
        return { error: `The site has hit a short-term rate limit with our AI provider. Try again in 1-2 minutes. (ref ${ts})`, status: 429 };
      case 'overloaded':
        return { error: `Our AI provider is temporarily overloaded. Try again in a minute. (ref ${ts})`, status: 503 };
      case 'invalid_request': {
        // Try to surface the upstream message — Anthropic often says exactly
        // what's wrong (e.g. image too large, content blocked, prompt too long).
        let detail = '';
        const m = /"message"\s*:\s*"([^"]+)"/.exec(err.bodySnippet);
        if (m) detail = m[1];
        return {
          error: detail
            ? `Could not ${action}: ${detail.slice(0, 160)}${detail.length > 160 ? '…' : ''} (ref ${ts})`
            : `Could not ${action} — the input was rejected by our AI provider. Try shorter text or a smaller / clearer image. (ref ${ts})`,
          status: 400
        };
      }
      case 'timeout':
        return { error: `The model took too long to respond and the request timed out. Try again — sometimes shorter input or a clearer photo helps. (ref ${ts})`, status: 504 };
      case 'network':
        return { error: `Network error reaching our AI provider. Try again in a moment. (ref ${ts})`, status: 502 };
      case 'server_error':
        return { error: `Our AI provider returned an error (${err.status}). Try again in a few minutes. (ref ${ts})`, status: 502 };
      default:
        return { error: `Could not ${action} — unexpected error from our AI provider (HTTP ${err.status}). (ref ${ts})`, status: 502 };
    }
  }
  // Non-ClaudeError catch — likely a bug in our own code.
  return { error: `Could not ${action} — unexpected internal error. Please email hello@slatework.tools (ref ${ts}).`, status: 500 };
}
