# Section B — Backend / Security / Code Quality (2026-05-09)

**Code quality:** 9.4/10
**Security:** 9.5/10
**Combined:** 9.45/10  (vs 9.6 / 9.7 in 2026-05-08)

Slight regression from 2026-05-08 because the new slideshow surface added a real-but-low-severity client-side connect-src CSP gap (Pexels host not in `connect-src`, only `img-src`), which silently breaks `.pptx` export of Pexels photos. Backend code quality on the new workers themselves is excellent — discipline matches the existing AI workers (rate limiting, prompt caching via callClaude, encodeURIComponent on Pexels query, soft-fail Pexels, validateDeck + normalizeDeck salvage, fallbackDeck never blocks the user). One missing-CSP-host is the only exploit-adjacent finding; everything else is theoretical or polish.

## Sub-scores

| Sub-dim | Score | Notes |
|---|---|---|
| Slideshow worker | 9.5 | normalizeDeck salvage + validateDeck + fallbackDeck + sane mode/level/audience whitelisting; max_tokens=2500 reasonable for 8-slide deck; image_keywords double-validated (per-key 40-char cap, ≤5 per slide). |
| Pexels proxy | 9.5 | encodeURIComponent on `q`; per_page clamped 1-5; soft-fail on every error path; edge cache 1h fits Pexels free tier. Daily caps 80/IP, 4000 global comfortably below Pexels' 200/hr/IP. |
| CSP strictness | 8.5 | `script-src` and `style-src` strict (no `unsafe-inline`/`eval`). `img-src` adds `images.pexels.com`. **Gap:** `connect-src` does NOT include `https://images.pexels.com` → `imgUrlToDataUrl()` fetch in slideshow-export.js:128 blocked, breaking .pptx image embed for teen/adult audiences. |
| SRI / supply chain | 10 | All four CDN scripts pinned with `sha384` integrity. Verified live: PptxGenJS 4.0.1 hash `qb0Xhi7LLYpvW1HCK6oMrmDLSY9sy7vwm6ZlV6KjtrlL9yg30+YN4neTwnmX+Kp8` matches; mammoth 1.7.2 hash `0H61yoxfMKjbSjFlpDEsx93BrLviZfSpurY4HWlCB4/moYeBGlCUqx2OBP8PqXog` matches. `crossOrigin='anonymous'` set on both. pdf.js loaded as ESM `import()` — SRI not enforceable on dynamic ESM imports (browser-spec limitation), so pinned-version-only. |
| Rate limiting | 9 | Day-bucketed SHA-256 IP hash truncated to 64 bits (privacy-preserving, collision-safe at 10k DAU). Per-tool caps mostly right-sized. **Gap:** no cross-tool aggregate cap — at full saturation a single IP could trigger ~305 LLM/OCR calls/day across 8 endpoints. Very theoretical. |
| Anthropic API discipline | 10 | `callClaude` has fallback chain (Sonnet 4.6 → 4.5 → dated 4.5 → Haiku 4.5), AbortController with 55s timeout, prompt caching via `cache_control: ephemeral` on system prompts >1024 chars (slideshow's ~3.7 KB prompt absolutely benefits), structured `ClaudeError` class, upstream-message extraction with multiple fallback regex layers. |
| Cost ceilings | 9 | Slideshow 30/IP × 2000 global × ~$0.03/call = ~$60/day theoretical max. CORS `*` allows any origin to call but per-IP cap holds. No cross-tool aggregate cap (mentioned in audit prompt as "still in `_lib.js`?" — never existed; per-tool only). |
| Privacy posture | 10 | Day-salted IP hashes. Profile data localStorage-only — student `nickname`/`notes`/tutor name never serialized into API payloads (verified slideshow-render.js:294-302 sends only target/source/level/mode/exam/audience_profile). Newsletter endpoint hashes emails before KV (SHA-256 hex, never plaintext). `_diag-models` token-gated with 404-disguise. |
| Logging hygiene | 9.5 | `console.error` calls in `_lib.js`, `slideshow.js`, `fx.js` log model name, error code/status, body snippet (≤400 chars, ≤500 in fx_malformed). No bodies, IPs, or secrets logged. The `[slideshow] JSON.parse failed` log includes `rawHead=...slice(0,200)` of model output — slide content, no PII risk since input is teacher-supplied lesson plan markdown. |

## Findings (severity-classified, exploit/cost-blowup ranked first)

### Critical
*None.*

### Important
- **CSP `connect-src` missing `images.pexels.com`** — `_headers:7`. The `.pptx` export at `slideshow-export.js:128` does `fetch(url.href, { credentials: 'omit' })` where `url.href` for teen/adult audiences is a Pexels image URL (e.g. `https://images.pexels.com/photos/.../*.jpeg`). The browser CSP `connect-src` directive does **not** include `images.pexels.com` (only `img-src` does), so the fetch is blocked. The `try/catch` in slideshow-export.js silently swallows it (`return null`), so `.pptx` exports for teen/adult ship without their photo even though the on-screen preview shows one. **Fix:** add `https://images.pexels.com` to `connect-src` in `_headers:7`. One-character change, zero risk.

- **CORS `Access-Control-Allow-Origin: *` on every API** — `_lib.js:10, 20`. Combined with public LLM endpoints, any third-party site can iframe + call `/api/slideshow` etc. without origin auth. Per-IP rate-limits cap the blast radius (30 calls × $0.03 ≈ $0.90 per attacker IP), but a botnet could plausibly hit 2000/day global cap costing ~$60/day. Pre-existing posture, not a regression. **Fix (low effort, optional):** restrict origin to `https://slatework.tools` / `https://*.pages.dev` for non-OPTIONS responses; keep `*` only for OPTIONS preflight if needed for embed widgets. Acceptable to defer if the embed-anywhere model is intentional.

### Nice-to-have
- **Add `require-trusted-types-for 'script'` (Report-Only first)** — `_headers:7`. Carryover from 2026-05-08 audit, still uncompleted. The slideshow-render.js layer does multiple `innerHTML = ...` writes (lines 76, 145, 159, 292, 308) — all values pass through `escHtml()` first, so enforcement should pass cleanly. Authorly already shipped this (per memory: "Strict CSP REAL + Trusted Types live"). Slatework should follow.

- **Slideshow `_debug` field leaks raw model output** — `slideshow.js:312, 326-333`. On fallback, response includes `_debug.raw_head: (raw||'').slice(0,300)` and `_debug.first_title: ... .slice(0,80)`. Useful for postmortem but exposes the model's malformed JSON to any client. No PII risk (model only sees the lesson plan markdown which the user submitted), but the field name "_debug" implies it shouldn't ship to production. **Fix (5 min):** gate behind `env.DEBUG === '1'` or remove from response and rely on server-side `console.error` already in place.

- **`callClaudeOnce` body buffering trusts upstream `Content-Length`** — `_lib.js:225`. `r.json()` with no max-size guard; if Anthropic ever returned a huge response (they wouldn't, but…), the worker reads the whole thing. Workers' subrequest limit caps this at 100 MB, so theoretical only. Skip unless paranoid.

- **`extractUpstreamDetail` regex on truncated 800-char `bodySnippet`** — `_lib.js:275-311`. If the upstream JSON is >800 chars and the `error.message` field is past byte 800, regex won't find it, falling through to "raw response: …" path. Cosmetic — the user just gets a truncated raw blob instead of the parsed message. Bumping `bodySnippet` to 2000 chars in the constructor (`_lib.js:215`) costs nothing.

- **No upper bound on `body.json()` size in any worker** — every endpoint does `await request.json()` first thing. Workers cap requests at 100 MB by default; OCR's 5 MB base64 cap (`ocr.js:17`) is the only explicit limit. Slideshow has `MAX_PLAN_LEN = 12000` checked AFTER parsing — adversary could ship a 50 MB body and waste cycles. Move the length check before `request.json()` using `request.headers.get('content-length')`, or set Worker bindings to lower the cap. Defensive, low priority.

- **`_diag-models.js` does not rate-limit** — `_diag-models.js:16-58`. Token-gated, but if the token leaks, an attacker can hammer Anthropic's `/v1/models` from our key. Add a per-IP rate limit (5/min) to make it not catastrophic. Token rotation is the real defense; this is belt-and-braces.

- **`fallback_used: true` and `_debug` collide on the same response shape** — `slideshow.js:155, 312, 326`. Client at `slideshow-render.js:312` uses `Slideshow.render(host, response, ...)` regardless. Confirmed render survives extra fields. Cosmetic / forward-compat.

## Top 3 ship-now (effort × impact)

1. **Add `https://images.pexels.com` to `connect-src` in `_headers:7`** — 30 seconds, fixes silent broken behavior in the new feature's primary export path. Highest ROI on the page.

2. **Add `require-trusted-types-for 'script'` in `Content-Security-Policy-Report-Only` mode in `_headers:7`** — 5 min to add the header, watch CF logs for a day, then promote to enforce. Codebase already escapes consistently (`escHtml` in slideshow-render.js, `escapeHtml` elsewhere); should pass clean. Closes the only remaining baseline-2026-eligible gap.

3. **Strip `_debug` field from slideshow responses on production / gate behind DEBUG env** — 2 min in `slideshow.js:312, 326`. Production responses shouldn't ship raw-model-output snippets; they're already in `console.error`. Cleaner contract for any future API consumers.

## What Slatework does well
- **Real strict CSP** — no `unsafe-inline`, no `unsafe-eval` on either `script-src` or `style-src`. Most launch-stage sites ship at least one. Stayed strict through the slideshow refactor.
- **Pinned-and-verified SRI** on every cross-origin script. Both live hashes match. `crossOrigin='anonymous'` set so SRI actually applies.
- **Day-salted IP hashes** truncated to 64 bits — privacy-preserving while still effective for daily rate-limit fingerprints. Can't be linked across days.
- **OCR architecturally decoupled from the LLM** so Anthropic's vision content classifier never sees student-writing photos — sidesteps the whole class of 403 content-blocked failures that happen with vision models on classroom material.
- **Soft-fail discipline on Pexels** — every error path returns `photos: []` with status 200 so a missing image never breaks the slideshow render. UX over fail-fast for non-critical features.
- **Fallback-deck + normalizeDeck + validateDeck** layered defense for slideshow JSON shape — Sonnet output gets repaired, salvaged, validated, and only then returned; otherwise a static deck with the right mode/audience metadata ensures the user never sees an empty page. Production-grade resilience pattern.
- **`_diag-models.js` token-gated with 404-disguise** — neither leaks endpoint existence nor model list. Closes a class of recon attacks.
- **Profile system is genuinely localStorage-only.** Verified by tracing `slideshow-render.js:294-302`: tutor name and student nickname/notes never reach the API payload. Tutor name only goes to the `.pptx` author field on the client.
- **Anthropic discipline:** prompt caching auto-applied for system prompts >1024 chars (slideshow's ~3.7 KB benefits massively at launch traffic), AbortController + 55s timeout, structured `ClaudeError` taxonomy, multi-step model fallback chain, upstream-message extraction with 5 fallback regex layers.
- **No `eval`, no `Function()`, no dynamic code construction** anywhere in the worker code. CSP and code discipline aligned.
