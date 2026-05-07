// GET /api/_diag-models — diagnostic endpoint that lists which Claude
// models the configured ANTHROPIC_API_KEY actually has access to.
// Useful to debug 403 errors. Cache headers prevent caching so refreshes
// always hit Anthropic. Returns 503 if the key isn't set.
//
// Not linked anywhere; only exists for ad-hoc curl / browser visit.

import { jsonResponse, corsPreflight, methodNotAllowed } from "../_lib.js";

export const onRequestOptions = () => corsPreflight('GET');
export const onRequest = () => methodNotAllowed('GET');

export async function onRequestGet({ env }) {
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
