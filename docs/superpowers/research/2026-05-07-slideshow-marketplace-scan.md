# Slatework — web-design tooling audit + slideshow scan (2026-05-07)

**Date:** 2026-05-07
**Stack under audit:** `slatework.tools` — pure static HTML on Cloudflare Pages, `functions/` for API workers, vanilla JS (`src/lib/page-*.js`), one shared `styles.css`, strict CSP (no `'unsafe-inline'` on `script-src` or `style-src`, no `'unsafe-eval'`), inline SVG icons, `?v=12` script-tag cache busting, ~15 HTML pages, no build step / no bundler / no `package.json`.
**Goal:** Audit the broader 2025–2026 web-design tooling marketplace for capabilities Slatework lacks, plus the original slideshow output investigation. Opinionated verdicts only — no surveys.

---

## Executive summary

Slatework is in unusually good shape for a hand-crafted vanilla site, but the marketplace has moved fast. **Three categories pay off immediately at near-zero cost:** modern CSS (cascade layers, `:has()`, `color-mix()`, OKLCH, container queries), a proper accessibility-and-performance CI loop (Pa11y CI + Lighthouse CI in GitHub Actions), and Cloudflare Polish for free image optimization. **Three more pay off with a small one-off investment:** a tiny `package.json` for Lightning CSS minification, content-hash cache busting via esbuild for `src/lib/page-*.js`, and a variable-font + Fontaine fallback to lift typographic personality without harming CLS. **Two are worth scheduling for next quarter:** Eleventy migration for the duplicated header/footer/nav across 15 pages, and Playwright visual regression once content stabilizes. **Skip:** Tailwind v4, Pico/missing.css, Astro, Motion One, Vite MPA, anchor positioning, scroll-driven animations, and any framework rewrite. Slatework already has a defensible design language; commodity tooling would dilute it.

### Prioritized recommendations

| # | Recommendation | Effort | Impact | Verdict |
|---|---|---|---|---|
| 1 | CSS Cascade Layers (`@layer reset, base, components, utilities`) | S (2h) | mid | Ship now |
| 2 | `:has()`, `color-mix()`, OKLCH tokens in `styles.css` | S (3h) | mid | Ship now |
| 3 | Container queries on shared cards/lists | S (2h) | mid | Ship now |
| 4 | Lighthouse CI + Pa11y CI on GitHub Actions | S (3h) | high | Ship now |
| 5 | Cloudflare Polish (toggle in dashboard) | XS (10m) | high | Ship now |
| 6 | Lightning CSS minify + targets via tiny `package.json` | S (2h) | mid | Ship now |
| 7 | Content-hash cache busting via esbuild for `page-*.js` | S (3h) | mid | Ship later |
| 8 | Variable font (Atkinson Hyperlegible / Geist) + Fontaine fallback | M (4h) | mid | Ship later |
| 9 | View Transitions API for cross-document MPA navigation | S (2h) | low-mid | Ship now |
| 10 | Open-Props *fragments only* (easings, sizes) — not the full library | S (1h) | low-mid | Ship now |
| 11 | Lucide CDN + `data-icon` micro-helper for SVG injection | S (2h) | mid | Ship later |
| 12 | Schema.org JSON-LD per page (`SoftwareApplication`, `HowTo`) | M (4h) | high (SEO) | Ship now |
| 13 | Sitemap.xml + RSS for `/blog` (when blog exists) | S (2h) | mid | Ship later |
| 14 | OG image generation via Cloudflare Workers `og-image` | M (4h) | mid | Ship later |
| 15 | Cloudflare Turnstile on contact form | S (1h) | mid | Ship now |
| 16 | Eleventy migration for shared header/footer/nav | M (8h) | high | Ship later |
| 17 | Playwright `toHaveScreenshot()` smoke suite | M (6h) | mid | Ship later |
| 18 | PptxGenJS + JSON-driven preview (slideshow output) | L (12h) | high | Ship next milestone |
| 19 | Tailwind v4, Pico, missing.css, Open-Props full | — | — | Skip |
| 20 | Astro / Vite MPA / Web Components / Motion One | — | — | Skip |
| 21 | Anchor positioning, scroll-driven animations | — | — | Skip (not Baseline) |

---

## 1. CSS modernization for static sites in 2026

The 2026 baseline browser set has caught up to roughly 90% of the features the indie web spent the last five years asking for. Worth using *today*: cascade layers, `:has()`, container queries, OKLCH, `color-mix()`, View Transitions (cross-document). Worth ignoring: anchor positioning (Limited availability — Chrome only as of mid-2026), scroll-driven animations (`animation-timeline`: ["this feature is not Baseline because it does not work in some of the most widely-used browsers"](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline)).

**Cascade Layers (`@layer`)** — Baseline Widely Available since March 2022. ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer)) For a single hand-written `styles.css`, layers eliminate the "I have to bump specificity" problem without resorting to `!important`. A four-layer convention (`reset, base, components, utilities`) keeps Slatework's stylesheet legible as it grows past ~1500 lines and lets you introduce a new component-style sweep without worrying about which page-specific override now wins. The size cost is zero. **Verdict: ship now.**

How to start: at the top of `styles.css`, declare order, then move blocks into layers:
```css
@layer reset, base, components, utilities;
@layer base { :root { --bg: oklch(98% 0.01 250); } }
@layer components { .card { /* ... */ } }
```

**`:has()`** — Baseline Newly Available since Dec 2023. ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/:has)) Lets you style a parent based on what's inside it without JavaScript. For Slatework, the immediate win is `form:has(:invalid) .submit { /* dim it */ }` and `nav:has(.active) { /* persistent indicator */ }`. Pair it with `@layer components` and you delete a chunk of `page-*.js` toggles. **Verdict: ship now.**

**Container queries** — Baseline Widely Available. ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries)) The point isn't to replace media queries; it's to make the same card component work in a sidebar (narrow), a main grid (medium), and an empty-state hero (wide) without bespoke breakpoints per page. Slatework reuses cards on the lesson generator, worksheet generator, and rates pages — exactly the pattern container queries solve. Cost: a `container-type: inline-size` on the wrapper plus `cqi` units. **Verdict: ship now.**

**OKLCH** — Baseline Widely Available since May 2023. ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/oklch), [Evil Martians: OKLCH in CSS](https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl)) Define your accent palette in OKLCH and you get perceptually uniform lightness — a 70% lightness blue and a 70% lightness green look equally bright, unlike HSL where blues read darker. For an indie tool with one accent color, this matters most when you generate hover/focus/active states automatically with `color-mix()`. **Verdict: ship now, paired with #2.**

**`color-mix()`** — Baseline Widely Available since May 2023. ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix)) Replaces five hand-tuned hex values per palette color with one base + four `color-mix(in oklch, var(--accent) 90%, white)` derivations. **Verdict: ship now.**

```css
@layer base {
  :root {
    --accent: oklch(62% 0.18 250);
    --accent-hover: color-mix(in oklch, var(--accent) 88%, black);
    --accent-tint:  color-mix(in oklch, var(--accent) 12%, white);
    --accent-ring:  color-mix(in oklch, var(--accent) 40%, transparent);
  }
}
```

**View Transitions API (cross-document)** — works for MPA navigation in 2025+ Chromium and Safari TP. ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API)) Slatework is exactly the use case: 15 documents, server-rendered, navigation between them. A single `@view-transition { navigation: auto; }` declaration plus matching `view-transition-name` on the persistent header gives you a free crossfade and a non-jumpy header on every page transition. Firefox falls back gracefully to no animation. CSP-safe. **Verdict: ship now, low effort, immediate UX lift.**

**Anchor positioning** — Limited availability (Chrome only as of writing). ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_anchor_positioning)) Useful eventually for tooltips/popovers but not portable yet. **Verdict: skip.**

**Scroll-driven animations** — Limited availability. ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline)) Cool for marketing sites; nothing on Slatework needs it. **Verdict: skip.**

---

## 2. Tooling on top of vanilla static sites (without going framework)

Slatework currently has *no* build. The temptation is to keep it that way. The honest read: a single `package.json` with two dev-deps (`lightningcss-cli`, `esbuild`) and a 5-line `npm run build` script pays for itself within a week, costs you nothing at runtime, and doesn't compromise the static-site nature.

**Lightning CSS** — Rust-based, ~100x faster than PostCSS+cssnano, handles minify + autoprefix + browser-targets-based transpilation in one binary. ([Lightning CSS](https://lightningcss.dev/)) "Minifies over 2.7M lines of code per second on a single thread" and lets you "use modern CSS features and future syntax today" with automatic fallbacks. For Slatework, the wins are: minify `styles.css` (~30-40% size reduction typical), autoprefix `:has()` for older Safari, and let you write nesting without worrying about which engine reads it. **Verdict: ship now.**

How to start:
```json
{ "scripts": { "build:css": "lightningcss --minify --bundle --targets '>= 0.5%' src/styles.css -o dist/styles.css" } }
```

**esbuild** — Replaces your current `?v=12` cache-busting strategy. ([esbuild](https://esbuild.github.io/)) Bundle each `page-*.js` to `page-*.[hash].js`, write a tiny manifest, and your HTML can reference the hashed filename so cache invalidation becomes free instead of manual. esbuild runs in ~50ms for Slatework's likely ~30KB JS surface. Doesn't break strict CSP. **Verdict: ship later — current `?v=12` works, this is a nice-to-have.** Schedule when manual `?v=N` bumps start feeling like friction.

**PostCSS** — Once Lightning CSS is in, you don't need PostCSS unless a specific plugin is irreplaceable. **Verdict: skip in favor of Lightning CSS.**

**Vite in MPA mode** — Real dev server with HMR. The HMR is genuine quality of life, but Slatework's ~15 pages are simple enough that "browser auto-reload on file save" via `wrangler pages dev` (which you almost certainly already use) is 95% of the value. Vite would also push you toward a `src/index.html` per page convention that's noisier than what you have. **Verdict: skip for now.**

**Astro** — "JavaScript web framework optimized for building fast, content-driven websites." ([Astro](https://astro.build/)) Astro's "Islands Architecture" is genuinely the right shape for what Slatework would migrate *to* if you wanted shared components without going SPA. But it's the next-step-up tool, and the cost is real (build pipeline, `.astro` files, learning the islands model, Cloudflare Pages adapter). **Verdict: skip — Eleventy is the better stop along the way (see #16).**

**Eleventy** — "A simpler static site generator." ([Eleventy](https://www.11ty.dev/)) Used by `a11yproject.com` and `docs.flutter.dev`. Eleventy lets you write the same HTML you write today, but extract the duplicated header/footer/nav into `_includes/` partials and use Liquid or Nunjucks for any per-page variation. No client-side JS added. No CSP changes. Output is exactly the static HTML you ship today, just without the copy-paste problem. **Verdict: ship later — schedule for the next time you change navigation across all 15 pages and feel the pain.**

How to start (when ready): `npm i -D @11ty/eleventy`, move `<header>`/`<footer>` to `_includes/`, point Cloudflare Pages build command at `npx @11ty/eleventy`. Done in an afternoon.

**Web Components (declarative custom elements)** — Tempting because zero-dependency. The reality: `<slatework-nav>` would need either a class definition (which lives in JS, runs at every page load, tiny but real cost) or the still-emerging declarative shadow DOM HTML form (browser support is fine but tooling is ergonomically painful). For 15 pages, Eleventy partials are simpler and ship less to the client. **Verdict: skip.**

---

## 3. Design-system primitives without a framework

You already have a hand-crafted design language. Wholesale adoption of any framework's tokens would dilute it. The narrow play is to borrow *fragments* that are tedious to author from scratch.

**Open-Props** — "Sub-atomic styles." ([Open Props](https://open-props.style/)) Ships as CSS custom properties: shadows, radii, sizes, colors, easings, animations. The full library is ~500KB unminified — too much. The targeted import (e.g. `easings.min.css`, `sizes.min.css`) is ~3KB combined. **Verdict: ship now — easings + sizes only.** Don't import colors (you have your own); don't import the whole library.

How to start:
```css
@import url("https://unpkg.com/open-props/easings.min.css") layer(base);
.button { transition: transform 200ms var(--ease-out-3); }
```

**Tailwind CSS v4** — "CSS-first configuration." ([Tailwind v4](https://tailwindcss.com/blog/tailwindcss-v4)) v4 is genuinely better than v3 (zero JS config, native CSS imports, oklch palette), but Tailwind's value is when you're writing many components fast. Slatework has one stylesheet with deliberate, polished decisions in it. Adopting Tailwind would mean either (a) a coexistence period that adds bytes and cognitive load, or (b) rewriting `styles.css` for marginal gain. **Verdict: skip.**

**Pico.css / missing.css** — Classless or class-light "looks decent out of the box" CSS. Useful for a doc site or quick admin panel; pointless for a tool that already has its own opinions. **Verdict: skip.**

---

## 4. Iconography

**Current state:** inline SVG, hand-pasted from somewhere. Works, but maintenance is annoying — you can't bulk-update icons, and adding a new icon requires opening the source.

**Lucide** — The Feather Icons fork that's now the de facto standard. ([Lucide](https://lucide.dev/)) Vanilla `lucide` package available; you can either copy SVGs ad-hoc from `lucide.dev/icons` (current behavior, but at least from one source) or include the small loader and write `<i data-lucide="book-open"></i>`. Loader is ~3KB gzip and does not violate CSP because it just queries the DOM and inlines SVG. **Verdict: ship later — keep current inline approach; switch to `data-icon` helper when icon count exceeds ~20 unique icons site-wide.**

**Iconoir** — "1600+ unique SVG icons, designed on a 24x24 pixels grid." ([Iconoir](https://github.com/iconoir-icons/iconoir)) Open-source, MIT, very high quality. Same model as Lucide. **Verdict: viable alternative to Lucide** — pick one, don't mix sets.

**Heroicons / Tabler / Phosphor** — All fine. The differentiator at this scale is which set you find prettier; functionality is equivalent. **Stick with one. Don't mix.**

How to start (recommended approach — keeps inline SVG, just centralizes):
```js
// src/lib/icons.js
const ICONS = { 'book-open': '<svg viewBox="0 0 24 24">...</svg>', /* ... */ };
document.querySelectorAll('[data-icon]').forEach(el => {
  el.innerHTML = ICONS[el.dataset.icon] ?? '';
});
```
That's vanilla, CSP-safe, and replaces 50 inline copies of the same SVG with one source-of-truth.

---

## 5. Type & font loading

**Current state:** likely system fonts. Functional, indistinct.

**Recommendation: Atkinson Hyperlegible** for body. Designed by the Braille Institute for low-vision readers, hits the legibility/personality sweet spot for a tool that markets itself on inclusion (independent tutors). Free on Google Fonts. Variable-axis available.

Alternative: **Geist** (Vercel's open-source variable font) for a more design-forward feel. Both are good. Pick one.

**Font-display:** ([web.dev font best practices](https://web.dev/articles/font-best-practices)) `swap` is the safe default — invisible-text period is 0ms, font swaps in when ready. `optional` is stricter (100ms block, no swap if late) and best when you can tolerate "fallback wins on slow connections" — appropriate for Slatework where the fallback should look almost identical (see Fontaine).

**Fontaine** — "Reduces CLS by using local font fallbacks with crafted font metrics. Pure CSS, zero runtime overhead." ([Fontaine](https://github.com/unjs/fontaine)) Their playground showed CLS drop from 0.24 → 0.054 just by enabling Fontaine. The mechanism: Fontaine generates a `@font-face { src: local('Arial'); ascent-override: 90%; ... }` block that makes the system fallback occupy the same vertical space as the web font, so when the web font swaps in there's no shift. CSP-safe (just CSS). **Verdict: ship later — needs the build step from #2 to actually run.**

**Capsize** — does the same thing manually. Use it if you want per-page tuning; Fontaine for automation.

How to start (if no build yet, just hand-tune):
```css
@font-face {
  font-family: 'Atkinson';
  src: url('/fonts/AtkinsonHyperlegible-Variable.woff2') format('woff2-variations');
  font-display: optional;
  font-weight: 200 800;
  size-adjust: 102%;
  ascent-override: 88%;
  descent-override: 22%;
}
```

---

## 6. Image optimization for Cloudflare Pages

**Cloudflare Polish** — Free on the Pro plan, automatic AVIF/WebP conversion + lossless or lossy compression of any image served from your domain. Toggle in the dashboard, no code change. **Verdict: ship now (10-minute task).**

**Cloudflare Images / Image Resizing transformations** — ([CF Images](https://developers.cloudflare.com/images/)) Two paths: "Bring your own storage" (transforms images on R2/S3) or "Use Images to host." Useful when you start serving user-uploaded images (worksheet illustrations, vocab cards). For static marketing imagery, Polish is enough. **Verdict: ship later — only when slideshow image embedding lands (see #18) or you start serving variable-sized hero images.**

**`<picture>` source-set** — Hand-roll AVIF + WebP + JPEG fallback per image. Polish makes this unnecessary for most cases. **Verdict: skip; Polish handles it.**

**`loading="lazy"`** — Add to all `<img>` below the fold. Free, works everywhere. **Verdict: ship now if not already done — sweep across 15 pages takes 20 minutes.**

---

## 7. Animation libraries that respect strict CSP

**Default position: don't add an animation library.** With strict CSP, your safe-and-free options are:
- **CSS transitions and keyframes** — work everywhere, no CSP issue, no JS at all
- **View Transitions API** (covered in #1) — covers cross-document and same-document state changes for free
- **Web Animations API** (`element.animate({...}, {duration: 200})`) — built-in, vanilla-friendly, CSP-clean

**Motion One** — ([Motion](https://motion.dev/)) Now branded just "Motion." 5KB-ish for the mini animate function, larger for full features. CSP behavior: Motion does not use `eval` or `Function()`, so it works under strict CSP. Genuinely the only third-party animation library worth considering for this stack. But for Slatework's needs (page transitions, button presses, form feedback), Web Animations API + CSS keyframes cover everything. **Verdict: skip until you find an animation that's painful to express in WAAPI.**

**GSAP, Anime.js** — Heavier, no current advantage over Motion. **Skip.**

---

## 8. Accessibility tooling automated runs

This is one of the highest-ROI sections. A 5-minute setup gives you ongoing regression catching forever.

**Pa11y CI** — ([Pa11y](https://pa11y.org/)) "A command-line tool which iterates over a list of web pages and highlights accessibility issues. Geared towards use in CI." Wraps axe-core and HTML-CodeSniffer. Configure with a JSON file listing your 15 URLs; runs in GitHub Actions on every PR.

**axe-core CLI** — ([axe-cli](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/cli)) Equivalent to Pa11y CI, but axe-core only (no HTML-CodeSniffer). Slightly stricter, fewer false positives. Industry standard. Pick one of {Pa11y CI, axe CLI}, not both.

**Lighthouse CI** — ([Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)) "Get a Lighthouse report alongside every PR. Set and keep performance budgets on scripts and images. Track performance metrics and Lighthouse scores over time." Combines accessibility, performance, SEO, best-practices in one report with PR-level diffs.

**Verdict: ship now — Lighthouse CI as the primary, optionally add Pa11y CI for stricter a11y coverage.**

How to start (`.github/workflows/lhci.yml`):
```yaml
- run: npm install -g @lhci/cli
- run: lhci autorun --collect.url=https://staging.slatework.tools/ --assert.preset=lighthouse:recommended
```

---

## 9. Visual regression / smoke tests

**Playwright `toHaveScreenshot()`** — ([Playwright snapshots](https://playwright.dev/docs/test-snapshots)) "On first execution, Playwright test will generate reference screenshots. Subsequent runs compare against them." Stores PNG goldens next to test files; commit the snapshot directory; PRs that change visuals fail until you re-approve.

**Cost analysis for 15 pages:**
- Setup: ~3 hours (install, write one test that loops over a sitemap, configure CI)
- Per-PR run cost: ~30 seconds in GitHub Actions
- Maintenance cost: every intentional visual change requires `npx playwright test --update-snapshots`. That's ~30 seconds per intentional change.

**Verdict: ship later — once content stabilizes after the May 7-14 launch window.** Prelaunch you're changing things constantly; the snapshot-update churn outweighs the regression catching. Post-launch, when typography/spacing are settled, this becomes high-leverage.

How to start (when ready):
```js
// tests/smoke.spec.js
const { test, expect } = require('@playwright/test');
const pages = ['/', '/lesson', '/worksheet', '/marking', /* ... */];
for (const path of pages) {
  test(`visual: ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveScreenshot(`${path.replace(/\//g, '_') || 'home'}.png`, { fullPage: true });
  });
}
```

---

## 10. SEO + structured-data tooling

**Schema.org JSON-LD** — ([Schema.org getting started](https://schema.org/docs/gs.html)) Each tool page is a `SoftwareApplication`; the lesson generator is a `HowTo` (with steps); the contract/insurance/tax pages are `FAQPage` (you've already shipped FAQPage on the launch review). The wins are clearer Google snippets and AI-assistant answer eligibility.

CSP nuance: JSON-LD is *not* JavaScript. `<script type="application/ld+json">{...}</script>` is allowed under strict CSP without `'unsafe-inline'` because CSP `script-src` only governs executable JavaScript. **Verdict: ship now.**

How to start (per page):
```html
<script type="application/ld+json">
{ "@context": "https://schema.org", "@type": "SoftwareApplication",
  "name": "Slatework Lesson Generator", "applicationCategory": "EducationalApplication",
  "operatingSystem": "Web", "offers": { "@type": "Offer", "price": "0" } }
</script>
```

**sitemap.xml** — Trivial to hand-author for 15 pages or generate via Eleventy. **Ship now if not already done.**

**RSS for `/blog`** — Slatework doesn't have a blog yet. When/if you add one, RSS is table stakes for indie hackers and language-teacher communities. **Verdict: defer until the blog exists.**

**OG image generation** — Currently a static `og.png`. Per-page dynamic OG images via a Cloudflare Worker (Satori + ResVG, both work on Workers as of 2024) lift link-preview quality on Reddit/Twitter/Slack. **Verdict: ship later — high marketing leverage for launch posts but not blocker.**

---

## 11. Performance budgets

**Lighthouse CI** (covered in #8) is the primary tool — use its `assert` config to fail PRs that breach a budget:
```json
{ "assertions": { "first-contentful-paint": ["error", {"maxNumericValue": 1500}],
                  "interactive": ["error", {"maxNumericValue": 2500}],
                  "total-byte-weight": ["error", {"maxNumericValue": 200000}] } }
```

**Cloudflare Web Analytics** — Free, privacy-respecting (no cookies, no PII), gives you Core Web Vitals from real users. Already permitted in your CSP via `static.cloudflareinsights.com`. **Verdict: ship now if not enabled.**

**web-vitals.js** — Client-side library to capture CWV and beam to your own endpoint. Useful only if you want per-page custom dashboards. CF Web Analytics covers 95% of indie needs. **Verdict: skip unless you need custom analytics.**

---

## 12. Forms / privacy-respecting toolkit

**Cloudflare Turnstile** — ([Turnstile](https://developers.cloudflare.com/turnstile/)) "Cloudflare's smart CAPTCHA alternative. Can be embedded into any website without sending traffic through Cloudflare and works without showing visitors a CAPTCHA." Three widget types: Managed (auto-decides), Non-interactive, Invisible. CSP-friendly (well-documented script and frame sources to allow). **Verdict: ship now on contact form** (and any other public POST endpoint that hits an API worker). Free, ~5KB script, dramatically reduces bot abuse on free-tier API quotas.

How to start: add `<div class="cf-turnstile" data-sitekey="..."></div>`, include the script, server-side validate the token in the API worker before calling Anthropic.

**Formspree alternatives** — You already have `functions/` workers; you don't need Formspree. Skip the discussion.

**Client-side rate-limit indicators** — Currently your backend likely returns 429 with `Retry-After` (per the launch review). Surfacing the remaining quota inline beside the submit button (`"3 of 5 free requests remaining today"`) costs ~30 lines of vanilla JS and is a meaningful UX lift on a free-tier tool. **Verdict: ship later — nice-to-have polish.**

---

## 13. Slideshow output (preserved from prior research)

This section preserves the prior investigation. Tooling-marketplace verdicts above don't change the slideshow recommendations.

### 13.1 Competitor toolkit gaps — what tutors expect

The AI-tutor-toolkit space has converged on a small set of output expectations. Slideshow output is **table stakes for general K–12 / classroom tools** but **a real differentiator inside the indie language-tutor niche**.

**Has slideshow output (table stakes for the leaders):**
- **MagicSchool AI** — Presentation Generator built in. Generates a deck from any topic, text, YouTube URL, or uploaded content; exports to Google Slides / PowerPoint; customizable post-generation. ([MagicSchool Presentation Generator](https://www.magicschool.ai/tools/presentation-generator))
- **Curipod** — The reference standard for "AI lesson as slides." Produces an interactive deck (slides + polls + word clouds + draw activities + exit tickets) in ~75 seconds. "Curify my Slides" can also ingest an existing deck and add interactivity. ([Curipod review – Educators Technology](https://www.educatorstechnology.com/2024/12/top-ai-slideshow-makers-for-teachers.html), [FLTMAG profile](https://fltmag.com/curipod/))
- **Brisk Teaching** — Chrome extension that generates a deck from any web page; output drops into Google Slides natively. ([Educators Technology – Top 4 Slide Generators](https://www.educatorstechnology.com/2025/10/top-4-teacher-friendly-ai-slide-generators.html))
- **SlideSpeak / Gamma / Tome** — General-purpose AI slide makers heavily marketed to teachers. ([SlideSpeak Best AI Presentation Maker for Teachers](https://slidespeak.co/blog/best-ai-presentation-maker-for-teachers))

**Does NOT yet ship slideshow output (the language-tutor cluster):**
- **Twee** — EFL/ESL specialist. ~30 tools. Output = copy-paste or PDF only; no slideshow generator. Free tier capped at 20 activities/month. ([Twee tools](https://twee.com/tools))
- **Diffit** — Differentiated reading passages. Exports to Google Docs / Forms / Slides / PDF, but the Slides export is text-content driven, not a designed deck.
- **Lessonplans.ai, Teach-this.com, ESLBrains** — Worksheet- and activity-centric; no AI-generated slide decks.

**Verdict:** In the broad "AI tool for teachers" market, slideshow output is now expected — leaders ship it. Inside the *independent language tutor* niche specifically, **none of Slatework's direct peers (Twee, ESLBrains, Teach-this, Lessonplans) generate a real downloadable slideshow.** A clean `.pptx` export tuned to language-lesson structure (warm-up → vocab → grammar focus → practice → wrap) is a credible differentiator, not a me-too feature. Bar is moderate: the 1-on-1 tutor is presenting on a laptop, often Zoom-screen-share, and just needs slides that don't look generic.

What thoughtful tutors expect a slideshow feature to include:
- Editable output (PowerPoint or Google Slides), not a locked PDF
- Clear lesson-section labelling per slide (objective, target language, examples, practice, wrap)
- Image embedding for vocab cards (even simple emoji or stock placeholder is acceptable as a v1)
- Speaker/teacher notes per slide
- A coherent visual theme (one body font, one accent color) — not Comic Sans default

Animations, branding, embed/share links, and live polling are *ceiling* features owned by Curipod and SlideSpeak; not realistic for v1.

### 13.2 PowerPoint generation libraries on Cloudflare Workers

**Recommendation: PptxGenJS, with `nodejs_compat` on a 2024-09-23+ compatibility date.**

**PptxGenJS (v4.0.1, May 2026)**
- Zero runtime dependencies. Dual ESM/CJS build. Outputs valid Open XML `.pptx`. ([npm](https://www.npmjs.com/package/pptxgenjs), [docs](https://gitbrent.github.io/PptxGenJS/))
- Documentation explicitly lists "Serverless / Edge Functions including AWS Lambda, Vercel, **Cloudflare Workers**" as a supported environment. ([PptxGenJS introduction](https://gitbrent.github.io/PptxGenJS/docs/introduction/))
- Internally uses JSZip (which has a Workers-compatible build) and `Buffer`/stream APIs. On Workers you should set `compatibility_date >= 2024-09-23` and add `compatibility_flags = ["nodejs_compat"]`. ([Cloudflare Node.js compat](https://developers.cloudflare.com/workers/runtime-apis/nodejs/), [2025 retrospective](https://blog.cloudflare.com/nodejs-workers-2025/))
- Supports themes, master slides, image embedding (URL or base64), text auto-fit, charts, tables, speaker notes — covers everything you'd plausibly want for v1.
- Use `pres.write({ outputType: "arraybuffer" })` and return as `Response` with `application/vnd.openxmlformats-officedocument.presentationml.presentation`. No `fs` needed.

**Alternatives surveyed:**
- **officegen** — Multi-format (Word/Excel/PPTX) but has heavier Node-stream dependence; not Workers-friendly without significant polyfilling. ([npm-compare](https://npm-compare.com/docx-templates,officegen,pptxgenjs))
- **pptx-automizer** — Template-based merging/manipulation library. Useful if you have a pre-designed `.pptx` template to clone and fill, but adds disk-IO assumptions you'd have to work around. ([npm](https://www.npmjs.com/package/pptx-automizer))
- **react-pptx** — Wraps PptxGenJS in React JSX. Wrong for a vanilla-JS frontend; just use PptxGenJS directly. ([GitHub](https://github.com/wyozi/react-pptx))
- **nodejs-pptx, js-pptx** — Effectively unmaintained.
- **Headless Chromium / Puppeteer-to-pptx** — Doesn't run on Workers (no native binaries on the edge). Hard pass.

**Workers-specific gotchas to plan for:**
- Workers CPU limit is 30 s on paid / 50 ms-burst on free; a 15-slide deck with images compresses in <2 s — fine. Build the deck in memory; don't iterate Anthropic calls inside the same request unless you stream from an existing JSON lesson plan.
- 128 MB memory cap. Embed images as URLs not base64 where possible, or downscale. For language-vocab images, consider letting Anthropic return image *prompts* and just leaving placeholders client-side (or piping through a stock image API later).
- No `fs`. PptxGenJS supports buffer/array output natively, so this is a non-issue.

### 13.3 In-browser preview strategy with strict CSP

Constraints to respect: vanilla JS, no inline scripts, no `unsafe-eval`, `style-src` strict (per the launch review). That eliminates anything that injects styled HTML via `eval` or inline `<style>`.

**Four candidate strategies, ranked:**

**A. Generate parallel HTML preview + PPTX download from one source-of-truth JSON. (Recommended.)**
The lesson generator already returns structured JSON. Render an HTML preview (one slide per `<section>` or one card per slide in a CSS-grid carousel) using your existing strict-CSP-safe vanilla JS, *and* feed the same JSON to PptxGenJS server-side for the download. The preview is just your own HTML — no third-party rendering library, no CSP escape hatches, fully themeable to match Slatework. The download is a real `.pptx`. **This is the cleanest path for your stack.**

**B. Reveal.js in a same-origin iframe.**
Reveal.js renders deck-style HTML and supports keyboard navigation, transitions, speaker notes, PDF export. ([Reveal.js](https://revealjs.com/)) Sandboxing inside an iframe is the standard isolation pattern. But: native PPTX export is *not* supported (open since 2017); the community workflow is Reveal → DeckTape → PDF → Adobe → PPTX, which is fragile. ([Reveal Issue 2310](https://github.com/hakimel/reveal.js/issues/2310), [Maeda's writeup](https://maeda.pm/2023/11/12/convert-reveal-js-slides-to-powerpoint/)) Use Reveal *only* if you want a high-fidelity preview and accept generating PPTX separately via PptxGenJS — i.e., it's strategy A with Reveal as the preview renderer. Adds ~250 KB and an iframe; not worth it unless you want fancy transitions.

**C. PPTX-to-HTML preview libraries (pptx-preview, PPTXjs, PptxViewJS).**
- `pptx-preview` (npm v1.0.7, last published mid-2025) — pure-frontend PPTX→HTML renderer, ~13 dependents. Lightly maintained. ([npm](https://www.npmjs.com/package/pptx-preview))
- `PPTXjs` (v1.21.1, March 2025) — actively released, but **jQuery + JSZip + d3 + nvd3 + dingbat + divs2slides** stack. Heavy and not strict-CSP friendly; many of its renderers inject inline styles. ([GitHub](https://github.com/meshesha/PPTXjs))
- `PptxViewJS` — newer Canvas-based viewer, vanilla-JS. Looks promising but smaller community and immature API. ([PptxViewJS](https://gptsci.com/pptxviewjs/))

These all preview a *generated* PPTX, which means: generate the PPTX → ship it to the browser → re-parse it → render HTML. That's a wasted round-trip when you already have the source JSON. Only useful if you let users *upload* PPTX. Skip.

**D. Server-side slide-to-image render.**
Headless browser screenshots of each slide, returned as PNGs. Doesn't run on Workers (no Chromium). Would require a separate compute layer. Overkill.

**Recommendation:** Strategy A. Render preview from JSON in vanilla JS using your existing CSS system. Keep PptxGenJS strictly server-side for the download. Zero third-party preview library, zero CSP exceptions, full visual control, single source of truth.

### 13.4 Competitive bar: floor and ceiling

**The current bar (mid-2026):** For *general* AI teaching tools, slideshow output is mandatory and the format expectation is editable Google Slides or `.pptx`. Polish is uneven — MagicSchool's output is functional but visually generic, Curipod's is the polish leader (designed templates, embedded interactivity, live student response). Branding tends to be minimal in free tiers (a small footer logo); premium plans remove it. Animations are mostly absent — Curipod adds polls/draws, not slide transitions. Sharing/embedding is universal among the leaders: Google Slides export, shareable link, or (Curipod) a join code for live delivery. Custom themes are mostly limited to "pick from 3-5 presets."

**Realistic floor and ceiling for Slatework:** The floor for an indie tool is a real `.pptx` download with consistent typography, one accent color, lesson-section structure visible per slide, and speaker notes. That alone clears the bar against Twee/ESLBrains/Teach-this (none of which generate decks at all) and meaningfully approaches MagicSchool's output for the language-tutor use case. The ceiling — without scope creep — is a tasteful in-browser preview rendered from the same JSON, two or three theme presets, embedded vocab/example images via a stock API or emoji, and proper `objective → target language → guided practice → free practice → wrap` slide grammar specific to language pedagogy (the thing Twee does well in worksheets, applied to slides). What you should explicitly *not* attempt at v1: live student response (Curipod's moat), in-browser editing (Google Slides / SlideSpeak's moat), animation systems, AI-generated stock photography, or share/embed links. Ship the floor first, theme + images second, leave interactivity to the incumbents.

---

## Sources

**CSS modernization**
- [MDN — `@layer`](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer)
- [MDN — Container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_queries)
- [MDN — `:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has)
- [MDN — View Transitions API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API)
- [MDN — `oklch()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/oklch)
- [MDN — `color-mix()`](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/color-mix)
- [MDN — `animation-timeline`](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline)
- [MDN — CSS anchor positioning](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_anchor_positioning)
- [Evil Martians — OKLCH in CSS: why we moved from RGB and HSL](https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl)

**Tooling**
- [Lightning CSS](https://lightningcss.dev/)
- [esbuild](https://esbuild.github.io/)
- [Open Props](https://open-props.style/)
- [Tailwind CSS v4](https://tailwindcss.com/blog/tailwindcss-v4)
- [Eleventy](https://www.11ty.dev/)
- [Astro](https://astro.build/)

**Icons & fonts**
- [Lucide](https://lucide.dev/)
- [Iconoir](https://github.com/iconoir-icons/iconoir)
- [web.dev — Best practices for fonts](https://web.dev/articles/font-best-practices)
- [Fontaine](https://github.com/unjs/fontaine)

**Animation, a11y, perf, SEO**
- [Motion](https://motion.dev/)
- [Pa11y](https://pa11y.org/)
- [axe-core CLI](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/cli)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [Playwright visual comparisons](https://playwright.dev/docs/test-snapshots)
- [Schema.org getting started](https://schema.org/docs/gs.html)

**Cloudflare**
- [Cloudflare Images](https://developers.cloudflare.com/images/)
- [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/)
- [Cloudflare — Node.js compatibility](https://developers.cloudflare.com/workers/runtime-apis/nodejs/)
- [Cloudflare blog — A year of Node.js compat in Workers (2025)](https://blog.cloudflare.com/nodejs-workers-2025/)

**Slideshow (prior research, preserved)**
- [MagicSchool AI Presentation Generator](https://www.magicschool.ai/tools/presentation-generator)
- [Educators Technology – Top 4 Teacher-Friendly AI Slide Generators](https://www.educatorstechnology.com/2025/10/top-4-teacher-friendly-ai-slide-generators.html)
- [FLTMAG – Curipod review](https://fltmag.com/curipod/)
- [SlideSpeak – Best AI Presentation Maker for Teachers](https://slidespeak.co/blog/best-ai-presentation-maker-for-teachers)
- [PptxGenJS – npm](https://www.npmjs.com/package/pptxgenjs)
- [PptxGenJS docs](https://gitbrent.github.io/PptxGenJS/docs/introduction/)
- [Reveal.js](https://revealjs.com/) and [Issue 2310 – PPTX export](https://github.com/hakimel/reveal.js/issues/2310)
- [pptx-preview on npm](https://www.npmjs.com/package/pptx-preview)
- [PPTXjs on GitHub](https://github.com/meshesha/PPTXjs)
- [Twee tools](https://twee.com/tools)

---

# Skill & knowledge gap audit (2026-05-07)

A meta-audit of where the *assistant* working on Slatework is currently guessing, what the broader Claude Code skill marketplace would fix at near-zero cost, and what canonical references close the gaps where no skill exists. Goal: stop the guessing, document the irreducible gaps, give the user three actions for the next session.

## Skill marketplace — what to install

The current install leans hard on motion (~80 sub-skills covering Disney 12 principles, framer-motion, GSAP, easings, timing buckets, emotion targeting). That's overkill for a static vanilla site. The real holes are everywhere *except* motion: typography, color systems, copywriting, SEO/schema, performance budgets, and CRO. Below: third-party packs that have shipped since the official `frontend-design` skill landed and that target Slatework's actual stack.

| # | Skill / pack | Source | What gap it fills | Verdict |
|---|---|---|---|---|
| 1 | **taste-skill** (a.k.a. Taste-Skill / High-Agency Frontend) | [github.com/Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) (~13k stars), [andrew.ooo review](https://andrew.ooo/posts/taste-skill-anti-slop-ai-frontend-review/) | "Anti-slop" — bans the Inter + purple-gradient + rounded-card default; forces commitment to a visual direction before code. Complementary to `frontend-design`, not replacement. Three-parameter EQ-style control for output. | **Install now.** Highest-starred third-party design skill on GitHub. Pairs with `frontend-design`. |
| 2 | **skill.color-expert** (meodai) | [github.com/meodai/skill.color-expert](https://github.com/meodai/skill.color-expert) | OKLCH, APCA contrast, palette generation, pigment mixing. meodai is the colorjs.io / repaint.online author — actual color-science expertise, not vibes. | **Install now.** Closes the OKLCH-token gap from rec #2 in the table above. |
| 3 | **claude-seo** or **schema-markup-generator** | [github.com/AgriciDaniel/claude-seo](https://github.com/AgriciDaniel/claude-seo), [SEO Schema Validator skill](https://mcpmarket.com/tools/skills/seo-schema-validator) | 19 sub-skills inc. JSON-LD generation, E-E-A-T checks, GEO/AEO (AI-search) optimization, schema validators. Fills the entire "no SEO skill installed" hole. | **Install now.** Directly executes table rec #12 (Schema.org JSON-LD). HowTo retired Sept 2023 — skill knows; current install does not. |
| 4 | **web-quality-skills** (addyosmani) | [github.com/addyosmani/web-quality-skills](https://github.com/addyosmani/web-quality-skills) | 150+ Lighthouse audits across Performance, Accessibility, SEO, Best Practices. CWV optimization patterns (LCP, INP, CLS). Maintained by the Chrome perf lead. | **Install now.** Replaces "guess at performance budgets" with concrete pass/fail criteria. |
| 5 | **ux-writing-skill** (content-designer) | [github.com/content-designer/ux-writing-skill](https://github.com/content-designer/ux-writing-skill) v1.6.0 | Microcopy patterns, voice consistency enforcement, error/empty/success state copy. Production-ready as of March 2026. | **Install now.** Slatework's voice is "friendly-but-precise" but uncodified — every page currently relies on me guessing tone per-component. |
| 6 | **theme-factory** | Anthropic-skills ecosystem ([best skills 2026 roundup](https://www.firecrawl.dev/blog/best-claude-code-skills)) | Pre-built professional font/color themes for HTML pages, slides, docs. Useful as a sanity check against Slatework's current palette + as a starting point for the slideshow theme. | **Install later.** Useful when the slideshow milestone (rec #18) lands, not before. |
| 7 | **page-cro / Landing Page Conversion Auditor** | [Page CRO skill](https://mcpmarket.com/tools/skills/page-cro-optimizer), [get-ryze CRO audit](https://www.get-ryze.ai/claude-openclaw-clawdbot-skills/cro-landing-page-audit) | Value-prop clarity, headline effectiveness, CTA placement audits. Free-tool / zero-pricing model has its own conversion patterns — this skill knows them. | **Install later.** Higher leverage *after* launch when you have real activation data; pre-launch it would just produce opinions. |
| 8 | **marketingskills** (coreyhaines31) | [github.com/coreyhaines31/marketingskills](https://github.com/coreyhaines31/marketingskills) | 32 skills covering CRO, copywriting, SEO, paid ads, analytics, retention, growth engineering. Bundle worth more than its parts. | **Install later.** Read once, install only the 3-4 relevant sub-skills (CRO, retention, growth-engineering); avoid the paid-ads/sales-ops ones. |

**Skip:** anything bundled around "AI website cloner," general design-system architects that assume Tailwind/React, dark-mode-only skills, the frontend-slides / artifacts-builder skills (assume claude.ai HTML artifacts, not Cloudflare Pages). Per-project install-list for Slatework: **1, 2, 3, 4, 5 — five skills, all free, all targeted.**

## Where Claude is guessing — and the cost

Severity scale: **H** = currently making decisions blind on Slatework, **M** = guessing but the cost is small, **L** = irrelevant or overhead. "Blocker now?" answers whether this is paying friction *today* on the May 7-14 launch window.

| Domain | Severity | Blocker now? | Canonical reference |
|---|---|---|---|
| Typographic scale (1.250 vs 1.333 vs perfect-fourth) and what each communicates | **M** | No — system fonts are functional | [Practical Typography (Butterick)](https://practicaltypography.com/), [Type Scale calculator](https://typescale.com/) |
| Vertical rhythm + line-length (`measure`) per text size and reading context | **M** | No — current line-length is roughly OK | Butterick's "Point size", "Line length" chapters; [Inclusive Components — Notes (Heydon)](https://inclusive-components.design/) |
| Font pairing rules (heading/body, contrast vs harmony) | **L** | No — single-font system fonts means no pairing | [Modern Font Stacks (Dan Klammer)](https://modernfontstacks.com/), [Typewolf pairings](https://www.typewolf.com/) |
| OKLCH palette + accessible contrast across hover/focus/active/disabled states | **H** | **Yes** — every state is hand-tuned and inconsistent | [Evil Martians OKLCH](https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl), [APCA contrast](https://www.myndex.com/APCA/), [Open-Props colors](https://open-props.style/) — **fixable by skill #2 above** |
| Easing curves (Material `(0.4, 0, 0.2, 1)` vs Apple `(0.16, 1, 0.3, 1)` vs custom) | **L** | No — current animation surface is tiny | [Material Motion easing](https://m3.material.io/styles/motion/easing-and-duration), [Apple HIG Motion](https://developer.apple.com/design/human-interface-guidelines/motion) |
| Microcopy / UX-writing voice (Slatework's "friendly-but-precise" is uncodified) | **H** | **Yes** — every empty state, error message, button label is a one-off | [Strunk-and-White-for-UI = Apple HIG Writing](https://developer.apple.com/design/human-interface-guidelines/writing), [GOV.UK Style guide](https://www.gov.uk/guidance/style-guide), [MailChimp Voice & Tone](https://styleguide.mailchimp.com/voice-and-tone/) — **fixable by skill #5** |
| Empty / error / success state design conventions | **M** | Partly — some pages have them, others don't | [Refactoring UI (Wathan + Schoger)](https://www.refactoringui.com/), [emptystat.es](https://emptystat.es/) |
| Form anatomy: label position, validation timing, field grouping | **M** | Partly — contact form is OK, no other forms yet | [Adam Silver — Form Design Patterns](https://formdesignpatterns.com/), [GOV.UK design system forms](https://design-system.service.gov.uk/components/) |
| Mobile-first breakpoint choices (375 / 768 / 1024 / 1440 — why and when) | **L** | No — container queries (rec #3) reduce dependence on fixed breakpoints | [web.dev — Designing breakpoints](https://web.dev/articles/responsive-web-design-basics), [Bootstrap 5 breakpoint research](https://getbootstrap.com/docs/5.3/layout/breakpoints/) |
| Information architecture for a 15-tool toolkit (findability without heavy nav) | **H** | **Yes** — current nav doesn't scale; tools are increasingly buried | [Information Architecture (Rosenfeld + Morville, "Polar Bear book")](https://www.oreilly.com/library/view/information-architecture-4th/9781491913529/), [Nielsen Norman — Card sorting](https://www.nngroup.com/articles/card-sorting-definition/) |
| Conversion / activation funnel for a free tool with no pricing | **M** | Partly — launch hasn't shipped yet, no signal to optimize | [Lenny Rachitsky — Activation framework](https://www.lennyspodcast.com/) — **partly fixable by skill #7** |
| Print stylesheet conventions (worksheet PDFs) | **M** | Partly — worksheet generator currently outputs to print, untested across browsers | [Smashing — A Guide To The State Of Print Stylesheets](https://www.smashingmagazine.com/2018/05/print-stylesheets-in-2018/), [PagedJS](https://pagedjs.org/) |
| Slide design pedagogy (recognized "good lesson slide" pattern for the upcoming feature) | **H** | **Yes (next milestone)** — slideshow output is rec #18 and there's no installed pattern library | [Communicating with Data (Wong, WSJ)](https://www.amazon.com/dp/0470653728), [Presentation Zen (Reynolds)](https://www.presentationzen.com/), [TPRS / CI for language-pedagogy slide rhythm](https://www.fluentin3months.com/comprehensible-input/) |
| PDF typography / CMYK vs RGB / bleed / safe areas | **L** | No — Slatework's PDFs are screen-only, not print | Adobe PDF/A specs; mostly irrelevant unless a "print this worksheet professionally" feature ships |
| Email-template design (transactional + newsletter, dark-mode email) | **L** | No — Slatework is transactional-light; only contact form replies | [Really Good Emails](https://reallygoodemails.com/), [MJML](https://mjml.io/), [Litmus dark-mode guide](https://www.litmus.com/blog/the-ultimate-guide-to-dark-mode-for-email-marketers) |
| i18n design (RTL, language switching, translatable strings) | **M** | No — single-language launch — but ironic for a *language-tutor* tool | [W3C i18n](https://www.w3.org/International/), [GOV.UK Welsh-language pattern](https://design-system.service.gov.uk/), [RTL Styling 101 (Ahmad Shadeed)](https://rtlstyling.com/) |
| Brand voice consistency across pages | **H** | **Yes** — see microcopy gap above | Same as microcopy ref — **skill #5 covers this** |
| Onboarding / first-run UX | **M** | Partly — no tour exists; tools are hopefully self-explanatory | [Useronboard.com teardowns (Samuel Hulick)](https://www.useronboard.com/), [Growth.Design case studies](https://growth.design/case-studies) |
| Accessibility beyond WCAG-AA: cognitive load, dyslexia-friendly type, motion reduction | **M** | Partly — Atkinson Hyperlegible (rec #8) addresses dyslexia; cognitive load not audited | [Inclusive Components (Heydon Pickering)](https://inclusive-components.design/), [WCAG 2.2 cognitive accessibility](https://www.w3.org/WAI/WCAG22/Understanding/) |
| SEO structured-data taxonomy (`SoftwareApplication` vs `WebApplication` vs `Course` for a free interactive tool) | **H** | **Yes** — rec #12 says "ship now" but I'd be guessing the right `@type` | [Schema.org getting started](https://schema.org/docs/gs.html), [Google search-gallery types](https://developers.google.com/search/docs/appearance/structured-data/search-gallery) — **fixable by skill #3** (also: `HowTo` rich results were retired Sept 2023; skill knows, current install doesn't) |

**Net read.** The five **H-severity** items all map to skills #2, #3, #5 above plus the IA/lesson-slide gaps that no skill cleanly covers (those need books — Polar Bear, Presentation Zen, Wong's WSJ guide). The motion-related gaps that the install actually *does* cover are all **L-severity** for Slatework. Translation: the marketplace install is *very* well-equipped for animation work the site doesn't need, and *under-equipped* for color, copy, SEO, performance — exactly the items the launch review flagged.

## Recommended additions to the prioritized table

These slot into the top-of-file table as rows 22+. Ordered roughly by ROI given the May 7-14 window. Effort tags match the existing convention (XS = ≤30m, S = ≤4h, M = ≤8h, L = >8h).

22. **Install `taste-skill` (Leonxlnx) alongside existing `frontend-design`.** Effort: XS. Impact: mid. Verdict: ship now. Meta-skill that closes the "default Inter + rounded card" trap; the launch review found two pages where this exact slop slipped in. Free, plugin install only.

23. **Install `meodai/skill.color-expert` to drive recs #2 (OKLCH tokens) and #5 (Cloudflare Polish).** Effort: XS install + S to apply. Impact: high. Verdict: ship now. Without this, OKLCH conversion is me eyeballing six values per state across hover/focus/active/disabled — exactly the Severity-H gap above.

24. **Install `claude-seo` (or `schema-markup-generator`) before executing rec #12 (JSON-LD).** Effort: XS install + S to apply. Impact: high. Verdict: ship now. The skill knows `HowTo` was retired (Sept 2023), `Course`/`Dataset`/`SpecialAnnouncement` were retired (mid-2025), and what `@type` Google currently uses for free interactive tools. Without it, rec #12 ships valid-but-suboptimal markup.

25. **Install `addyosmani/web-quality-skills` before executing rec #4 (Lighthouse CI + Pa11y).** Effort: XS install + S to apply. Impact: high. Verdict: ship now. Maintained by Chrome's perf team, includes 150+ Lighthouse audit patterns. Replaces "set arbitrary budget numbers" with concrete pass/fail criteria.

26. **Install `content-designer/ux-writing-skill` and codify Slatework's voice in one document.** Effort: XS install + S to write the voice doc. Impact: high. Verdict: ship now. Currently every empty state, error message, and button label is a one-off. The skill enforces consistency; the voice doc tells it what to enforce.

27. **Adopt Butterick's *Practical Typography* + Refactoring UI as canonical references for type/spacing decisions.** Effort: 1 evening read. Impact: mid. Verdict: ship now. No skill covers vertical rhythm and `measure` per-context with the same authority. Read once, decide once, document the decisions in `styles.css` comments at the `@layer base` block.

28. **Pre-read Wong's *Communicating with Data* + Reynolds' *Presentation Zen* + a TPRS/CI reading for slide pedagogy before scoping rec #18 (slideshow milestone).** Effort: ~4h reading. Impact: high (slideshow milestone). Verdict: ship before #18 starts. The slideshow feature is the highest-leverage differentiator in the language-tutor niche; shipping with generic deck patterns would waste it. Lesson-slide pedagogy is the gap with no skill answer.

29. **Run a card-sort exercise (Optimal Workshop free tier or paper) on the 15-tool nav before nav redesign.** Effort: M. Impact: mid. Verdict: ship later — after launch settles. The IA gap is **H-severity** but the right time to fix it is when there's signal from real users, not now.

Recs 22-26 are install-and-apply (~6 hours total, mostly waiting for the skill to think). Rec 27 is a reading session. Recs 28-29 are scoped to specific upcoming milestones.

## Sources (skill audit additions)

- [Anthropic frontend-design SKILL.md](https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md)
- [Leonxlnx taste-skill](https://github.com/Leonxlnx/taste-skill), [Andrew Spittle review](https://andrew.ooo/posts/taste-skill-anti-slop-ai-frontend-review/)
- [meodai skill.color-expert](https://github.com/meodai/skill.color-expert)
- [AgriciDaniel claude-seo](https://github.com/AgriciDaniel/claude-seo), [Claude SEO site](https://claude-seo.md/)
- [addyosmani web-quality-skills](https://github.com/addyosmani/web-quality-skills)
- [content-designer ux-writing-skill](https://github.com/content-designer/ux-writing-skill)
- [coreyhaines31 marketingskills](https://github.com/coreyhaines31/marketingskills)
- [Page CRO skill](https://mcpmarket.com/tools/skills/page-cro-optimizer), [get-ryze CRO audit](https://www.get-ryze.ai/claude-openclaw-clawdbot-skills/cro-landing-page-audit)
- [Best Claude Code Skills 2026 — Firecrawl](https://www.firecrawl.dev/blog/best-claude-code-skills), [18 Best UI/UX Skills — Pillitteri](https://pasqualepillitteri.it/en/news/576/claude-code-skills-design-uiux-guide), [Top 10 Plugins — Firecrawl](https://www.firecrawl.dev/blog/best-claude-code-plugins)
- [ComposioHQ awesome-claude-skills](https://github.com/ComposioHQ/awesome-claude-skills), [VoltAgent awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills)

**Canonical references (no skill exists):**
- [Practical Typography — Butterick](https://practicaltypography.com/)
- [Refactoring UI — Wathan + Schoger](https://www.refactoringui.com/)
- [Modern Font Stacks — Dan Klammer](https://modernfontstacks.com/)
- [APCA contrast — Myndex](https://www.myndex.com/APCA/)
- [Inclusive Components — Heydon Pickering](https://inclusive-components.design/)
- [Form Design Patterns — Adam Silver](https://formdesignpatterns.com/)
- [GOV.UK Style guide](https://www.gov.uk/guidance/style-guide), [GOV.UK Design System](https://design-system.service.gov.uk/)
- [Information Architecture (Rosenfeld + Morville)](https://www.oreilly.com/library/view/information-architecture-4th/9781491913529/)
- [Communicating with Data — Wong (WSJ)](https://www.amazon.com/dp/0470653728), [Presentation Zen — Reynolds](https://www.presentationzen.com/)
- [Material Motion — easing & duration](https://m3.material.io/styles/motion/easing-and-duration), [Apple HIG — Motion](https://developer.apple.com/design/human-interface-guidelines/motion), [Apple HIG — Writing](https://developer.apple.com/design/human-interface-guidelines/writing)
- [Smashing — Print stylesheets in 2018](https://www.smashingmagazine.com/2018/05/print-stylesheets-in-2018/), [PagedJS](https://pagedjs.org/)
- [W3C Internationalization](https://www.w3.org/International/), [RTL Styling 101 — Ahmad Shadeed](https://rtlstyling.com/)
