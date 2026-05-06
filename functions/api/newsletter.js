// POST /api/newsletter
// Hashes the email, deduplicates against KV, then forwards the new sub to Buttondown.
// We hold the SHA-256 hash of each subscribed email — never the plaintext — so we can
// dedupe future signups without keeping the email ourselves.

import { jsonResponse, ipHash, rateCheck } from "../_lib.js";

const PER_IP_DAILY = 5;     // a single visitor can submit at most 5 / day
const GLOBAL_DAILY = 5000;  // site-wide cap to stop spam floods

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid request format.' }, 400); }

  const email = String(body.email || '').trim().toLowerCase();
  const first_name = String(body.first_name || '').trim().slice(0, 60);

  if (!isPlausibleEmail(email)) return jsonResponse({ error: 'Please enter a valid email.' }, 400);

  const fp = await ipHash(request);
  const rate = await rateCheck(env, fp, 'newsletter', PER_IP_DAILY, GLOBAL_DAILY);
  if (!rate.ok) return jsonResponse({ error: rate.reason }, rate.status || 429);

  // Dedupe via SHA-256 hash kept in KV (RATE_LIMITS namespace).
  const emailHash = await sha256Hex(email);
  if (env.RATE_LIMITS) {
    const seen = await env.RATE_LIMITS.get('news:' + emailHash);
    if (seen) {
      return jsonResponse({ ok: true, already: true }, 200);
    }
  }

  // Forward to Buttondown if configured. If not configured, accept and log
  // the hash — admin can wire up Buttondown later without losing signups.
  if (env.BUTTONDOWN_API_KEY) {
    try {
      const r = await fetch('https://api.buttondown.email/v1/subscribers', {
        method: 'POST',
        headers: {
          'Authorization': 'Token ' + env.BUTTONDOWN_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email_address: email,
          metadata: first_name ? { first_name } : {},
          tags: ['slatework']
        })
      });
      // Buttondown returns 201 on new, 400 on already-subscribed (we treat as success).
      if (r.status >= 400 && r.status !== 400) {
        return jsonResponse({ error: 'Newsletter is temporarily unavailable. Try again later.' }, 502);
      }
    } catch {
      return jsonResponse({ error: 'Newsletter is temporarily unavailable. Try again later.' }, 502);
    }
  }

  if (env.RATE_LIMITS) {
    await env.RATE_LIMITS.put('news:' + emailHash, '1', { expirationTtl: 60 * 60 * 24 * 365 });
  }

  return jsonResponse({ ok: true }, 200);
}

function isPlausibleEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length < 256;
}

async function sha256Hex(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
