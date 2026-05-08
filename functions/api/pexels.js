// POST /api/pexels
// Server-side proxy for Pexels API. Accepts a search keyword and audience profile,
// returns a curated list of photo URLs with attribution, without exposing the API key.

import { jsonResponse, ipHash, rateCheck, corsPreflight, methodNotAllowed } from "../_lib.js";

export const onRequestOptions = () => corsPreflight('POST');
export const onRequest = () => methodNotAllowed('POST');

const PER_IP_DAILY = 100;    // 100 photo requests per IP per day
const GLOBAL_DAILY = 5000;   // 5000 total requests across all users per day
const MAX_KEYWORD_LEN = 100;
const PEXELS_BASE_URL = 'https://api.pexels.com/v1/search';

// Cache photos by keyword (in-memory, expires every 15 min) to avoid
// redundant Pexels API calls during a single lesson-generation session.
const photoCache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000;

// Response shape returned to client: { photos[{src, photographer, attribution_url}], error? }
// For young_learner: use local SVG illustrations instead (no Pexels call needed).

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); }
  catch { return jsonResponse({ error: 'Invalid request format.' }, 400); }

  const keyword = String(body.keyword || '').trim().toLowerCase();
  const audience = String(body.audience || 'adult').trim();

  if (!keyword || keyword.length < 2) return jsonResponse({ error: 'Keyword too short (2+ chars).' }, 400);
  if (keyword.length > MAX_KEYWORD_LEN) return jsonResponse({ error: 'Keyword too long (100 chars max).' }, 400);

  const validAudiences = ['young_learner', 'teen', 'adult', 'exam_prep'];
  if (!validAudiences.includes(audience)) {
    return jsonResponse({ error: 'Audience must be one of: young_learner, teen, adult, exam_prep.' }, 400);
  }

  // young_learner uses local SVG bundle, not Pexels
  if (audience === 'young_learner') {
    return jsonResponse({ error: 'Use the local SVG bundle for young_learner audience (no Pexels needed).' }, 400);
  }

  if (!env.PEXELS_API_KEY) {
    return jsonResponse({ error: 'Service is being configured. Try again in a few minutes.' }, 503);
  }

  // Rate limiting
  const fp = await ipHash(request);
  const rate = await rateCheck(env, fp, 'pexels', PER_IP_DAILY, GLOBAL_DAILY);
  if (!rate.ok) {
    const headers = rate.retryAfterSec ? { 'Retry-After': String(rate.retryAfterSec) } : {};
    return jsonResponse({ error: rate.reason }, rate.status || 429, headers);
  }

  try {
    // Check in-memory cache first
    const cacheKey = `${keyword}:${audience}`;
    const cached = photoCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return jsonResponse({ photos: cached.photos }, 200);
    }

    // Audience-specific keywords: dial in the search to match the context
    const query = audience === 'exam_prep'
      ? `${keyword} study test` 
      : audience === 'teen'
      ? `${keyword} school classroom`
      : `${keyword}`; // adult: literal keyword

    // Call Pexels API with Authorization header
    const pexelsRes = await fetch(`${PEXELS_BASE_URL}?query=${encodeURIComponent(query)}&per_page=10&locale=en-US`, {
      headers: {
        'Authorization': env.PEXELS_API_KEY
      }
    });

    if (!pexelsRes.ok) {
      const msg = pexelsRes.status === 401 ? 'API key invalid' : `Pexels API error (${pexelsRes.status})`;
      console.error('[pexels]', msg);
      return jsonResponse({ error: 'Could not fetch photos. Try again soon.' }, 503);
    }

    const data = await pexelsRes.json();
    const photos = (data.photos || []).map(p => ({
      src: p.src.medium,
      photographer: p.photographer || 'Unknown',
      attribution_url: p.url
    }));

    // Cache the result
    photoCache.set(cacheKey, { photos, timestamp: Date.now() });

    return jsonResponse({ photos }, 200);
  } catch (err) {
    console.error('[pexels] fetch error:', err.message);
    return jsonResponse({ error: 'Could not fetch photos. Try again soon.' }, 503);
  }
}
