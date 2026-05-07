// GET /api/fx — returns cached FX rates (USD-base) with daily refresh.
// Cache lives in KV namespace FX_CACHE with key "rates:v1".

import { jsonResponse, corsPreflight, methodNotAllowed } from "../_lib.js";

const REFRESH_HOURS = 24;
const SOURCE_URL = 'https://open.er-api.com/v6/latest/USD';

export const onRequestOptions = () => corsPreflight('GET');
export const onRequest = () => methodNotAllowed('GET');

export async function onRequestGet({ env }) {
  if (!env.FX_CACHE) {
    return jsonResponse({ error: 'FX_CACHE not configured' }, 503);
  }

  const cached = await env.FX_CACHE.get('rates:v1', { type: 'json' });
  const now = Date.now();
  const ageHours = cached ? (now - cached.fetchedAt) / 3600000 : Infinity;

  if (cached && ageHours < REFRESH_HOURS) {
    return jsonResponse({ rates: cached.rates, asOf: cached.asOf, source: 'kv' }, 200);
  }

  try {
    const r = await fetch(SOURCE_URL, { cf: { cacheTtl: 600 } });
    if (!r.ok) throw new Error('upstream ' + r.status);
    const data = await r.json();
    if (!data.rates || !data.rates.GBP) {
      // Log full snippet so a future shape-change is debuggable from CF
      // logs instead of silently surfacing as "FX upstream unavailable".
      console.error('[fx_malformed]', JSON.stringify(data).slice(0, 500));
      throw new Error('malformed upstream response');
    }
    const payload = {
      rates: {
        USD: 1.0,
        GBP: data.rates.GBP,
        EUR: data.rates.EUR,
        CAD: data.rates.CAD,
        AUD: data.rates.AUD,
        NZD: data.rates.NZD,
        HKD: data.rates.HKD
      },
      asOf: data.time_last_update_utc || new Date().toISOString(),
      fetchedAt: now
    };
    await env.FX_CACHE.put('rates:v1', JSON.stringify(payload), { expirationTtl: 86400 * 2 });
    return jsonResponse({ rates: payload.rates, asOf: payload.asOf, source: 'upstream' }, 200);
  } catch (e) {
    if (cached) {
      return jsonResponse({ rates: cached.rates, asOf: cached.asOf, source: 'stale' }, 200);
    }
    return jsonResponse({ error: 'FX upstream unavailable and no cache: ' + e.message }, 503);
  }
}
