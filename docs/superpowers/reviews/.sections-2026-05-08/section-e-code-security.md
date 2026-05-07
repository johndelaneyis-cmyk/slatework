# Section E — Code Quality & Security — Slatework

**Code quality score:** 8.8/10
**Security score:** 9.1/10
**Combined:** 8.95/10

Strong baseline. CSP is strictly enforced (no `unsafe-inline`, no `unsafe-eval`); secrets bound via Cloudflare env, never logged; rate limiting and global cost caps in place per tool; Anthropic integration has fallback chain, timeouts, structured error extraction; OCR decoupled from LLM (architectural win — avoids vision content-classifier 403s on student-writing photos). Per-page client JS is small, vanilla, and uses `escapeHtml` consistently before innerHTML interpolation.

What lifts this above 9.5+ blockers: small XSS surface in lesson-plan/marking/worksheet markdown renderer regex, no `_middleware.js` (Authorly has one — Slatework doesn't, leaving the leak/header-injection guard absent), one duplicated `top-level-const` collision risk between page modules, and a few exploitability-low but visible issues HN readers will flag.

## Sub-scores
| Sub-dim | Score | Note |
| Client JS structure | 8 | Vanilla, well-commented, IIFE-scoped. Each page redeclares `const $ = ...`/`const SW = ...` at module top — collision-safe only because each page loads exactly one of these. No shared "page-base" helper for `escapeHtml`/`renderMarkdown` (duplicated in 5+ files). |
| XSS surface | 8 | All AI output → `escapeHtml` first, then markdown regex. **Theoretical** issue: `inlineMd` in `page-marking.js:172` regexes `**…**` and `*…*` after escape — patterns are `.+?` (non-greedy) and run on already-escaped text, so the captured group is entity-safe. No exploit. Confidence: high. |
| Error handling | 9 | Server returns user-friendly messages with ref codes; client shows messages, falls back to "Network error" on throw, supports content-blocked path with field reset + focus restore. Strong. |
| Server JS structure | 9 | One file per endpoint, ~50-100 lines each, identical scaffold (validate → rate-check → call → error-translate). `_lib.js` consolidates the seven shared concerns cleanly. |
| Secret handling | 10 | All secrets via `env.X`. Never logged in error responses. `_diag-models.js` deliberately doesn't surface the key in its 200 body (only model list). |
| Rate limiting | 9 | Per-IP daily + global daily, day-bucketed via SHA-256 hash truncated to 64 bits, KV-backed. **Note:** rate `put`s are not atomic with `get`s — race exists under concurrent submission, but the practical exploit (one IP doubling its daily quota) is bounded and not a cost-blowup vector. |
| Input validation | 9 | All AI endpoints validate length, level enum, mode enum, format enum. OCR validates MIME against allowlist + 5 MB cap. **Gap:** `feedback.js` accepts any string for `tool` field (sliced to 60 chars) — not security-relevant but allows arbitrary bucket creation in KV. |
| CSP strictness | 10 | `script-src 'self' https://static.cloudflareinsights.com https://cdnjs.cloudflare.com https://unpkg.com` — strict, no `unsafe-inline`, no `unsafe-eval`. `style-src 'self' https://fonts.googleapis.com` — also strict. Allowlisted CDN origins are for `mammoth` + `pdf.js` (lazy-loaded, see findings). |
| Logging privacy | 10 | IP hashed before any logging; no user content in `console.error`; ref codes are a 15-char timestamp shortcut without identity. Clean. |
| Anthropic API discipline | 9 | Model fallback chain, 55s default timeout, AbortController-backed, structured error codes (auth/rate_limit/overloaded/invalid_request/timeout/network/server_error/unknown), upstream message extraction with 4-tier fallback. **Missing:** prompt caching headers (`cache_control: ephemeral`) on the long system prompts (lesson-plan, worksheet, marking) — direct cost-savings opportunity for repeat queries. |

## Findings

### Critical (security: leak / abuse / cost-blowup risk)

None at this severity. The prior-launch leak-blocking middleware analog from Authorly is **absent** here (see Important #1) but Slatework's surface is meaningfully smaller (no cross-tool $5k cap implementation needed because there are no cross-tool tracking concerns; no BEACON to strip because no analytics beacon endpoint exists), so the absence is partially-justified.

### Important

1. **No `functions/_middleware.js` — Authorly parity gap** — `C:/Users/darre/slatework/functions/` (file does not exist) — Authorly's `_middleware.js` performs leak blocking and security-header injection at the worker level. Slatework relies entirely on `_headers` for response security headers. Two consequences: (a) `_headers` only applies to Pages-served HTML/CSS/JS, not Functions API responses — every `/api/*` JSON response is missing X-Frame-Options/X-Content-Type-Options/Referrer-Policy/etc; (b) no centralized scrubber for accidental secret echoes in error bodies. **Fix:** add `functions/_middleware.js` that calls `next()` then injects the same headers `_headers` sets, and runs a sanity scrub on JSON responses (regex `sk-ant-|AIza[0-9A-Za-z_-]{35}` → `[redacted]`). 5-min job, parity with Authorly's hardening.

2. **No Retry-After on rate-limit responses** — `functions/_lib.js:63-64` — `return { ok: false, status: 429, reason: 'Personal daily limit reached. Try tomorrow.' }`. Authorly emits `Retry-After: 86400` (or seconds-until-midnight). Slatework returns 429 with no header → polite clients can't backoff intelligently. **Fix:** in `rateCheck` return value include `retryAfterSec`, and in each endpoint's `if (!rate.ok)` path add `{ 'Retry-After': String(rate.retryAfterSec) }` to the jsonResponse extraHeaders. Trivial change, observable improvement.

3. **No prompt caching on long system prompts** — `functions/api/lesson-plan.js:9-46`, `functions/api/worksheet.js:9-37`, `functions/api/marking.js:15-54`, `functions/api/cefr-assess.js:12-23` — system prompts are ~600-1500 tokens and identical across requests. Anthropic supports `cache_control: { type: 'ephemeral' }` blocks that cut input-token cost by ~90% on cache hits with a 5-min TTL. Slatework's `_lib.js:151-156` builds the body with `system: <string>` — needs to switch to `system: [{ type: 'text', text: <prompt>, cache_control: { type: 'ephemeral' } }]`. Direct cost saving on launch traffic; the HN crowd will note its absence. **Fix:** in `callClaudeOnce` accept system as either string or array; if string and >1024 tokens, wrap with cache_control automatically.

4. **Race in `rateCheck` get-then-put** — `functions/_lib.js:56-69` — `Promise.all([get, get])` then `Promise.all([put count+1, put count+1])`. KV is eventually consistent; a single IP firing N parallel requests can read `count=0` N times then all write `count=1`, effectively bypassing the per-IP cap. Practical impact: bounded (IP can burst maybe 5x before KV catches up — a single laptop won't drive cost-blowup on Sonnet calls), but a determined attacker spinning concurrent requests for 30 seconds defeats the per-IP limit before it engages. **Fix:** acceptable for launch; for v0.2 consider Durable Objects for atomic counter, or move to `KV-list-then-derive-count` pattern (still racy but easier to detect via global cap which is the real backstop). Document in launch review as known limitation.

5. **Lazy-loaded CDN libraries with no SRI** — `src/lib/file-extract.js:15` (`mammoth.browser.min.js`), `src/lib/file-extract.js:26-27` (`pdf.min.mjs` + worker) — both injected without `integrity=` Subresource Integrity hashes. CSP `script-src` allowlists `cdnjs.cloudflare.com` but doesn't pin a specific build. If cdnjs is compromised (rare but happened to other CDNs), arbitrary code runs in your origin. **Fix:** add SRI hashes; check both files' `package-lock`-equivalent, run `openssl dgst -sha384 -binary file.min.js | openssl base64 -A` for each, set `s.integrity = 'sha384-...'` and `s.crossOrigin = 'anonymous'`. The .mjs dynamic-import path doesn't natively support SRI — keep that one as risk-accepted (or self-host pdf.js the way mammoth could be self-hosted).

6. **Markdown renderers diverge across pages — DRY violation + maintenance hazard** — `src/lib/page-marking.js:145-170`, `src/lib/page-lesson-plan.js:109-128`, `src/lib/page-worksheet.js:84-105`, `src/lib/page-cefr.js:147-156` — each page has its own subtly different `renderMarkdown` (marking supports `**bold**`/`*em*` inline + headers + ul + ol; lesson-plan supports headers + ul; worksheet supports headers + ol; cefr inlines ad-hoc). **Risk:** when one is patched (e.g. to handle `[link](url)` or to fix an XSS), others diverge silently. **Fix:** extract `src/lib/markdown.js` exposing `Slatework.renderMarkdown(md, { allow: { headers: 6, ul: true, ol: true, inline: ['bold', 'em'] }})`. ~40 LOC, eliminates 100+ LOC of duplication.

7. **Newsletter dedupe key uses `RATE_LIMITS` namespace with 1-year TTL** — `functions/api/newsletter.js:62` — KV key `news:<hash>` lives in `RATE_LIMITS` namespace alongside rate-counter keys. Mixing semantically-distinct data in one namespace makes rotation/audit harder. **Fix:** dedicate a `NEWSLETTER_DEDUPE` KV namespace, or prefix-shard intentionally and document. Cosmetic but the HN crowd reads `wrangler.toml`.

8. **Newsletter accepts emails when KV is unconfigured** — `functions/api/newsletter.js:29-34` — `if (env.RATE_LIMITS) { ... dedupe ... }`. In a misconfigured env (KV binding missing), dedupe silently no-ops and Buttondown receives every duplicate submission, possibly burning Buttondown rate-limits. **Fix:** if `!env.RATE_LIMITS` and `env.BUTTONDOWN_API_KEY` — return 503 "Service partially unavailable" rather than firing untraceable duplicates. Same on `feedback.js:28`.

9. **`_diag-models.js` is unauth'd and live** — `functions/api/_diag-models.js` — exposes the active Anthropic key's model access list to any visitor. Body comment says "Not linked anywhere; only exists for ad-hoc curl / browser visit." On HN-launch day someone will discover and curl it. Disclosure is low-severity (knowing the key has access to `claude-haiku-4-5` doesn't enable abuse), but it's needless attack-surface. **Fix:** gate with `env.DIAG_TOKEN` shared secret in query param: `?token=` — return 404 (not 401) when wrong/missing. Or delete the endpoint and run the diagnostic locally via `wrangler pages dev`.

### Nice-to-have

10. **Each `page-*.js` redeclares `const $ = (id) => document.getElementById(id)` and `const SW = window.Slatework`** — `src/lib/page-*.js` (every file) — works because each page loads exactly one page-script, but it's churn. Move to `src/lib/dom.js` exposing `Slatework.$(id)` once.

11. **`fx.js` swallows malformed upstream responses with no observability** — `functions/api/fx.js:29` — `if (!data.rates || !data.rates.GBP) throw new Error('malformed upstream response')` — error string is generic; no `console.error` with full upstream snippet. If the upstream API ever returns a 200 with shape change, you'll see "FX upstream unavailable" with no trail. **Fix:** `console.error('[fx_malformed]', JSON.stringify(data).slice(0, 500))` before the throw.

12. **`page-payments.js:42-46` builds `<strong>` with empty content** — `renderRow(m)` returns `<strong></strong>` at end of row. Likely a stub from when `m` had a value (column header dropped). Either delete the empty `<strong>` or remove the row template entirely if no fee column applies. Cosmetic but the HTML lints poorly.

13. **`page-rates.js:97 + 100` use innerHTML for the platform fee row** — `escapeHtml` is called on `p.name`/`p.notes` so safe-by-construction, but the row could be built with `textContent`/`createElement` for clarity. No exploit; readability only.

14. **No anti-bot honeypot on newsletter/feedback** — `functions/api/newsletter.js`, `functions/api/feedback.js` — rate limits + global caps are the only defense. Adding a `<input name="website" hidden>` honeypot field that the server rejects when populated is one HTML attribute + 3 lines of server code. Bot-stoppage is the lowest of low-hanging fruit.

15. **`page-marking.js:109-110` shadows outer `e` event arg with parsed-error `e`** — `form.addEventListener('submit', async (e) => { ... const e = await r.json()...`. ESLint would flag. Trivial: rename inner to `errBody` or `payload`.

16. **`page-lesson-plan.js:96` same shadowed `e`** — same pattern.

17. **`page-worksheet.js:81` `setTimeout(() => { $('worksheet').hidden = false; }, 500)` after `window.print()`** — the `setTimeout` fires regardless of whether print dialog is dismissed; under "Cancel," the worksheet shows immediately, under "Print," the answer-key may briefly remain visible alongside. Use `window.matchMedia('print').addEventListener('change', ...)` or `afterprint` event for deterministic restore.

18. **`callGoogleVision` — 5 MB cap on caller, but no separate cap inside `_lib.js`** — `functions/_lib.js:94-141` — relies on the OCR endpoint to validate; if another endpoint adopts `callGoogleVision` without that check, the function will happily forward 50 MB. Defensive: assert `base64.length < 7_000_000` inside the helper (Vision's actual limit is 10 MB encoded but base64 inflates).

19. **`extractUpstreamDetail` regex parser is brittle on nested escaped strings** — `functions/_lib.js:259-272` — works on Anthropic's known response shapes, but a body like `{"error":{"message":"foo \"bar\" baz"}}` would parse correctly only via JSON.parse path; the regex fallback uses `(?:[^"\\]|\\.)*` which handles `\\"` but not `"`. Cosmetic — fallback after JSON.parse already handles 99% of real cases.

20. **`callClaudeOnce` `data.content` mapped without bounds check** — `functions/_lib.js:194` — `(data.content || []).map(c => c.text || '').join('')`. If Anthropic returns 100 content blocks unexpectedly, all are concatenated. No real risk; max_tokens bounds output. Note for v0.2: switch to filter by `c.type === 'text'` to ignore future tool_use / thinking blocks gracefully.

## Ship-now top 3
1. **Add `functions/_middleware.js`** (Important #1) — match Authorly's leak-block + header-injection. ~40 LOC. Closes the API-response-headers gap and gives a centralized place to scrub accidental secret echoes. Single biggest delta to "feels production."
2. **Wire prompt caching on the four AI endpoint system prompts** (Important #3) — `cache_control: { type: 'ephemeral' }` on system block in `_lib.js:callClaudeOnce`. ~10 LOC change. Cuts input-token cost ~90% on launch-day repeated calls; HN-crowd-visible discipline.
3. **Add `Retry-After` to 429 responses** (Important #2) — small `_lib.js` change, propagated via existing `extraHeaders` channel in `jsonResponse`. ~6 LOC. Polite-client behavior + signals competence.

## What Slatework does well
- **CSP is genuinely strict.** No `unsafe-inline`, no `unsafe-eval` on either `script-src` or `style-src`. Most launch-stage projects ship with one or the other. Slatework didn't.
- **OCR-decoupled architecture.** Photo → Google Vision → text → user reviews → text-only to Anthropic. Solves the vision content-classifier 403 problem at the architecture level instead of papering over with retries. The decoupling story alone is worth a Show HN paragraph.
- **`escapeHtml` is called consistently before every innerHTML interpolation of API/user data.** Ten `page-*.js` files; zero unescaped paths.
- **IP fingerprint is daily-rotated SHA-256, truncated to 64 bits.** The comment in `_lib.js:41-44` shows the author thought through the privacy-vs-collision math. Few projects this size do.
- **Structured error taxonomy from Anthropic.** `auth | rate_limit | invalid_request | overloaded | timeout | server_error | network | unknown` — translated to user-facing messages with reference codes. The content-blocked 403 detection (`looksContentBlocked`) with explicit user workaround is the kind of thoughtful UX hardening that doesn't usually exist at v0.1.
- **`callClaude` model fallback chain is real, configurable, and only retries the failure mode (`auth+403`) that fallback can fix.** Doesn't blindly retry `400`s or `429`s.
- **Hashed-email newsletter dedupe (no plaintext storage).** Ahead of where most indie launches sit on data minimization.
- **All AI endpoints share an identical scaffold.** Reading one teaches you all four. Lowers maintenance cost dramatically.
- **Per-tool, per-IP, global daily caps with KV-backed counters.** Cost ceiling is real, not aspirational.
- **No `eval`, no `new Function`, no string-arg `setTimeout`.** Verified across the codebase.
