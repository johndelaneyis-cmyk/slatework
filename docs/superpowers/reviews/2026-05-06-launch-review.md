# Slatework Launch Review (2026-05-06)

## Summary

The site is functionally close to launch and the security posture is genuinely strong — strict CSP, day-rotated IP hashes, no plaintext email storage, properly-escaped user output across all pages. The biggest blocker is the canonical/sitemap mismatch: every page's `<link rel="canonical">` and the `sitemap.xml` advertise `.html` URLs that 308-redirect to extensionless paths, which will burn crawl budget and split SEO signal. Most other findings are polish, copy, or one-line bugs (a hardcoded "her" pronoun in the contract, a duplicate-record feedback widget, a contradictory CEFR placement message); the rate calculator, contract builder, and FAQ are tight and ship-ready.

**Verdict: soft-launch-ready.** The defects in Critical can each be fixed in <30 minutes, and none of them break the surface for a tutor walking through the site today.

---

## Critical (fix before public launch)

1. **Sitemap + canonicals all point to `.html` URLs that redirect.** Cloudflare Pages auto-redirects `/foo.html` → `/foo` with a 308. `sitemap.xml` lists every page as `.html`. Every page's `<link rel="canonical">` is `https://slatework.tools/<page>.html`. Search engines will follow the redirect, index the extensionless URL, and the canonical signal ends up pointing back at a redirect — split equity, and a lighthouse SEO audit will flag it. **Fix:** rewrite `sitemap.xml` and every `<link rel="canonical">` and every `og:url` / `twitter:url` to drop the `.html`. Sitemap also lists `slatework.tools/` (production host) but the deploy URL is `slatework-802.pages.dev` — those are intentional but worth verifying once the domain is final.

2. **Hardcoded "her" pronoun in contract template.** `contract.html` line 184: *"...the same notice in the rare event a session must be rescheduled from her side."* Genders the tutor template. Trivial fix, but embarrassing if a male tutor prints it for a parent.

3. **Feedback widget posts duplicate records.** `feedback.js` line 57 sends the bare verdict immediately when the user clicks thumbs up/down, then `sendBtn` (line 61) sends *again* with the comment. KV ends up with two records per genuine feedback. Either skip the immediate send, or have the comment-send overwrite the prior record by reusing the same key.

4. **CEFR rule-based "No" defaults give false placements.** `cefr.html` line 190 has every Can-Do statement defaulting to `<input type="radio" ... value="no" checked />`. A user clicking "Place the student" without answering anything gets `level: A0, confidence: low` from the rule engine, which feels like the tool is broken at first touch. Fix: leave all radios unselected (or default to "Partial") and validate that at least one is answered before submitting.

5. **Privacy page falsely advertises a tracker that isn't installed.** `privacy.html` lines 41-42 list "Cloudflare Web Analytics" as collected data; `feedback.js` line 8 still has `const BEACON_TOKEN = "REPLACE_WITH_CF_BEACON_TOKEN";` and the `if` guard prevents the beacon from loading. Either install the beacon (correct copy) or remove the analytics bullet from privacy (correct posture).

---

## Important (fix this week)

6. **`_headers` cache rule for libs targets the wrong path.** `/lib/*` is listed but actual files live at `/src/lib/*`. Confirmed via the live probe: `Cache-Control: public, max-age=0, must-revalidate` on `/src/lib/file-extract.js`. Means the JS libs are re-fetched on every page nav. Change `/lib/*` to `/src/lib/*` in `_headers`.

7. **Inconsistent API param naming.** `cefr-assess` accepts `language`, `worksheet` and `marking` and `lesson-plan` accept `target_language`. Pick one. The internal client code already calls them correctly, but if anyone else integrates against the API the inconsistency will bite.

8. **Wrong-method handling on AI endpoints returns 404 with full HTML.** `GET /api/lesson-plan` returns `404 text/html` (the 404 page) instead of `405 Method Not Allowed`. Pages Functions only export `onRequestPost`, so the method dispatcher can't match — but a 404 here is misleading. Add `onRequestOptions` for CORS preflight (currently `OPTIONS /api/fx` returns 405 with no headers, blocking any cross-origin tool that calls `/api/fx`).

9. **Stale "Tutorful" reference.** `index.html` line 194 and `rates.html` meta description name "Tutorful" as a comparable platform. Tutorful shut down in 2024 and isn't in any country pack. Replace with Verbling or Cambly, which are the platforms actually loaded.

10. **Hardcoded "0 readers" footnote.** `index.html` line 239: *"// Joining 0 readers · be the first"*. After your first signup this becomes false advertising. Either pull the count from KV at build time, or make it an honest evergreen line ("// Slow, occasional notes — never spam").

11. **HK FPS link is dead.** `data/countries/hk.json` line 233: `https://fps.hkma.gov.hk` doesn't resolve. The actual URL is `https://www.hkma.gov.hk/eng/key-functions/financial-infrastructure/payment-and-settlement-systems/retail-payment-initiatives/fps/`. (Sampled 8 external links across packs; 1 dead, 1 bot-blocked-but-OK, 6 fine.)

12. **CEFR rule-based output can self-contradict.** `cefr-rules.js` line 40 emits `notes: "Confirmed up to ${highestYes}; ceiling around ${lowestNo}."` even when `lowestNo` is *below* `highestYes` (e.g., user said "yes" to B2 and "no" to A2 — confused/contradictory answer). The notes line then reads "Confirmed up to B2; ceiling around A2," which is gibberish to a tutor. Detect the contradictory case and emit a different note ("Mixed answers — re-ask the lower statements" or similar).

13. **`partial` answers are silently ignored in CEFR rules.** The radio offers Yes/Partial/No, but `cefrPlace()` only branches on `'yes'` and `'no'`. A "Partial" answer behaves identically to "No" for placement, but the user intent was different. Either map "Partial" to "yes-with-half-weight" or remove the option to avoid the discrepancy.

14. **PDF.js worker URL not in CSP `worker-src`.** `_headers` allows `worker-src 'self' blob:`, but pdf.js loads its worker from `https://cdnjs.cloudflare.com/...pdf.worker.min.mjs`. Modern pdf.js will use a blob worker so this likely works in practice, but it should be tested with a real PDF upload — if the CDN-hosted worker is fetched directly, the upload will silently fail under the strict CSP.

15. **`pickFee` returns wrong tier for unsorted curves.** `rates.html` line 240 assumes `fee_curve` is sorted ascending by `after_hours`. Country JSONs do follow that convention, but a future country pack with a typo (e.g. `[ {after_hours:200}, {after_hours:0} ]`) would silently produce the wrong fee. Sort by `after_hours` defensively, or test in `currency.js` and refuse to render.

16. **Tax page hardcodes `$1` regardless of currency.** `tax.html` lines 117 and 136 use `'No general allowance — file from $1 of net income.'` for any country with `trading_allowance_amount === 0`. Should localize: HK reads "file from HK$1," AU reads "file from A$1," etc. Or use "from your first paid lesson" wording (which line 137 already uses elsewhere).

17. **No FAQ schema on the homepage.** The index has a real FAQ block (`<details>` × 5), but the JSON-LD only declares `WebSite`. Adding `FAQPage` schema would surface those answers as rich results in Google.

18. **Hidden newsletter label uses `position:absolute;left:-9999px`.** `index.html` line 233. Works, but `class="sr-only"` (or the standard clip-path approach) is the modern pattern and signals intent. Keep the same effect, but it's a one-line cleanup.

19. **CSP allows `'unsafe-inline'` for scripts.** Required by the inline `<script>` blocks on every tool page. Replacing with nonces is a v0.2 task — note here only because the threat model is "model-output rendered into innerHTML," and `marking.html`/`cefr.html` `renderMarkdown` is the only attack surface; both call `escapeHtml` first which neutralizes it. Acceptable for launch.

20. **Daily IP-hash fingerprint can collide across IPs once volume scales.** `_lib.js` `ipHash` truncates SHA-256 to 8 bytes hex (16 chars, 64 bits). At 10k unique daily IPs the collision probability is ~3 × 10^-12 — fine. At 100M (you'll never hit this) it's ~0.5%. Not a launch issue, but the truncation justification deserves a comment.

---

## Nice-to-have (v0.2 backlog)

21. PDF.js page resources not released — `page.cleanup()` not called between pages in `file-extract.js extractPdf`. Memory leak on long PDFs.
22. `dataTransfer.files[0]` only — multi-file drops silently drop everything past the first.
23. Drop zone has no client-side cap on extracted text — a 30 MB PDF can fill the textarea even though the API rejects > 4000 chars, which means the user sees their text vanish on submit instead of getting a clear "shorten this" message.
24. `marking.html` `renderMarkdown` doesn't handle H4+ — `####`-prefixed lines render as `<p>#### ...</p>`.
25. Custom welcome paragraph in contract is single-line — newlines from the textarea collapse into one paragraph.
26. Contract date uses UTC `toISOString().slice(0,10)` — HK tutors at 11pm see tomorrow's date.
27. CEFR mapper tabs use `aria-selected` but lack `role="tab"`/`role="tabpanel"`/`aria-controls` and arrow-key nav. Screen reader UX is weaker than it should be.
28. Newsletter Buttondown error condition `r.status >= 400 && r.status !== 400` is correct but reads as a typo. Use `if (!r.ok && r.status !== 400) ...`.
29. Rate calculator `await SW.loadCountry(code)` has no try/catch — a JSON fetch failure leaves the form silently broken until the next input event.
30. `claude-sonnet-4-6` is set as the model in all four AI endpoints. The user is on Opus 4.7; if Sonnet 4.6 is retired, all AI tools 502. Pin to a current model and add an env override.
31. The hero JSON-LD doesn't list a `softwareVersion` — minor, but with "v0.1.0" in the visible copy, including it in schema is consistent.
32. `404.html` canonical points to `/404.html` (which itself 308-redirects). Recursive trap that crawlers eventually drop.
33. Subject default in contract is "Spanish" + "£40 per 60-minute lesson" — UK-skewed defaults that a US/HK tutor sees first.

---

## What's working well (don't change)

- **Security headers are excellent.** Strict CSP, HSTS preload, X-Frame-Options DENY, COOP/CORP same-origin, Permissions-Policy zeroing camera/mic/geo/payment, Referrer-Policy strict-origin-when-cross-origin. This is genuinely better than 95% of comparable indie sites.
- **`escapeHtml` is used consistently in every tool that renders untrusted output.** Marking, CEFR, contract, rates — every `innerHTML` interpolation goes through it.
- **Privacy posture is real, not theatre.** SHA-256 of email for newsletter dedup (no plaintext stored), day-rotated IP hash for rate-limiting (no long-term identifier), no API logging of bodies, no third-party trackers actually loaded.
- **The rate calculator UX is the strongest tool.** Live recalc on input, clear suggested-low/median/high triplet, platform-net comparison side-by-side, annual projection grounded in user-controlled hours-per-week. Country + language-pair + experience all interact cleanly. Don't redesign this.
- **FAQ on homepage is honest and well-written.** The "Why use this instead of ChatGPT?" answer is convincing without being defensive. Keep.
- **Country pack architecture (JSON files keyed by country code) is the right call** — adding a new country is genuinely a single PR, not a refactor.
- **Reduced-motion is honored everywhere.** The hero letter-by-letter chalk reveal, the pulse animation on the live dot, the dropzone hover — all suppressed under `prefers-reduced-motion`.
- **Touch targets meet 44px minimum on every interactive element** in the standard form/button selectors. Mobile UX should pass at 375px.

---

## Live probe results

### Pages

| Path | Status | Size | Title (start) |
|---|---:|---:|---|
| `/` | 200 | 19,609 b | Slatework — Free tools for independent language t |
| `/setup.html` | 200 (after 308) | 6,394 b | Start tutoring privately — Slatework |
| `/tax.html` | 200 (after 308) | 8,107 b | Tax & self-employment for tutors — Slatework |
| `/insurance.html` | 200 (after 308) | 7,262 b | Insurance & safeguarding for tutors — Slatework |
| `/rates.html` | 200 (after 308) | 11,367 b | Hourly rate calculator — Slatework |
| `/payments.html` | 200 (after 308) | 5,630 b | Payment methods for tutors — Slatework |
| `/contract.html` | 200 (after 308) | 13,434 b | Parent-tutor contract builder — Slatework |
| `/lesson-plan.html` | 200 (after 308) | 10,478 b | Lesson plan generator — Slatework |
| `/cefr.html` | 200 (after 308) | 12,540 b | CEFR proficiency mapper — Slatework |
| `/worksheet.html` | 200 (after 308) | 10,430 b | Worksheet + answer-key generator — Slatework |
| `/marking.html` | 200 (after 308) | 11,285 b | Marking accelerator — Slatework |
| `/about.html` | 200 (after 308) | 4,099 b | About — Slatework |
| `/privacy.html` | 200 (after 308) | 5,663 b | Privacy — Slatework |
| `/terms.html` | 200 (after 308) | 3,552 b | Terms — Slatework |
| `/404.html` | 200 (after 308) | 2,157 b | Not found — Slatework |
| `/nope` (deliberately bad) | **404** | 2,157 b | Not found — Slatework |

Every `.html` returns 308 → extensionless URL → 200. The 404 page renders correctly on a missing path with the right status code.

### APIs

| Endpoint | Method | Body | Status | Response |
|---|---|---|---:|---|
| `/api/fx` | GET | — | 200 | `{rates: {USD,GBP,EUR,CAD,AUD,NZD,HKD}, asOf, source: "kv"}` |
| `/api/fx` | OPTIONS | — | 405 | empty (no preflight handler) |
| `/api/newsletter` | POST | `{email:"review@..."}` | 200 | `{ok:true, already:true}` (already in KV from prior probe) |
| `/api/newsletter` | POST | `{}` | 400 | `{error:"Please enter a valid email."}` |
| `/api/newsletter` | POST | `{not json}` | 400 | `{error:"Invalid request format."}` |
| `/api/feedback` | POST | `{tool:"test",verdict:"up"}` | 200 | `{ok:true}` |
| `/api/feedback` | POST | `{}` | 400 | `{error:"Missing tool."}` |
| `/api/lesson-plan` | POST | valid full body | 503 (expected: no API key) | `{error:"Service is being configured. Try again in a few minutes."}` |
| `/api/lesson-plan` | POST | minimal | 400 | `{error:"Missing target language."}` |
| `/api/lesson-plan` | GET | — | **404** | full HTML 404 page (should be 405) |
| `/api/cefr-assess` | POST | valid full body | 503 | `{error:"Service is being configured..."}` |
| `/api/worksheet` | POST | valid full body | 503 | `{error:"Service is being configured..."}` |
| `/api/marking` | POST | valid full body | 503 | `{error:"Service is being configured..."}` |

The 503 path is correctly behind input validation — only valid bodies reach it. Validation error messages occasionally mislead: e.g., `cefr-assess` says "Paste at least 100 characters" when the field name is wrong, not the length.

### Assets

| Asset | Status | Content-Type | Size |
|---|---:|---|---:|
| `/sitemap.xml` | 200 | `application/xml` | 1,724 b |
| `/robots.txt` | 200 | `text/plain` | 103 b |
| `/favicon.svg` | 200 | `image/svg+xml` | 482 b |
| `/og.png` | 200 | `image/png` | 73,651 b |
| `/og.svg` | 200 | `image/svg+xml` | 4,861 b |
| `/src/lib/styles.css` | 200 | `text/css` | 30,155 b |
| `/src/lib/countries.js` | 200 | `application/javascript` | 3,691 b |
| `/src/lib/currency.js` | 200 | `application/javascript` | 1,641 b |
| `/src/lib/cefr-rules.js` | 200 | `application/javascript` | 3,062 b |
| `/src/lib/file-extract.js` | 200 | `application/javascript` | 6,924 b |
| `/data/countries/us.json` | 200 | `application/json` | 6,737 b |
| `/data/countries/gb.json` | 200 | `application/json` | 6,845 b |
| `/data/countries/hk.json` | 200 | `application/json` | 7,307 b |

CSS, JS lib, and JSON files all served with `Cache-Control: public, max-age=0, must-revalidate` because the `_headers` rule for libs targets `/lib/*` but actual paths are `/src/lib/*`. Country JSONs *do* match `/data/countries/*` and get `max-age=3600`. og.png and favicons get `max-age=86400`.

---

## Code review findings

### `functions/_lib.js`
- Line 26-49: `rateCheck` read-then-write is non-atomic on Cloudflare KV (no INCR primitive). Two concurrent requests can both read N, both write N+1, granting one extra request per IP. Acceptable; document.
- Line 23: 8-byte fingerprint truncation is fine for current scale (see #20).
- Line 70-73: `callClaude` throws an `Error` containing 500 chars of Anthropic's response body. Fine because every caller catches and returns a generic message — but the day someone writes a new endpoint that re-throws, the error bubbles to the user. Add a wrapper that only exposes safe fields.

### `functions/api/lesson-plan.js`, `worksheet.js`, `marking.js`, `cefr-assess.js`
- All four hardcode `MODEL = "claude-sonnet-4-6"`. Sonnet 4.7 is current (user is on Opus 4.7). Move to env var or update to a current ID. (#30)
- `marking.js` uses `body.target_language`; `cefr-assess.js` uses `body.language`. Pick one. (#7)
- `worksheet.js` doesn't validate that `count` was numeric — `parseInt(body.count, 10) || 8` handles it, but `Math.max(3, Math.min(20, ...))` is a clamping hack rather than an explicit check.

### `functions/api/newsletter.js`
- Line 50: `r.status >= 400 && r.status !== 400` is correct but reads like a typo. Use `if (!r.ok && r.status !== 400) ...`. (#28)
- Forwards `first_name` to Buttondown only if non-empty — fine, but never validated to be ASCII or strip control chars. Buttondown handles it, but defensive trimming never hurts.

### `functions/api/feedback.js`
- Line 26: KV key `${tool}:${id}` — `tool` is user-supplied, sliced to 60 chars but not character-class restricted. A `tool: "../../foo"` string passes through. KV doesn't have path semantics, so it's fine, but reading back keys with awkward characters is annoying for the maintainer-only manual review path.

### `src/lib/cefr-rules.js`
- Line 25: comment says answers can be `'yes'|'no'|'partial'`, but loop only branches yes/no. Partial silently behaves like No. (#13)
- Line 40 `notes` can produce contradictory text when `lowestNo` is below `highestYes`. (#12)

### `src/lib/file-extract.js`
- Line 80-92: `extractPdf` doesn't call `page.cleanup()` between pages. (#21)
- Line 132-139: `dt.files[0]` ignores files 1+. (#22)
- No max-text cap before writing to textarea. (#23)
- Drop zone HTML must include `tabindex="0"` and `role="button"` — verified in `marking.html` and `cefr.html`. Fine.

### `_headers`
- Line 27: `/lib/*` should be `/src/lib/*`. (#6)
- CSP `'unsafe-inline'` in script-src — necessary for inline scripts on every tool page; replace with nonces in v0.2.

### `index.html`
- Line 194: "Tutorful" reference, defunct. (#9)
- Line 239: "Joining 0 readers" hardcoded. (#10)
- Line 233: hidden label uses `position:absolute;left:-9999px;`. (#18)
- No FAQPage JSON-LD despite a real FAQ. (#17)

### `rates.html`
- Line 9: canonical points to `.html`. (#1)
- Line 240, 250: `pickFee`/`hoursTier` assume sorted curves. (#15)
- Line 162: no try/catch around `loadCountry`. (#29)

### `contract.html`
- Line 184: gendered pronoun "her side". (#2)
- Line 165: `today` uses UTC. (#26)
- Line 82-83: UK-default subject and rate. (#33)

### `marking.html`
- Line 211-232 `renderMarkdown` doesn't handle H4+. (#24)

### `cefr.html`
- Line 46-49 + 51-95: tabs aren't proper ARIA tabs. (#27)
- Line 190: every "No" radio default-checked. (#4)

### `tax.html`
- Lines 117 & 136: hardcoded `$` symbol. (#16)

### `feedback.js`
- Line 8: `BEACON_TOKEN` placeholder — analytics never installed. (#5)
- Line 57-66: thumbs click sends bare verdict, then comment-send sends again → duplicate KV records. (#3)

---

## User-flow walkthroughs

### Flow 1: Homepage → tool tile
**Works.** The hero copy is clear, the live preview widget shows a real number ("£25/hr median, italki £21 net, Preply £17 net") that immediately demonstrates the rate calculator's value. The 4 buckets × 10 tiles is browsable without scrolling on a desktop. Tile hover/focus is clean.
**Minor friction:** "Tutorful" mention in tile #9 description (rates) — defunct platform. The "// 03 / 04" mono-caption indexing is cute but a few users will pause.

### Flow 2: Rate calculator (UK, en-fr, 15 hrs)
**Works.** Picking GB + en-fr + 15 hrs/week produces: suggested low/median/high in £, italki/Preply/Cambly/Verbling row showing platform-net at the median (with Preply showing "33% (after 0 hrs taught)" because the user is at 0 hours taught — confusing UX, but not broken). Annual projection at £40 × 15 × 50 = £30,000 gross. FX note shows live rate timestamp. **The strongest tool in the kit.**
**Minor friction:** "Hours per week" doubles as both the projection input and the tier-fee lookup — a tutor who's been teaching 6 months at 15 hrs/week is at 360 cumulative hours, not 15. The Preply tier shows the wrong fee. Could split into "hours/week (for projection)" and "lifetime hours taught (for tier)".

### Flow 3: Setup walkthrough (HK)
**Works.** BR + MPF info answers the question "how do I start tutoring privately in Hong Kong?" cleanly. Lists the BR ($2,150/yr), the MPF threshold (HK$7,100/month income trigger), the 7.5%/15% Profits Tax brackets, the SCRC for working with minors. Background-check section names the SCRC at HK$135 with a 12-month validity. **Genuinely useful.**

### Flow 4: Tax page (UK)
**Works, with one stumble.** UK pick produces: trading allowance highlighted in the callout ("£1,000 / year"), VAT threshold (£90,000), SA103 form linked to HMRC, registration steps. The reframed "Most countries let you earn..." headline lands fine.
**Stumble:** the registration steps are 6-8 bullets that read like a HMRC pamphlet — could trim to 4 steps with a "more detail" expander.

### Flow 5: Contract builder
**Works.** Form on the left, live preview on the right, default values pre-fill so the page is immediately readable. Print-to-PDF produces a clean serif document with no header/footer/nav, just the agreement.
**Defects:** gendered "her side" (Critical #2), UK-default subject/rate, and the date is UTC.

### Flow 6: CEFR rule-based mapper
**Works in principle, broken at first touch.** All radios default to "No" — clicking "Place the student" without answering produces "A0, low confidence." A user's first impression is "this tool doesn't work."
**Once the user actually answers:** the placement is reasonable, the notes line can self-contradict if answers are inconsistent.

### Flow 7: Lesson plan / worksheet / marking with no API key
**Reads as broken, not "being configured."** With a valid full body, the AI endpoints return `503 {"error":"Service is being configured. Try again in a few minutes."}`. The frontend shows that error string verbatim. A first-time tutor sees "Service is being configured. Try again in a few minutes" and assumes the site is broken. Either:
  - hide the AI tools behind a "coming soon" banner until the API key is set, or
  - return a 200 with a synthetic "demo" plan when ANTHROPIC_API_KEY is unset, or
  - route to a different copy: "AI tools open beta starts [date]" with a newsletter signup.

The current state is the worst of both worlds: the tool is visible, accepts input, then fails silently-ish.

### Flow 8: FAQ on homepage
**Works.** Five `<details>` blocks, each genuinely answers the question. The ChatGPT differentiation (pre-contextualized + tutor-specific structure + free) is convincing. The "Is my student's writing private?" answer is excellent — it's specific, it acknowledges the elephant ("Maria Hernandez at the top of the paper"), and it links to the privacy posture. **Don't change.**

---

## Recommended next 5 actions (in order)

1. **Fix canonicals + sitemap** (15 min) — drop `.html` from every `<link rel="canonical">`, every `og:url`, every `twitter:url`, every `<loc>` in `sitemap.xml`. Also fix the recursive `404.html` canonical. This is the single highest-ROI SEO fix.

2. **Fix the launch embarrassments** (20 min total) — gendered "her" in contract.html line 184; "Tutorful" reference in index.html line 194 (replace with "Verbling" or "Cambly"); "0 readers" footnote in index.html line 239; `_headers` `/lib/*` → `/src/lib/*`; `BEACON_TOKEN` decision (install or remove the privacy-page bullet).

3. **Decide AI tools posture for launch** (1-2 hr) — either set `ANTHROPIC_API_KEY` and update the model ID to a current Sonnet (4.7), or hide the four AI tool tiles behind a "open beta soon" badge. Right now they look broken. Pick one.

4. **Fix CEFR rule-based UX** (30 min) — remove default-checked "No" radios; require at least one answer; handle the contradictory-answer case with a different `notes` string; either implement "partial" weighting or remove the option.

5. **Fix feedback widget duplicate-record bug** (10 min) — `feedback.js` line 57: don't send on the bare thumbs click; only send when the user clicks "Send" (with or without a comment). Or generate a stable per-page ID and overwrite the same KV key.

After those five, you're at soft-launch quality with a working SEO posture, no launch-day "wait this is broken" moments, and one less duplicate per feedback record. The Important and Nice-to-have lists are then a v0.2 backlog you can clear over the following week.
