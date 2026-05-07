// Cloudflare Pages middleware: runs for every request before static file
// serving and Pages Functions. Three jobs:
//
//   1. Leak-block: return 404 for repo-metadata / planning artefact paths
//      that may exist in the deploy bucket but should never be publicly
//      readable. CF Pages' _redirects file does not support 404, so this
//      middleware is the supported path. Mirrors authorly/functions/_middleware.js.
//
//   2. Header injection on /api/* JSON responses: _headers only applies to
//      Pages-served HTML/CSS/JS, not Functions API responses, so we re-add
//      the same security headers that protect the static site so /api/*
//      JSON responses get parity (Section E Important #1 of 2026-05-08
//      audit).
//
//   3. Secret scrubbing: if any /api/* JSON response accidentally echoes
//      a recognisable Anthropic / Google API key shape, redact before
//      sending back to the client.

const BLOCKED = [
  /^\/CLAUDE\.md$/i,
  /^\/HANDOFF\.md$/i,
  /^\/README(\.md)?$/i,
  /^\/\.gitignore$/i,
  /^\/\.git(\/|$)/i,
  /^\/distribution(\/|$)/i,
  /^\/docs(\/|$)/i,
  /^\/\.claude(\/|$)/i,
  /^\/\.wrangler(\/|$)/i,
  /^\/\.env(\.|$)/i,
  /^\/wrangler\.toml$/i,
  /^\/package(-lock)?\.json$/i,
  /^\/manual-todo\.md$/i,
];

const API_SECURITY_HEADERS = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'X-Permitted-Cross-Domain-Policies': 'none',
  'X-Robots-Tag': 'noindex, nofollow',
};

// Compile once at module-load. Catches:
//   sk-ant-...   Anthropic API keys
//   AIza...      Google Cloud API keys (35 base64ish chars after AIza)
const SECRET_PATTERN = /\b(sk-ant-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{35})\b/g;

export const onRequest = async ({ request, next }) => {
  const url = new URL(request.url);

  // 1. Leak block — applies to anything not under /api/
  if (BLOCKED.some((re) => re.test(url.pathname))) {
    return new Response('Not Found', {
      status: 404,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  }

  // 2 + 3. Hand off to the rest of the pipeline (Functions or static).
  const response = await next();

  // Only post-process JSON responses from /api/*. Static asset responses
  // already inherit _headers; mutating them again would just churn cache
  // headers.
  if (!url.pathname.startsWith('/api/')) return response;

  const ct = response.headers.get('Content-Type') || '';
  if (!ct.includes('application/json')) {
    // Non-JSON API response (rare; e.g. plain text 405 Allow). Inject
    // security headers but skip the body scrub.
    const out = new Response(response.body, response);
    for (const [k, v] of Object.entries(API_SECURITY_HEADERS)) {
      out.headers.set(k, v);
    }
    return out;
  }

  // Buffer + scrub. Bodies are bounded (rate limiting + max_tokens) so
  // reading them in full is fine on Workers.
  let bodyText;
  try {
    bodyText = await response.text();
  } catch {
    // Defensive: body already consumed (shouldn't happen on a fresh
    // Response from next()), pass through with headers only.
    const out = new Response(response.body, response);
    for (const [k, v] of Object.entries(API_SECURITY_HEADERS)) {
      out.headers.set(k, v);
    }
    return out;
  }

  const scrubbed = bodyText.replace(SECRET_PATTERN, '[redacted]');

  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(API_SECURITY_HEADERS)) {
    headers.set(k, v);
  }
  // Content-Length needs to reflect any byte delta from the redaction.
  headers.delete('Content-Length');

  return new Response(scrubbed, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};
