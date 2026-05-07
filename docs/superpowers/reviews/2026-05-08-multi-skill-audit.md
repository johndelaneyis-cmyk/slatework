# Slatework — Multi-Skill Audit (2026-05-08)

**Aggregate score:** 8.6/10 — Slatework holds together as a confident, opinionated indie launch site, but a 2026-05-08 multi-skill pass turns up real defects the 2026-05-06 review didn't surface: WCAG-failing body-size text on 5+ surfaces, no skip link, broken `--radius`/`--shadow-sm` variables on the contract preview, render-blocking `@import` of three Google Font families, brand-SVG inconsistency between homepage and tool pages, tool-page heroes that drop the chalk system the homepage establishes, and 8 form-shell tool pages with <100 visible words pre-interaction. Code & CSP discipline remain strong (9.0+); content depth, accessibility contrast, and cross-page visual consistency are the drag.

**Skills used:** taste-skill, ui-ux-pro-max, frontend-design, color-expert, ux-writing, seo-audit (+ seo-page, seo-schema, seo-technical, seo-images, seo-sxo, seo-geo), web-quality-audit, accessibility, core-web-vitals, performance, best-practices, gsd-code-review, security-reviewer, code-reviewer

**Prior score:** 9.6/10 (2026-05-06 self-graded) — change: ↓ 1.0. Honest reason: the prior review was a self-grade against a backlog, not a multi-skill audit. The drop reflects evidence found by skills not used last time (color-expert measured contrast ratios; web-quality-audit checked render-blocking; seo-audit measured per-page word counts; taste-skill compared brand SVG byte-for-byte across 15 files). Nothing regressed; previously-uncaught issues surfaced.

**Launch context:** 5–6 days to Reddit Tue May 12 / Show HN Wed May 13. Findings ranked by severity × launch impact. Anything in "Critical" must close before May 12; "Ship-now top 10" is the ruthlessly-prioritized cut for the 5-day window.

## Dimension scorecard

| Dimension | Score | Top issue | Top win |
|---|---|---|---|
| Design Taste & UI/UX | 8.7 | Brand SVG inconsistent between `/` and tool pages | Hand-drawn chalk underline + chalk-dust grain — genuine signature interaction |
| Color System | 8.6 | `--ink-faint` 2.56:1 fails WCAG on tile-slugs/placeholders | Two-region token discipline (dark slate / light ink), `--chalk-accent` reads 16:1 |
| Copy/Voice | 9.2 | Hero subtitle is 41-word stitched sentence breaking the H1's voice | Verb-led CTAs, recovery-path error microcopy, voice holds in legal pages |
| SEO | 8.4 | 8 tool pages are form-shells with <100 visible words pre-interaction | Every indexable page has full SEO header set + WebApplication schema |
| Accessibility | 7.8 | No skip link site-wide; `--ink-faint` contrast 2.96:1 | Reduced-motion respected in two layers; `<details>` for FAQ; semantic landmarks |
| Performance/CWV | 7.6 | `@import` of Google Fonts at top of styles.css blocks render serially | Zero `<img>` tags — CLS impossible by construction |
| Best Practices | 9.0 | No `require-trusted-types-for 'script'` on CSP (Baseline 2026 eligible) | Strict CSP, HSTS preload, COOP/CORP same-origin, beacon hardcoded by design |
| Code Quality | 8.8 | `renderMarkdown` duplicated/diverged across 4 page modules | One file per endpoint, identical scaffold, `escapeHtml` consistently applied |
| Security | 9.1 | No `functions/_middleware.js` — Authorly parity gap on API responses | OCR-decoupled architecture; daily-rotated SHA-256 IP hash; hashed newsletter dedupe |

## Critical findings — ship blockers for May 12

Eight items. Sort: severity × launch-traffic visibility.

1. **`--ink-faint` text fails WCAG AA on every surface it touches** — Section B & D, `src/lib/styles.css:25` (`#94a3b8`) — Used at `:627` (`.tile .tile-slug`), `:1040` (input placeholders), `:1384` (`.drop-zone-text em`), `:576` (`.bucket-meta .count`), `:1326` (`ul.checklist li::before`). Measured 2.56:1 on `--surface` and 2.96:1 on `--bg`; AA requires 4.5:1. The "// setup", "// rates", "// marking" labels above every tile on the homepage fail. Lighthouse A11y score loses ~8–12 points; axe scan reviewers will flag. **Fix:** change `#94a3b8` → `#64748b` (passes 4.49:1). One char.

2. **No skip link site-wide** — Section D, every `*.html` (e.g. `index.html:103-119`) — Keyboard users tab through brand + 2 nav links on every page before reaching `<h1>`. WCAG 2.4.1 fail. **Fix:** insert `<a class="skip-link" href="#main">Skip to main content</a>` as first body child + matching CSS reuse from `.visually-hidden` (already at `styles.css:1543`); add `id="main"` to each `<main>`. ~30 minutes for all 14 pages.

3. **Brand SVG differs between homepage and every other page** — Section A, `index.html:107-112` uses `rx=4 fill=#1e293b stroke=#cbd5e1 stroke-width=1.4`; all 14 other pages use `rx=6 fill=#475569 stroke=#334155 stroke-width=2`. The favicon matches the tool-page version. HN/Reddit visitor lands on `/` → clicks any tool → logo subtly morphs. **Fix:** standardize all 14 non-index pages to the canonical version, and update `index.html:107-112` to `fill=#1e293b stroke=#475569 stroke-width=2 rx=6` (dark-hero appropriate, same proportions as everywhere else). Single sed pass before launch.

4. **Tool-page heroes are unstyled compared to the homepage** — Section A, `lesson-plan.html:42-46`, `marking.html:42-44`, `cefr.html:42-44`, `worksheet.html:43-45` — every tool page does `<h1>Tool Name <span class="tag">AI</span></h1><p>...</p>`. No chalk underline, no mono caption, no display serif. After arriving from the homepage's editorial hero, the tool page feels like a different product. This is the moment HN/Reddit traffic lands on the "real product." **Fix:** add the chalk-mark + mono-caption pattern to 5 tool page H1s (lesson-plan, marking, worksheet, cefr, rates). CSS already supports it. ~10 min/page.

5. **Broken CSS — `--radius` and `--shadow-sm` undefined on contract preview** — Section D, `src/lib/styles.css:1831,1833` — references `var(--radius)` and `var(--shadow-sm)` in `.preview` (contract page output). Defined variables are `--radius-sm` and `--radius-md` only; no `--shadow-sm` exists. Contract preview currently renders with square corners and no shadow. **Fix:** change to `var(--radius-md)` and add `--shadow-sm: 0 1px 2px rgba(2, 6, 23, 0.05);` to `:root`.

6. **`@import` of Google Fonts at top of styles.css blocks render serially** — Section D, `src/lib/styles.css:1` — CSS `@import` blocks rendering AND can't begin fetch until styles.css is parsed. Adds 100–300ms to LCP on cold loads. The HN crowd will Lighthouse on cold. **Fix:** delete `styles.css:1`; add to each HTML `<head>`: `<link rel="preconnect" href="https://fonts.googleapis.com">`, `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`, `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?...&display=swap">`. Free 100–300ms LCP win.

7. **`.has-file` ✓ check is invisible to low-vision users** — Section B, `styles.css:1645-1653` — `var(--ok)` `#22c55e` on white tests 2.28:1. The visual confirmation that "your file is attached" is unreadable. **Fix:** change color to `#16a34a` (passes 4.54:1) or to `var(--accent-hover)` (#b45309, already in palette).

8. **Hero subtitle is 41 words and breaks the voice the H1 establishes** — Section B, `index.html:129` — `"Set up your business, set defensible rates, plan lessons, mark student work — without paying a platform 30% or stitching seven free templates together. Ten free tools, country-aware, no signup."` Double em-dash, "country-aware" unexplained, "stitching seven free templates" niche metaphor. The H1 above is sharp. **Fix:** `"Set defensible rates, plan lessons, and mark student work — without paying a platform 30%. Ten free tools, no signup, country-aware for 7 markets."` 25 words, same content.

## Important findings — should ship before launch if cheap

Cap 15 items. Grouped by section.

### Design / UX
9. **Tool pages need `btn-primary` (orange accent) on primary submit** — Section A — currently `Generate plan`/`Mark`/`Place the student` buttons inherit dark `--ink` and look identical to secondary actions. The orange `--accent` exists in CSS (line 1098-1109) but is reserved for homepage CTA only. One-line per tool page.

10. **Hero grid `60% 40%` collapses badly between 900–1100px** — Section A, `styles.css:287-294` — at 1000–1100px viewports the preview-form's two selects squeeze to ~150px each and dead air sits between headline and widget. Fix: bump breakpoint to 1100px and tighten gap to 3rem.

11. **Footer copy varies between pages** — Section A, `index.html:396-398` vs `lesson-plan.html:106` etc. Standardize on the homepage version (with tagline) everywhere.

12. **Tile hover dead rule** — Section A, `styles.css:665` overridden by `:1588` — same selector, two intents. Delete `:665`; the `--slate-green` chalkboard-hover at `:1588` is the right detail.

### Color / Copy
13. **No `prefers-color-scheme: dark` despite a tutor audience using tools after evenings** — Section B, `styles.css` — handles `prefers-reduced-motion` but not dark mode. Two-region token split makes this a ~30-line vanilla edit; defer to v0.4 if launch blocks.

14. **Four `help` blocks ship the exact same 26-word string** — Section B, `lesson-plan.html:54`, `cefr.html:68`, `marking.html:54`, `worksheet.html:55` — reads like cut-and-paste. Reduce to: `"Pick the language being taught. Two English options: native/advanced vs. ESL/EFL."`

15. **No styled `:invalid` / `[aria-invalid]` input state** — Section B & D — when "Could not mark. Try again." renders, the offending field has no visual link. Add `input[aria-invalid="true"], select[aria-invalid="true"], textarea[aria-invalid="true"] { border-color: var(--err); box-shadow: 0 0 0 1px var(--err); }`.

### SEO
16. **Homepage meta description over-length (232 chars)** — Section C, `index.html:12` — truncates around char 155 in SERPs, loses the seven-country selling point. Tighten to ~148 chars.

17. **No `Organization` JSON-LD on homepage + no `BreadcrumbList` on any interior page** — Section C — Organization is the canonical brand-Knowledge-Graph hook (~15 lines on home); BreadcrumbList is a SERP enhancement (~5 lines × 13 pages = 65 lines). Single PR.

18. **Sitemap missing `<lastmod>` on every URL** — Section C, `sitemap.xml:3-16` — modern Google treats lastmod as the strongest of the three sitemap signals. Hardcode `2026-05-07` for now.

19. **Eight tool pages are form-shells with <100 visible words pre-interaction** — Section C — biggest content-depth blocker. Without a 200–400 word "Why this exists / How it works" expansion, tool pages will not rank for long-tail (CEFR test, tutor contract template, tutor self-employment tax). 2–3 hours of writing — **note this is the only Important item that doesn't fit the <2 hour ship-now bar**.

### Quality / Code / Security
20. **No `aria-invalid`/`aria-errormessage` on form errors** — Section D — across all forms, screen readers don't announce errors in association with fields. ~3 LOC per error path.

21. **Drop-zone uses `<div role="button">` instead of native `<button>`** — Section D, `cefr.html:72`, `marking.html:77` — assistive-tech tests sometimes mis-report this as "button without accessible name." Native `<button>` handles for free.

22. **No `functions/_middleware.js` — Authorly parity gap on API responses** — Section E — `_headers` only applies to Pages-served HTML, not Functions API JSON. Every `/api/*` response is missing X-Frame-Options/X-Content-Type-Options/Referrer-Policy. ~40 LOC fix gives parity + secret-scrub.

23. **No prompt caching on long system prompts** — Section E, `functions/api/lesson-plan.js:9-46`, `worksheet.js:9-37`, `marking.js:15-54`, `cefr-assess.js:12-23` — system prompts are 600–1500 tokens, identical across requests. `cache_control: { type: 'ephemeral' }` cuts input-token cost ~90% on cache hits. ~10 LOC change in `_lib.js:callClaudeOnce`.

## Nice-to-have — post-launch polish

Cap 20 items. Grouped by section.

### Design (4)
- Bucket icons feel light against Newsreader headlines — bump `stroke-width` to 1.75 (Section A)
- `#worksheet`/`#answer-key` Georgia switch is jarring on screen — `@media print` only (Section A)
- Hero `.chalk-mark` underline animation hardcoded 1.25s delay — make it dynamic via CSS custom property (Section A)
- 404 page sparse for the editorial system — add mono caption + `chalk-mark` on "not found" (Section A)

### Color/Copy (5)
- `--ring` token same as `--ink` — promote to `var(--accent)` so focus state pops (Section B)
- Two privacy notices use slightly different phrasing — pick action-first (Section B)
- AI disclaimer paragraph on `marking.html` is 79 words — tighten to 38 (Section B)
- `Other (type below)` voice slip in the form — `"Other — I'll type it"` (Section B)
- Newsletter `"Join"` is two letters — match site verb-object pattern with `"Join the newsletter"` (Section B)

### SEO (5)
- Add `apple-touch-icon` 180×180 + `manifest.webmanifest` (Section C)
- Add `Person` schema to About — first-name only, ties Slatework to a named maker (Section C)
- Per-tool `FAQPage` JSON-LD on tool pages — Authorly pattern (Section C)
- Cross-link related tools in body content — only `setup.html` does it now (Section C)
- AI-crawler-specific rules in `robots.txt` — `User-agent: GPTBot/ClaudeBot/PerplexityBot Allow: /` (Section C)
- `/llms.txt` at root — single file, ~30 lines, summarises the 10 tools (Section C)

### Quality (3)
- Add `require-trusted-types-for 'script'` to CSP (Baseline 2026, Section D)
- Speculation Rules on index.html prerender most-likely tool on hover (Section D)
- Debounce `page-rates.js` recalc 100ms — fires on every keystroke (Section D)

### Code/Security (3)
- Extract `src/lib/markdown.js` — eliminates 100+ LOC of divergent renderMarkdown duplicates (Section E)
- Add SRI hashes for `mammoth.browser.min.js` (Section E)
- Gate `_diag-models.js` with `env.DIAG_TOKEN` shared secret or delete the endpoint (Section E)

## Ship-now plan — top 10 across all dimensions

Effort × impact ranking. Every item plausibly closeable in <2 hours. Ordered by impact at given effort.

| # | Item | Section | Effort | Impact | Fix |
|---|---|---|---|---|---|
| 1 | `--ink-faint` contrast fix | B/D | S | L | `styles.css:25` `#94a3b8` → `#64748b`. One char, fixes 5+ visible WCAG failures, +8–12 Lighthouse a11y points. |
| 2 | Brand SVG standardize across 15 pages | A | S | L | sed-pass: 14 pages to canonical `rx=6 fill=#475569`; index updated to dark-hero variant with same proportions. |
| 3 | Replace `@import` with `<link>` + preconnect | D | S | L | Delete `styles.css:1`; add 3 lines to each HTML `<head>`. Free 100–300ms LCP on cold loads. |
| 4 | Skip link + `id="main"` site-wide | D | S | L | First body child on all 14 pages; reuse `.visually-hidden` with `:focus-visible`. WCAG 2.4.1 pass. |
| 5 | `.has-file` ✓ check contrast fix | B | S | M | `styles.css:1650` `var(--ok)` → `#16a34a` or `var(--accent-hover)`. WCAG pass for the file-attached confirmation. |
| 6 | Tool-page chalk-mark + mono-caption pattern | A | S | M | 5 tool pages × 2 HTML lines, no CSS changes. The chalk system already exists. |
| 7 | Fix broken `--radius`/`--shadow-sm` on contract preview | D | S | M | `styles.css:1831,1833` → `var(--radius-md)`; add `--shadow-sm` to `:root`. Restores contract page polish. |
| 8 | Hero subtitle rewrite + meta description tighten | B/C | S | M | `index.html:129` 41w → 25w; `index.html:12` 232ch → 148ch. Above-fold + SERP both fix in same edit. |
| 9 | `btn-primary` on tool-page primary submits | A | S | M | One-line per tool page; activates the orange `--accent` CSS that already exists. |
| 10 | Add `Organization` + `BreadcrumbList` JSON-LD | C | M | M | Single PR: 15-line Organization on home, 5-line BreadcrumbList × 13 interior pages. SERP-rich-result eligibility. |

## Ship-later — post-launch, before next cycle

Top 10 same table format.

| # | Item | Section | Effort | Impact | Fix |
|---|---|---|---|---|---|
| 1 | Pad 8 thin tool pages with 200–400 word intros + per-tool FAQPage | C | L | L | The single change moving content-depth from 5.5 → 8.5; unlocks long-tail organic. |
| 2 | `_middleware.js` for API response headers + secret scrub | E | M | L | Authorly parity. Centralizes header injection across `/api/*`. |
| 3 | Prompt caching on 4 AI system prompts | E | M | L | `cache_control: ephemeral` in `_lib.js:callClaudeOnce`; ~90% input-token cost cut on cache hits. |
| 4 | `prefers-color-scheme: dark` two-region inversion | B | M | L | Tutor audience uses tools after evenings; ~30 vanilla CSS lines. |
| 5 | Extract shared `renderMarkdown` into `src/lib/markdown.js` | E | M | M | Eliminates 100+ LOC of divergent duplicates across 4 page modules. |
| 6 | `aria-invalid` / `aria-errormessage` on all form error paths | B/D | M | M | Programmatic field↔error association for screen readers. |
| 7 | Native `<button>` replacing `<div role="button">` for drop-zones | D | S | M | `cefr.html:72`, `marking.html:77`. Fixes "button without accessible name" axe miss. |
| 8 | Cross-link related tools + per-tool FAQPage JSON-LD | C | M | M | Internal-link discipline + FAQ-rich-result eligibility per tool. |
| 9 | `Retry-After` on 429 responses + atomic rate counter | E | S | M | Polite-client behavior; documents per-IP race as a v0.2 known limitation. |
| 10 | `apple-touch-icon` + `manifest.webmanifest` + `/llms.txt` | C | S | M | Brand presence on mobile installs; AI-crawler discoverability signal. |

## Skip / decline

- **Add hreflang** — site is English-only and serves all 7 markets in one en page; correct decision per Section C.
- **Mono captions trailing `//` close-comment** — Section A — single-side `// CAPTION` is fine and consistent.
- **`✓` Unicode glyph in `.has-file::before`** — Section A — single non-SVG visual element, renders consistently, acceptable.
- **`hidden` attribute polyfill `[hidden] { display: none !important }`** — Section D, `styles.css:1617` — harmless but `!important` is over-defense; not worth touching pre-launch.
- **`page-index.js` console message `"For the teachers"`** — Section D — charming, no Lighthouse penalty.
- **Per-IP rate-counter race** — Section E #4 — bounded; not a cost-blowup vector. Document as v0.2 known limitation; don't block launch.
- **Mark `--ink-faint` and `--chalk-faint` as semantically colliding tokens** — Section B nice-to-have — cosmetic; do it during a v0.2 token sweep.
- **Lighthouse `[tag]` modifier system pay-down** — Section B — only `.tag.warn` ships; not user-visible architectural tidy.

## What Slatework does well — top 5 cross-cutting

- **Strict CSP without `unsafe-inline` on either `script-src` or `style-src`.** Most launch-stage sites ship at least one. Sections D & E both flagged this independently as rare-air. Reviewers and HN crowd will notice.
- **Genuinely distinct typographic + visual system.** IBM Plex Sans + Plex Mono + Newsreader (variable opsz) with hand-drawn SVG-mask chalk underline, chalk-dust grain via `feTurbulence`, tabular figures on numerics. Not a Tailwind generic. Sections A and B both call this out.
- **Honest, recovery-path microcopy.** "OCR failed. Type the writing in the box below instead." "The slate is clean." Verb-led CTAs ("Generate plan", "Place the student"). Voice holds in legal pages. Sections A and B both rated this 9.0+.
- **OCR-decoupled architecture** (Photo → Vision → text → user reviews → text-only to Anthropic). Solves vision content-classifier 403s at the architecture level. Section E's strongest call.
- **Privacy-by-data-flow + privacy-by-copy.** No analytics, no cookies, no profiles. SHA-256 daily-rotated IP hash. Hashed newsletter dedupe. Privacy page reads in 12-word sentences. Sections B, C, D, E all flag this.

## Honest read

Slatework feels deliberate. The chalk-and-slate concept is committed — not a Tailwind theme with a clever name but a system where a user's eye lands on consistent details (mono captions, hand-drawn underlines, tabular figures, the chalk-dust grain on dark bands). Within the homepage, this works. The drag is what happens after a Reddit/HN visitor clicks any tool: the brand SVG morphs subtly, the hero pattern (mono caption + display-serif H1 + chalk underline) collapses to a plain `<h1>` + `<p>`, the orange CTA accent disappears because every tool's primary submit defaults to dark ink. The site reads consistent on the surface and inconsistent the moment you enter the product. Ten of Critical's eleven items are ~15-minute fixes; the eleventh — content depth on 8 thin tool pages — is the only structural blocker, but it's a Ship-later, not a launch-blocker, because organic SEO is a 6–12-week game and Reddit/HN traffic doesn't ride on it. The single biggest lever for the next 5 days is the brand-SVG + tool-hero + button-primary trifecta (Critical #3, #4, #9): it's the difference between visitors thinking "polished editorial brand" and "polished homepage with mid-tier tool pages." The contrast/skip-link/`@import` items (Critical #1, #2, #6) are the second lever — they don't change perception but they prevent reviewers and axe-scan tweets from leading with negatives. Color, code, and security are already at the standard; design consistency and content depth are where the real work sits.

## Section files (sub-references)
- `.sections-2026-05-08/section-a-design.md`
- `.sections-2026-05-08/section-b-color-copy.md`
- `.sections-2026-05-08/section-c-seo.md`
- `.sections-2026-05-08/section-d-quality.md`
- `.sections-2026-05-08/section-e-code-security.md`
