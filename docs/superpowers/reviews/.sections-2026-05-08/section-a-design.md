# Section A — Design Taste & UI/UX — Slatework

**Score:** 8.7/10 — A genuinely distinctive, opinionated chalkboard-editorial system with a serif display face, mono captions, and hand-drawn underline. Real point of view. The drag is brand-mark inconsistency between the homepage and tool pages, a tool-page hero that's a flat H1+paragraph (no chalk system carries through), and a 60/40 grid that misuses negative space at the most important moment of the homepage.

## Sub-scores

| Sub-dimension | Score | Note |
|---|---|---|
| Hierarchy | 9 | Newsreader display + IBM Plex Mono captions + Sans body create three crisp tiers. Hero `clamp(3rem, 1.75rem + 6vw, 6.5rem)` headline does the work without screaming. |
| Spacing | 8 | Consistent rem-based scale, generous bucket gaps (`6rem` margin-bottom on bucket-section ≥900px), but tool pages have nothing between header and `<h1>` — they feel naked. |
| Typography | 9 | IBM Plex Sans + IBM Plex Mono + Newsreader (variable opsz) is a genuinely refined trio. Tabular figures on `.preview-rate` and `.threshold-callout` is the kind of detail most launch-stage sites skip. |
| Layout | 8 | 12-col asymmetric bucket grid with sticky meta column is well-architected on home. 60/40 hero grid splits awkwardly: preview widget ends up taller than copy column on first paint, creating a heavy right-side weight. |
| Cohesion | 7 | Forms, buttons, captions all reuse the same primitives. But `.preview` (contract) and `#worksheet` use Georgia in `styles.css:1834,1843` while everything else is Plex — intentional for print but breaks visual flow when on-screen. |
| Distinctiveness | 9 | The chalkboard concept is fully committed: SVG hand-drawn underline mask, chalk-dust grain SVG noise, chalk-dot loading dots, `// MONO CAPTIONS` everywhere, `chalk-write` clipped reveal. This is not generic. |
| Anti-slop | 9 | Zero purple gradients. No emoji icons (uses SVG strokes). No hero-centric Tailwind paragraph soup. No "Elevate / Unleash / Seamless" copy. The hero copy is concrete: "Tutor tools that don't waste your evening." |
| Cross-page consistency | 6 | **Brand mark differs between homepage (rx=4, fill=#1e293b, stroke=#cbd5e1) and every other page (rx=6, fill=#475569, stroke=#334155).** That's a real defect, not a nit. Footer copy also differs across pages. |
| Responsive behavior | 8 | Mobile-first; `clamp()` typography; 1-col → 2-col tile grid at 560px; bucket-section single column under 900px. No horizontal scroll risks I could find. Hero preview widget on a 375px phone will push the headline far down. |

## Findings

### Critical (ship blockers for May 12)

- **Brand SVG inconsistency between homepage and tool pages** — Evidence: `index.html:107-112` uses `rx=4 fill=#1e293b stroke=#cbd5e1 stroke-width=1.4`; every other page (`lesson-plan.html:38`, `cefr.html:38`, `marking.html:38`, `worksheet.html:38`, `rates.html:38`, `payments.html:38`, `about.html:24`, `404.html:22`, `privacy.html:25`, `contract.html`, `terms.html`, `tax.html`, `setup.html`, `insurance.html`) uses `rx=6 fill=#475569 stroke=#334155 stroke-width=2`. The `favicon.svg` matches the tool-page version. The HN/Reddit visitor lands on `/` and sees one logo, then clicks any tool and the logo subtly morphs. — Fix: pick one. The tool-page version (`#475569` slate-500 fill) reads better in the light header; the homepage version reads better against the dark hero. Solution: keep the dark-hero variant ONLY inside `.site-header.dark` and standardize every other instance to the favicon spec. Change `index.html:107-112` to use `fill=#1e293b stroke=#475569 stroke-width=2 rx=6` so it stays dark-hero-appropriate but matches the proportions everywhere else. Apply the canonical version to all 14 other pages by hand or via a single sed pass before launch.

- **Tool-page hero is unstyled compared to the homepage** — Evidence: `lesson-plan.html:42-46`, `marking.html:42-44`, `cefr.html:42-44`, `worksheet.html:43-45` — every tool page does `<main class="container"><h1>Tool Name <span class="tag">AI</span></h1><p>Tell it the language…</p>`. There's no chalk underline, no mono caption above the H1, no display-serif treatment. After arriving from the homepage's editorial hero, the tool page feels like a different product. — Fix: add a small consistent header pattern at the top of every tool's `<main>`:
  ```html
  <p class="mono-caption">// LESSON-PLAN &middot; AI</p>
  <h1>Lesson plan <span class="chalk-mark">generator</span></h1>
  ```
  CSS already supports it. Move the `<span class="tag">AI</span>` content into the mono-caption (`// LESSON-PLAN · AI`) and apply `.chalk-mark` to the noun in each H1 ("generator", "mapper", "calculator", "accelerator"). Costs 10 minutes per page, applies the chalk signature exactly where launch traffic lands.

- **Hero grid `60% 40%` collapses badly between 900–1100px** — Evidence: `styles.css:287-294` triggers `grid-template-columns: 60% 40%` at `min-width: 1000px`. The preview widget at 1000px is squeezed to ~360px wide with a 2-col preview-form (`.preview-form` becomes 2-col at `min-width: 480px`, line 403). Result: at 1000–1100px viewports, the preview-form's two select dropdowns become awfully tight (~150px each), and the headline `max-width: 16ch` (line 320) only consumes ~55% of its 60% column. The negative space sits between the headline and the widget like dead air. — Fix: bump the breakpoint where the 60/40 grid kicks in to `1100px` and tighten the gap from `4rem` to `3rem` between 1100–1280px:
  ```css
  @media (min-width: 1100px) {
    .hero-grid { grid-template-columns: minmax(0, 60%) minmax(360px, 40%); gap: 3rem; }
  }
  @media (min-width: 1280px) { .hero-grid { gap: 4rem; } }
  ```

### Important (should ship before launch if cheap)

- **`button` and `<a class="btn">` aren't visually distinct on tool pages** — Evidence: `styles.css:1052-1071` styles every `button` and `.btn` as the dark `var(--ink)` solid pill. The CEFR mode toggle (`cefr.html:47-48`) uses `.btn` for tab1 and `.btn.secondary` for tab2 — works. But on the worksheet result panel (`worksheet.html:99-100`), `Print worksheet` (.btn) and `Print answer key` (.btn secondary) are visually identical-weight; secondary is just a transparent variant of the same shape. There's no clear "primary action of this page" signal on tool pages. — Fix: standardize: every tool page's primary submit (`#go`, `#rules-go`, `#ai-go`) gets `class="btn btn-primary"` for the orange `var(--accent)` treatment that already exists in CSS (line 1098-1109). Currently those buttons inherit the `--ink` style, which makes the homepage CTA's orange feel like an unrelated visual accent. One-line change per tool page.

- **Tile hover state contradicts itself** — Evidence: `styles.css:665` says `tile:hover { border-color: var(--ink-muted); }`, then `styles.css:1588-1590` overrides with `tile:hover { border-color: var(--slate-green); }`. Two rules fighting; the second wins because of source order, but the intent is unclear. The `--slate-green` chalkboard hover is a beautiful detail (a real chalkboard is dark green, not black) — keep it. — Fix: delete the dead rule at line 665. While there, the `tile h3::after` chalk-underline grow-on-hover (line 644-666) is the signature interaction — make sure it survives. It does, just clean up.

- **`hero-display` `.chalk-mark` underline animation fires once on page load with a 1.25s hardcoded delay** — Evidence: `styles.css:1482` sets `animation: chalk-write 0.75s cubic-bezier(0.65, 0, 0.35, 1) 1.25s forwards`. The `1.25s` is timed to wait for the per-character `chalk-in` reveal (max delay ~35*20ms + 600ms = 1.3s). If the headline length changes (more words, longer first line), the underline either appears before the word finishes drawing, or after a noticeable pause. — Fix: the `page-index.js` already counts characters (line 23: `(i * 20) + 'ms'`). Have it set a CSS custom property like `el.style.setProperty('--chalk-mark-delay', (i * 20 + 700) + 'ms')` and reference `var(--chalk-mark-delay, 1.25s)` in the animation. Ten-line change, future-proofs the hero.

- **Newsletter form button has no loading state** — Evidence: `page-index.js:54` sets `status.textContent = 'Joining...'` but doesn't disable the submit button. Spam-clickers will trigger multiple POSTs. Visually, the button still looks idle while the request is in flight. — Fix: in the same handler, add `form.querySelector('button').disabled = true;` before the fetch and re-enable in a `finally` block. The CSS already handles `button:disabled { opacity: 0.5; cursor: not-allowed; }` (line 1080).

- **Footer copy varies between pages** — Evidence: `index.html:396-398` uses `Free tools for independent language tutors. <br/> Built by Darren · 2026`. Tool pages (e.g., `lesson-plan.html:106`) use only `Built by Darren · 2026` (no tagline). `about.html:58` matches the homepage version. — Fix: standardize on the homepage version everywhere; the extra tagline is one line that meaningfully reinforces what the product is on legal/utility pages.

- **`.preview-input` and `.preview-form` selects on the dark widget don't have the down-chevron arrow visible** — Evidence: `styles.css:423-434` styles `.preview-input` (which is applied to the country/pair/experience selects in `index.html:146,150,154`). On macOS Safari and most browsers, native `<select>` chevrons appear in the user-agent's color, which on a `var(--slate-deep)` background tends to be black — invisible. — Fix: add a custom chevron via SVG mask (the codebase already does this for FAQ disclosure at line 850-857; reuse the pattern). Or accept native rendering and add a 28px right padding so the arrow at least has air. Test in Safari on macOS — Chrome on Windows displays it OK.

- **404 page is too sparse for the editorial system** — Evidence: `404.html:26-30` is `<h1>Page not found</h1><p>That URL doesn't match…</p>`. The "The slate is clean." line is good — it's a brand callback. But the page misses an opportunity for a chalk-underline on "clean" or to display the H1 in the Newsreader display face. — Fix:
  ```html
  <p class="mono-caption">// 404 &middot; OFF THE BOARD</p>
  <h1 class="display">Page <span class="chalk-mark">not found</span></h1>
  <p class="lead">That URL doesn't match any tool we ship. The slate is clean.</p>
  ```
  No new CSS. Two-minute change.

- **Bucket icons feel a touch light against bucket headlines** — Evidence: `styles.css:1528-1539` — `.bucket-icon` is 44px-52px with `stroke-width=1.5` (`index.html:186, 219, 257, 286`). The Newsreader 600-weight bucket headline at `clamp(1.75rem, 1.25rem + 2vw, 3rem)` (line 562) carries a lot of optical weight; the 1.5-stroke icon feels under-anchored next to it. — Fix: bump `stroke-width` to `1.75` in the four icon SVGs, or use the existing color and just nudge size to `52px` / `60px` desktop. Optional polish.

### Nice-to-have (post-launch polish)

- **Mono captions use `// PREFIX` consistently — but a few are missing the trailing `//` close-comment that some editorial systems use** — Evidence: throughout. Decision: the open-only `// CAPTION` is fine and consistent. Skip.

- **Hero `min-height: 88vh` at desktop** — Evidence: `styles.css:236-241`. On a tall monitor (1440 height) this leaves a lot of empty hero. The headline `max-width: 16ch` (line 320) caps the copy column visually. The asymmetric reveal is intentional, but consider `min-height: clamp(640px, 88vh, 880px)` to avoid runaway hero height on 4K displays.

- **`#worksheet` and `#answer-key` switch to Georgia for printable feel** — Evidence: `styles.css:1841-1845`. Intentional and correct for print/PDF output. On-screen, it's a jarring stylistic break from Plex Sans. Consider a `@media screen` override that keeps them in `var(--sans)` and only applies Georgia inside `@media print`. Low priority — the current behavior signals "this is the printable thing" which has its own clarity.

- **`.threshold-callout` border-left of `4px solid var(--chalk-accent)` (line 1266)** is a beautiful detail. Worth duplicating to other "important" callouts on tax/insurance/setup pages — currently the `.privacy-notice` (line 1246-1257) uses a `4px` left border but in `var(--ink-muted)` which feels weaker than it should. Consider variants: `.privacy-notice.warn` with `var(--accent)`, `.privacy-notice.ok` with `var(--ok)`.

- **Hero "Reveal the story →" link uses `&rarr;` HTML entity** — Evidence: `index.html:136`. Consistent with rest of site. The `&darr;` in "Browse the toolkit ↓" (line 135) is a charming choice. Both render fine.

- **Drop-zone has-file checkmark uses literal `"✓"` character** — Evidence: `styles.css:1647`. This is technically a Unicode glyph, not an emoji-icon, and it's used in `::before` content. Renders consistently across platforms. Keep — but note it's the single non-SVG visual element. Acceptable.

- **`.maker p` italic Newsreader at clamp(1.25rem, 1.05rem + 0.85vw, 1.625rem) (line 945-955)** is beautiful and rare on launch-stage indie sites. Wouldn't change a thing.

## Ship-now top 3 (effort × impact)

1. **Standardize the brand SVG across all 15 pages** — effort: S — impact: L — every visitor will see the inconsistency the first time they click from `/` to a tool. It's a 2-minute search-and-replace on `<svg width="22" height="22" viewBox="0 0 64 64" aria-hidden="true">` blocks across 14 HTML files. Highest perceived-quality / effort ratio in this audit.

2. **Add the chalk-mark + mono-caption pattern to tool-page H1s (5 tool pages: lesson-plan, marking, worksheet, cefr, rates)** — effort: S — impact: M — this is the moment Reddit/HN visitors arrive at the "real product" after the homepage hero. Right now they hit a plain H1+P that breaks the editorial promise. Two HTML lines per page, no CSS changes, the chalk system already exists.

3. **Apply `btn-primary` (orange accent) to every tool page's primary submit button** — effort: S — impact: M — currently every tool's "Generate", "Mark", "Assess", "Place the student" button uses the default dark-ink button. The `.btn-primary` orange (`#d97706`) is reserved for the homepage CTA and newsletter Join. Activating it on tool pages aligns the visual call-to-action across pages and reinforces "this is the action you came here to do."

## What Slatework does well (in this dimension)

- **Genuinely distinct typographic system.** IBM Plex Sans + IBM Plex Mono + Newsreader (variable optical-size axis) is a real choice. Most launch-stage sites converge on Inter+Geist. The `font-variation-settings: 'opsz' 72` on hero display (`styles.css:316`) and `'opsz' 36` on italic body (`styles.css:951`) is rare-air typography craft.

- **Hand-drawn chalk underline via SVG mask + CSS clip-path animation.** The `.chalk-mark::after` pattern (`styles.css:1466-1499`) draws itself left-to-right with two layered SVG strokes (a thicker primary at opacity 1, a thinner secondary at opacity 0.5) — this is a custom, signature interaction that no Tailwind site has. Same trick used for tile h3 hover (line 644-666). Coherent design language.

- **Chalk-dust grain on dark surfaces.** SVG `feTurbulence` noise applied as a repeating background (`styles.css:1567-1583`) gives every dark band (`.hero-slate`, `.newsletter`, `.faq`, `.country-band`, `.threshold-callout`, `.site-footer`) a subtle texture. Most sites skip this. It's the difference between "dark section" and "chalkboard section."

- **Slate-loading panel for AI tools** (`styles.css:1157-1238`) — bouncing chalk-dot ellipsis with a chalkboard-grain texture, replacing the generic "Generating…" spinner. Brand-consistent loading state is a hallmark of polish.

- **Honest, concrete copy.** Hero: "Tutor tools that don't waste your evening." Maker section: "Built quietly in 2026 for the tutors and teachers who already do the work." FAQ: "Use ChatGPT for open-ended thinking. Use Slatework when you need the same shape of output repeatedly." This is not LLM-shaped copy.

- **Reduced-motion respected.** `styles.css:1429-1445` and `page-index.js:7` both check `prefers-reduced-motion` and disable the headline reveal, chalk-write, chalk-dust, and pulsing dot. Most launch-stage indie sites skip this.

- **Tabular figures on numeric output.** `font-variant-numeric: tabular-nums` applied to `.preview-rate` (line 457), `.threshold-callout strong` (line 1289), and via utility class `.tabular` (line 1559). Numbers don't jiggle as inputs change. Detail-level craft.

- **Accessible focus rings preserved everywhere.** `outline: 2px solid var(--ring)` on inputs, buttons, drop-zones, FAQ summaries — never removed, properly offset. WCAG-compliant without performative compliance theatre.

- **No analytics, no tracking, no cookie banner.** Privacy posture matches the visual minimalism. The product walks the talk.
