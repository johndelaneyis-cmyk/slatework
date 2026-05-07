// GET /api/_diag-models — diagnostic endpoint that lists which Claude
// models the configured ANTHROPIC_API_KEY actually has access to.
// Useful to debug 403 errors. Cache headers prevent caching so refreshes
// always hit Anthropic. Returns 503 if the key isn't set.
//
// GATED: requires ?token=<DIAG_TOKEN env var>. Returns 404 (not 401) on
// bad/missing token to avoid signaling that the endpoint exists. If
// DIAG_TOKEN isn't configured at all, the endpoint is fully disabled
// (returns 404). Closes Section E #9 from 2026-05-08 audit.

import { jsonResponse, corsPreflight, methodNotAllowed } from "../_lib.js";

export const onRequestOptions = () => corsPreflight('GET');
export const onRequest = () => methodNotAllowed('GET');

export async function onRequestGet({ request, env }) {
  // Token gate. Returns plain 404 to look like the endpoint doesn't exist.
  const url = new URL(request.url);
  const provided = url.searchParams.get('token') || '';
  if (!env.DIAG_TOKEN || provided !== env.DIAG_TOKEN) {
    return new Response('Not Found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
    });
  }
  if (!env.ANTHROPIC_API_KEY) {
    return jsonResponse({ error: 'ANTHROPIC_API_KEY not set on the server.' }, 503);
  }
  try {
    const r = await fetch('https://api.anthropic.com/v1/models?limit=1000', {
      method: 'GET',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      }
    });
    const text = await r.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = null; }
    if (!r.ok) {
      return jsonResponse({
        error: `Anthropic returned HTTP ${r.status}`,
        upstream_status: r.status,
        upstream_body: text.slice(0, 800)
      }, 502);
    }
    const data = parsed && parsed.data ? parsed.data : [];
    const ids = data.map(m => ({ id: m.id, display_name: m.display_name, type: m.type, created_at: m.created_at }));
    return jsonResponse({
      ok: true,
      configured_default: 'claude-sonnet-4-6',
      configured_fallback_chain: ['claude-sonnet-4-5', 'claude-sonnet-4-5-20250929', 'claude-haiku-4-5'],
      available_count: ids.length,
      models: ids
    });
  } catch (e) {
    return jsonResponse({ error: 'Diagnostic call failed: ' + (e.message || String(e)) }, 502);
  }
}
