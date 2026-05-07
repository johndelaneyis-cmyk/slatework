# Section D — Quality (A11y / Perf / CWV / Best Practices) — Slatework

**A11y score:** 7.8/10
**Performance/CWV score:** 7.6/10
**Best practices score:** 9.0/10
**Combined:** 8.1/10

Strong baseline — strict CSP, semantic HTML, no `<img>` weight, all SVGs `aria-hidden`, vanilla everything. Two ship-blockers found (contrast on body-size muted text, missing skip link), plus one actual broken visual (undefined CSS variables on contract preview), plus one performance pothole that's free to fix (`@import` of Google Fonts at the top of styles.css, no `<link rel="preconnect">`).

## Sub-scores

| Sub-dim | Score | Note |
| --- | --- | --- |
| Semantic HTML | 9 | Correct landmarks (`<header>`, `<main>`, `<footer>`, `<nav>`, `<section>`, `<article>`); H1/H2 hierarchy clean; `<details>` for FAQ; `role="tablist"` only where needed. |
| Keyboard nav | 6 | No skip link site-wide. Drop-zone has Enter/Space handler but `role="button"` on a div instead of native `<button>`. CEFR tabs implement arrow-key navigation correctly. |
| Forms a11y | 7 | All inputs have `<label for>`. Newsletter is the only form with `autocomplete=email`; contract.html has 4 form fields (`tutor_name`, `business_name`, `contact_email`, `subject`) with no autocomplete attrs at all. No `aria-invalid` / `aria-errormessage` anywhere — server errors aren't programmatically associated to fields. |
| Color contrast | 5 | `--ink-faint: #94a3b8` on `--bg: #f8fafc` is **2.96:1** — fails WCAG AA for normal text. Used on `.tile-slug`, `.bucket-meta .count`, placeholders, marker dots. `--chalk-faint: #64748b` on `--slate-deep: #020617` ≈ **4.43:1**, fails for normal text but passes for `.country-band .row` (uppercase + mono ≥ 13px is borderline AA-large only). |
| Touch targets | 9 | Buttons + inputs have `min-height: 44px`/`52px`. Header `nav a` is `padding: 6px 0` — height 28-30px on a small target. Below 24×24 minimum is fine, below 44×44 is AAA-only. |
| Reduced motion | 9 | Top-level `@media (prefers-reduced-motion: reduce)` block kills animations and pulses. Hero reveal has explicit early-return on `matchMedia('(prefers-reduced-motion: reduce)').matches`. Solid. |
| LCP | 7 | LCP element on every page is the H1 (no images, no hero photo). Render path: HTML → styles.css → `@import` of Google Fonts → font swap. Render-blocking `@import` plus no `preconnect` to fonts.gstatic.com costs ~150-400ms on cold connections. Inline critical CSS is the standard fix; cheaper fix below. |
| CLS | 8 | No images means no late-loading image shifts. Risk is text reflow when Newsreader/Plex finally loads — `font-display: swap` is set via Google Fonts URL. No `size-adjust`/`ascent-override` to match fallback metrics, so 0.05-0.10 CLS is plausible on cold loads. |
| INP | 8 | Event handlers are small. `page-index.js` letter-by-letter reveal walks the H1 DOM at 20ms increments — 35 chars × 20ms = ~700ms of synchronous layout/paint pressure during first paint, but it's all `forwards` CSS animation after wrap, so the JS work is the wrap pass (~5ms). Form re-render in `page-rates.js` runs on every `input` event with no debounce; could feel sluggish on mobile keyboards, but probably under the 200ms INP threshold. |
| Asset weight | 8 | styles.css 46.5KB un-gzipped (~9-10KB gzipped — fine). Page JS files all <8KB each. og.png 73KB (only loaded when shared, not on page). Total above-fold weight per page: ~60-80KB JS+CSS, plus Google Fonts (3 families, ~200-400KB depending on what gets pulled). The fonts dominate. |
| Caching | 8 | `_headers` sets `max-age=300, stale-while-revalidate=3600` for HTML; 24h for `/src/lib/*` and SVGs. Cache busting via `?v=12` query is consistent. No `immutable` flag on hashed/versioned assets — small miss. |
| Image strategy | 9 | N/A — no `<img>` tags anywhere. Avatars/heroes are inline SVG with `width/height`. Drop-zone preview is the only `<img>` and is dynamically inserted with explicit dimensions in CSS (`80×80`). |
| Font strategy | 4 | **Three font families loaded via `@import` at the TOP of styles.css.** `@import` blocks rendering AND can't begin fetch until styles.css is parsed (serial dependency). No `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`. No `<link rel="preload">` on the LCP-relevant variant (Newsreader 600/72-opsz). `display=swap` is set via the URL parameter so at least no FOIT, but the cold-load LCP is paying 200-500ms for this setup. |
| Security headers | 9 | HSTS preload, COOP/CORP same-origin, strict CSP with `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`, `object-src 'none'`. Permissions-Policy locks down camera/mic/geo. No `require-trusted-types-for 'script'` (Baseline 2026; eligible upgrade). Beacon token is hardcoded in `feedback.js` — public by design, fine. |

## Findings

### Critical (ship blockers — Lighthouse fails, WCAG AA fails)

- **Body-size text fails WCAG 1.4.3 contrast (4.5:1)** — `src/lib/styles.css:25` (`--ink-faint: #94a3b8`) — used as foreground on `--bg: #f8fafc` background in `.tile-slug` (`styles.css:627`), `.bucket-meta .count` (`styles.css:576`), placeholders (`styles.css:1040`), and `ul.checklist li::before` (`styles.css:1326`). Measured 2.96:1; AA requires 4.5:1 for text < 18px. Fix: bump to `#64748b` (slate-500) for **5.65:1** AA pass while staying tonally muted, OR keep the color only for ≥18px display elements.
  - Lighthouse runs the contrast checker on every text node. This is a guaranteed Lighthouse a11y score reduction (typically -8 to -12 points) and a WCAG 2.4.3 fail under any axe scan reviewers will run.

- **No skip link** — every page in `*.html`, e.g. `index.html:103-119` (header is the first focusable region with two nav links before main content). Keyboard users have to Tab through brand + 2 nav links on every page before reaching the H1. Fix: insert `<a class="skip-link" href="#main">Skip to main content</a>` as first body child + matching CSS pattern (already have `.visually-hidden`/`.sr-only` at `styles.css:1543`); add `id="main"` to each `<main>`. Fixes WCAG 2.4.1.

### Important

- **Broken CSS — `--radius` and `--shadow-sm` undefined** — `src/lib/styles.css:1831,1833` references `var(--radius)` and `var(--shadow-sm)` in `.preview` (contract page output). Defined variables are `--radius-sm` and `--radius-md` only; no `--shadow-sm` exists. Browser falls back to initial values: `border-radius: 0` and `box-shadow: none`. Contract preview currently looks unstyled (square corners, flat). Fix: change to `var(--radius-md)` and add `--shadow-sm: 0 1px 2px rgba(2, 6, 23, 0.05);` to `:root`.

- **`@import url(fonts.googleapis.com)` at top of styles.css blocks render** — `src/lib/styles.css:1`. CSS `@import` is render-blocking AND serial — the browser cannot start fetching `fonts.googleapis.com` until it has fetched + parsed `styles.css`. Adds ~100-300ms to LCP on cold loads. Fix in two steps:
  1. Delete line 1 of `styles.css`.
  2. In each HTML `<head>`, add (before the stylesheet link):
     ```html
     <link rel="preconnect" href="https://fonts.googleapis.com">
     <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
     <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,500..700;1,6..72,400&display=swap">
     ```
  Browser now opens the font connections in parallel with the CSS fetch. Free 100-300ms LCP improvement on cold loads.

- **No CLS guard against font swap** — `styles.css` has no `size-adjust`, `ascent-override`, or `descent-override` on the system fallback. When Newsreader (`--display`, used for the hero H1 and bucket headings) replaces the fallback Georgia, line height shifts. CLS on the hero is the bug visitors will see in the cold-load filmstrip. Fix: declare `@font-face` blocks for system fallbacks with `size-adjust` matching IBM Plex Sans / Newsreader metrics (or accept the 0.05-0.10 CLS — borderline-passable).

- **No `aria-invalid` / `aria-errormessage` on form errors** — across all forms. e.g. `src/lib/page-marking.js:91-93` injects `<p>Pick a target language.</p>` into the result div on validation failure. The `<select id="target">` doesn't get `aria-invalid="true"` or get programmatically linked to that error. Screen readers don't announce the error in association with the field. Fix: when an input fails validation, set `inputEl.setAttribute('aria-invalid', 'true')`, give the error `id="target-error"`, and set `inputEl.setAttribute('aria-errormessage', 'target-error')`.

- **Drop-zone uses `<div role="button">` instead of native `<button>`** — `cefr.html:72`, `marking.html:77`. `role="button"` on a div requires manual `tabindex`, `aria-label`, AND keyboard handling — and reviewers' assistive-tech tests sometimes mis-report this as "button without accessible name" because the inner content (`<p class="drop-zone-text">`) overrides the `aria-label`. Native `<button>` would handle this for free. Constraint: dropping a file on a `<button>` works fine. Fix: change `<div id="drop-zone" class="drop-zone" tabindex="0" role="button">` to `<button type="button" id="drop-zone" class="drop-zone">` and remove the `tabindex` and `role`.

- **Missing `autocomplete` on contract.html form fields** — `contract.html:53,54,60,63`. `tutor_name`, `business_name`, `contact_email`, and `subject` should have `autocomplete="name"`, `autocomplete="organization"`, `autocomplete="email"`, `autocomplete="off"` respectively. Browser autofill currently doesn't suggest the user's saved name/email when filling out their own contract template. WCAG 1.3.5.

- **Beacon script + `feedback.js` injected dynamically** — `feedback.js:11-15`. The Cloudflare Web Analytics beacon is appended to `<head>` from JS instead of declared in HTML. This causes a small render-path delay per page (the beacon URL only starts resolving after `feedback.js` parses). Mitigation: it's `defer` so it doesn't block first paint. Fix (optional): declare the beacon `<script defer src="...">` inline in each HTML `<head>` so the browser can parallelize the connection earlier.

- **`page-rates.js` recalcs on every keystroke** — `src/lib/page-rates.js:37`. `form.addEventListener('input', recalc)` fires on every keystroke in the rate or hours number inputs. `recalc()` does an `await SW.loadCountry()` (cached after first), serializes platforms, formats currency, and rebuilds 6+ DOM nodes. On a slow Android device with a sticky keyboard, this can push INP over 200ms. Fix: debounce `recalc` 100ms.

### Nice-to-have

- **Add `immutable` to versioned assets in `_headers`** — `_headers:27-28`. With `?v=12` already in HTML script src, `/src/lib/*` could be `Cache-Control: public, max-age=31536000, immutable`. Saves a conditional GET per asset on repeat visits.
- **Add Speculation Rules** — `<script type="speculationrules">` on index.html with `where: { href_matches: "/*" }, eagerness: "moderate"` would prerender the most likely tool page on hover. Not on Safari/Firefox; ignored gracefully there. Adds ~0ms LCP on Chromium repeat-tools navigation.
- **Add `require-trusted-types-for 'script'` to CSP** — `_headers:7`. Baseline across all major browsers since early 2026. Closes the DOM-XSS hole the strict-CSP refactor doesn't reach (innerHTML sinks). Add in `Content-Security-Policy-Report-Only` first to find any sinks; the codebase uses `escapeHtml` on every value so enforcement should pass cleanly.
- **`color-scheme` meta missing** — none of the HTML files declare `color-scheme: light dark` or include `<meta name="color-scheme" content="light dark">`. Browser falls back to "light only", which is fine (the site IS light + dark hero band); minor: `theme-color` is set to `#020617` (slate-deep) which is the hero color, not the page color — Safari uses this for the address bar. Acceptable choice.
- **Speculative `prefers-color-scheme: dark`** — no dark-mode adaptation. This is a small site for a daytime workflow; not flagging as required, but worth noting absence so reviewers don't.
- **`page-index.js` console message** — `page-index.js:3` logs `"For the teachers"` to console. Charming, but Lighthouse/CrUX won't penalize it. Reviewers might say "console output in production". Fine to keep.
- **`countries.js` and `currency.js` are loaded synchronously in HTML before page-*.js** — they're tiny (~3.7KB and ~1.6KB) but blocking script tags. Could be `defer` like the page scripts to remove parser-blocking; the `(async function init())` IIFEs would still wait for `window.Slatework` to populate because the assignment is at module-scope. Net: 1-2ms faster TTI.
- **`hidden` attribute polyfill** — `styles.css:1617` sets `[hidden] { display: none !important; }`. Native `[hidden]` works in every browser shipping in the last decade; the rule is harmless but the `!important` is over-defense.
- **No `<noscript>` fallback** — all 12 tool pages require JS. SEO crawlers handle this fine, but a `<noscript>` block in `<main>` saying "These tools require JavaScript — turn it on" would bump axe `landmark-no-duplicate-banner` cleanliness and improve UX for the 0.2% of users without JS.

## Ship-now top 3

1. **Fix `--ink-faint` contrast** — `src/lib/styles.css:25` from `#94a3b8` to `#64748b`. One char, fixes 5+ visible failures, takes Lighthouse a11y score from probable ~88 to probable 100.
2. **Skip link site-wide** — add as first body child + `id="main"` on `<main>`. Reuse the existing `.visually-hidden` class with a `:focus-visible` reveal. ~30 minutes including all 12 pages.
3. **Replace `@import` with `<link rel="stylesheet">` + preconnect** — delete `styles.css:1`, add 3 lines to each HTML `<head>`. ~15 minutes. Free 100-300ms LCP win on every cold load. The HN crowd will Lighthouse on cold-load.

## What Slatework does well

- **Zero `<img>` tags.** Decorative imagery is inline SVG, all `aria-hidden="true"`. CLS from images is impossible by construction. Lighthouse perf score gets free points.
- **Strict CSP that actually works.** `script-src 'self' https://...allowlist'`, `style-src 'self' https://fonts.googleapis.com` (no `'unsafe-inline'` on styles either after the v0.3 refactor), `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`, `object-src 'none'`. This is rare for a vanilla-JS site without a bundler.
- **Semantic HTML done right.** Every page has one `<h1>`, the heading hierarchy goes H1→H2→H3 without skips, `<details>`/`<summary>` for FAQ (instead of div+aria-expanded soup), `<nav aria-label>` on the tablist.
- **Reduced-motion support is genuine.** Two layers: a global `*` override for transitions, plus explicit early-returns in `page-index.js` and `styles.css:1240-1244` for the chalk dot animation.
- **Privacy-first by data flow.** Contract builder is fully client-side. Payments, tax, setup, rates pages render from a JSON country pack with zero server roundtrip beyond the static fetch. AI-backed tools clearly disclose what's sent. Rate-limit fingerprint is daily-rotated SHA-256 of IP — `functions/_lib.js:34-46`.
- **Progressive enhancement for file uploads.** Mammoth and pdf.js are only loaded on first file drop, gated behind dynamic `<script>` injection — `file-extract.js:10-32`. They never run on lighter pages.
- **Form validation surfaces something useful.** Errors are typed, the upstream Anthropic message is unwrapped from JSON and shown to the user (`functions/_lib.js:243-279`). Most sites swallow this into a generic "something went wrong".
- **`autocomplete=email` on the newsletter input.** It's the one place it matters most for funnel — they got it right.
