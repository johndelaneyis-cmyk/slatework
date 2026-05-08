// GET /api/pexels?q=<keyword>&per_page=<1..5>
// Server-side proxy to the Pexels search API. Keeps PEXELS_API_KEY off the
// client and applies a per-IP / global daily rate limit. Pexels' own free
// quota is 200/hr/IP — our cap is well below that.
//
// Response shape: { photos: [{ id, src, alt, photographer, photographer_url }] }
// On any failure (no key, rate-limited, network, upstream error) the endpoint
// returns 200 with photos: [] so a missing image never breaks the slideshow.

import { jsonResponse, ipHash, rateCheck, corsPreflight, methodNotAllowed } from "../_lib.js";

export const onRequestOptions = () => corsPreflight('GET');
export const onRequest = () => methodNotAllowed('GET');

const PER_IP_DAILY = 80;     // ~8 keywords * ~10 slideshow generations/day
const GLOBAL_DAILY = 4000;
const MAX_PER_PAGE = 5;
const MAX_KEYWORD_LEN = 80;

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim();
  let perPage = parseInt(url.searchParams.get('per_page') || '1', 10);
  if (!Number.isFinite(perPage) || perPage < 1) perPage = 1;
  if (perPage > MAX_PER_PAGE) perPage = MAX_PER_PAGE;

  if (!q) return jsonResponse({ error: 'Missing q parameter.' }, 400);
  if (q.length > MAX_KEYWORD_LEN) return jsonResponse({ error: 'Query too long.' }, 400);

  // Soft-fail when the secret isn't bound — the client renders text-only.
  if (!env.PEXELS_API_KEY) return jsonResponse({ photos: [], reason: 'pexels_unconfigured' }, 200);

  const fp = await ipHash(request);
  const rate = await rateCheck(env, fp, 'pexels', PER_IP_DAILY, GLOBAL_DAILY);
  if (!rate.ok) {
    const headers = rate.retryAfterSec ? { 'Retry-After': String(rate.retryAfterSec) } : {};
    // Soft-fail: still return an empty list so the slideshow renders.
    return jsonResponse({ photos: [], rate_limited: true }, 200, headers);
  }

  const apiUrl = 'https://api.pexels.com/v1/search?query=' + encodeURIComponent(q) +
    '&per_page=' + perPage +
    '&orientation=landscape&size=medium';
  let r;
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 8000);
    r = await fetch(apiUrl, {
      headers: { Authorization: env.PEXELS_API_KEY },
      signal: ctl.signal
    });
    clearTimeout(timer);
  } catch {
    return jsonResponse({ photos: [], upstream: 'network_error' }, 200);
  }
  if (!r.ok) {
    return jsonResponse({ photos: [], upstream_status: r.status }, 200);
  }
  const data = await r.json().catch(() => ({}));
  const photos = (data.photos || []).slice(0, perPage).map((p) => ({
    id: p.id,
    src: p.src && (p.src.medium || p.src.large || p.src.original),
    alt: p.alt || q,
    photographer: p.photographer || '',
    photographer_url: p.photographer_url || ''
  }));
  return jsonResponse({ photos }, 200, {
    // Edge cache: keywords repeat across users; safe to cache moderately.
    'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400'
  });
}
