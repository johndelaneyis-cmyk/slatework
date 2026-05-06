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

export async function ipHash(request) {
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
  // Day-bucketed hash so the fingerprint rotates daily and we don't hold a
  // long-term identifier of the user.
  const day = new Date().toISOString().slice(0, 10);
  const enc = new TextEncoder().encode(ip + ':' + day);
  const hash = await crypto.subtle.digest('SHA-256', enc);
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

export async function callClaude(env, { model, system, user, max_tokens = 1500 }) {
  const body = {
    model,
    max_tokens,
    system,
    messages: [{ role: 'user', content: user }]
  };
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!r.ok) {
    const errText = await r.text();
    throw new Error('Anthropic API error ' + r.status + ': ' + errText.slice(0, 500));
  }
  const data = await r.json();
  return (data.content || []).map(c => c.text || '').join('');
}
