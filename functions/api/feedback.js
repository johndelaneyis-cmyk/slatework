// POST /api/feedback
// Records a per-tool yes/no + optional note. Stored in KV namespace FEEDBACK
// (one key per submission). Read by the maintainer manually - no dashboard.

import { jsonResponse, ipHash, rateCheck, corsPreflight, methodNotAllowed } from "../_lib.js";

export const onRequestOptions = () => corsPreflight('POST');
export const onRequest = () => methodNotAllowed('POST');

const PER_IP_DAILY = 30;
const GLOBAL_DAILY = 10000;

// Tool field is whitelisted to prevent arbitrary KV bucket creation
// (Section E Important #19 of 2026-05-08 audit — was sliced-only before).
const VALID_TOOLS = new Set([
  'index', 'about', 'setup', 'tax', 'insurance', 'rates', 'payments',
  'contract', 'lesson_plan', 'cefr', 'worksheet', 'marking',
  'privacy', 'terms', '404'
]);

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid request.' }, 400); }

  const tool = String(body.tool || '').trim().slice(0, 60);
  const verdict = String(body.verdict || '').trim();
  const comment = String(body.comment || '').trim().slice(0, 500);
  const honeypot = String(body.website || body.url || '').trim();

  if (honeypot) return jsonResponse({ ok: true }, 200); // bot honeypot
  if (!tool) return jsonResponse({ error: 'Missing tool.' }, 400);
  if (!VALID_TOOLS.has(tool)) return jsonResponse({ error: 'Unknown tool.' }, 400);
  if (verdict !== 'up' && verdict !== 'down') return jsonResponse({ error: 'Verdict must be up or down.' }, 400);

  const fp = await ipHash(request);
  const rate = await rateCheck(env, fp, 'feedback', PER_IP_DAILY, GLOBAL_DAILY);
  if (!rate.ok) {
    const headers = rate.retryAfterSec ? { 'Retry-After': String(rate.retryAfterSec) } : {};
    return jsonResponse({ error: rate.reason }, rate.status || 429, headers);
  }

  if (env.FEEDBACK) {
    const id = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
    const key = `${tool}:${id}`;
    await env.FEEDBACK.put(key, JSON.stringify({ tool, verdict, comment, ts: new Date().toISOString() }), {
      expirationTtl: 60 * 60 * 24 * 365
    });
  }

  return jsonResponse({ ok: true }, 200);
}
