# Section A — Visual / Design Taste / UI-UX (2026-05-09)

**Score:** 9.1/10 — Slate aesthetic still cohesive and distinctive, but Plan-1 (profile) and Plan-2 (slideshow) have layered new chrome onto lesson-plan.html that pushes the form closer to "AI-app vertical stack" than the original editorial-newsroom feel; slideshow preview is functional but undersells the slate brand. (Down from 9.5 in 2026-05-08.)

## Sub-scores
| Sub-dimension | Score | Notes |
| --- | --- | --- |
| Hierarchy | 9 | Mono-caption + chalk-mark display headline + lead is still the strongest hook. New profile-mount block above the lead breaks the eyebrow-headline-lead rhythm on lesson-plan / worksheet / marking. |
| Typography | 9.5 | IBM Plex Sans + Plex Mono + Newsreader still works. `font-variation-settings: 'opsz' 72` on the hero display is a subtle premium touch; Newsreader as the maker italic remains class-leading. No drift. |
| Cross-page consistency | 9 | Header, footer, mono-caption, chalk-mark, button system, drop-zone, FAQ all align. Mild divergence: lesson-plan + worksheet + marking now stack a profile-mount block where cefr / contract / tax do not (or do partially), creating asymmetric "above-the-form" zones. |
| Distinctiveness | 9.5 | Still recognisably itself: chalk-mark hand-drawn underline, `// MONO //` captions, slate-deep + chalk palette, Newsreader italic for the maker quote. Not generic AI-app territory. |
| Anti-slop | 9.5 | Zero purple gradients, zero neon, zero "Elevate / Seamless / Unleash" copy. Hero is asymmetric (60/40 with live preview widget on the right), not centered marketing-blob. Pure off-black ink (#020617), warm orange (#d97706) accent, restrained. |
| Color/state | 9 | Tile hover uses --slate-green for chalkboard depth — clever. Disabled buttons use surface-2 + ink-muted (not opacity hack). Error state uses border + box-shadow. One small issue: `details.cefr-quick-check[open] > summary` color: var(--ink) plus the level-mute background can flatten readability vs collapsed state. |
| Form clutter (lesson-plan post-Phase-C) | 7.5 | The lesson-plan vertical stack is now: privacy-notice → tutor-strip → student-strip → save-link → noscript → 2x section-row (4 fields) → goal textarea → exam input → adjust-for-today expander → submit. That's 4 distinct "above-form" rows of chrome before the user reaches a single field. The strips are visually similar (both are surface-2 cards) which compounds the wall-of-rectangles feeling. |
| Slideshow preview polish | 7 | Functional but stark. The shell uses two ghost-buttons (←, →) plus a primary "Download .pptx" — the export button visually dominates the navigation. Stage min-height 320px with 1.5rem padding plus 1fr 1fr text/media grid → small Twemoji images stranded in a generous void. Needs more visual scaffolding (slide-frame aesthetic, page indicator dots, slate texture echo). |
| Profile editor modal polish | 8.5 | Solid: max-height clamp, `dialog::backdrop` rgba(2,6,23,0.55), explicit dark-mode override at line 2420. Audience profile collapsed in `<details>` is clean. Two minor issues: action buttons use the page-default ink button (which is correct ink-on-light) but the Delete profile link is `--err` red and sits left-aligned via margin-right:auto — that's a destructive-action-prominence pattern that some users will find risky. |
| Dark mode | 9 | Comprehensive: light region tokens flipped at line 2087, button bg pinned to slate-board so default buttons stay readable, brand SVG rect re-tinted, contract/worksheet print preview pinned to "paper" tone (#fafaf7) so previews don't go inverse-paper, dialog backdrop bumped to 0.65. One miss: tile hover border `--slate-green` is set on light theme; in dark mode the same green-on-slate-deep is barely visible (3.5:1 ish). |

## Findings (severity-classified)

### Critical — ship-blocker for Reddit/HN launch
None. Site is shippable as-is.

### Important

- **Lesson-plan above-the-form chrome stack creates "wall of grey rectangles"** — `lesson-plan.html:106-112` plus the rendered tutor-strip + student-strip + save-link from `profile-ui.js:78-148`. All three use `--surface-2` background + `--line` border + same radius. Visual side effect: reader scans 3 nearly-identical horizontal cards before reaching the first input. Fix:
  - Either visually differentiate (tutor-strip → no border, just an inline `// YOU //` caption + name; student-strip keeps the card; save-link becomes a true text link with chalk-underline hover, not a dashed-border button)
  - OR collapse to single row when both tutor and student exist: `[You: tutor in UK · Student: Lily (B1, Spanish) · Edit]` as one mono-caption strip
  - 30-min CSS-only fix; no JS changes needed.

- **Slideshow shell underuses the slate aesthetic** — `slideshow-render.js:99-117` and `styles.css:2462-2542`. Current shell is white surface + grey border + grey-text controls. Slatework's signature is dark-slate atmospheres for "AI is happening here" moments (slate-loading, threshold-callout, hero, FAQ band). The slideshow — the headline new feature — is the only AI-output zone that doesn't borrow the brand atmosphere. Fix:
  - Add `background: linear-gradient(180deg, var(--slate-board), var(--slate-deep))` to `.slideshow` root, lift slide text to `--chalk`, slide-duration pill stays surface-2/ink-muted but with chalk-faint border. Keep export button orange on dark; the prev/next chevrons inherit chalk.
  - This pulls the slideshow into the same "you're working on the chalkboard" frame as the loading state and the threshold callout. ~45-min refactor.

- **Slideshow nav buttons use undefined `.btn-ghost` class** — `slideshow-render.js:108-109` references `class="btn btn-ghost"` but `.btn-ghost` is not defined anywhere in `styles.css`. The buttons therefore render as default ink-filled `.btn` (heavy black rectangles) right next to the orange primary "Download .pptx" — three high-emphasis buttons in a 3-button toolbar. Fix:
  - Either add `.btn-ghost { background: transparent; border-color: var(--line); color: var(--ink-muted); }` to styles (and a dark variant inside `.slideshow--classroom` / dark-shell)
  - Or replace with `.btn.secondary` which already exists. 5-min fix.

- **Slideshow stage feels under-designed at small slide counts** — `styles.css:2492-2497` sets `min-height: 320px` on `.slideshow-stage` with 1fr 1fr text/media grid. With Twemoji images at max-height 220px stranded inside the right column, the slide reads as a debug interface, not a deck preview. Fix:
  - Add a paper/slate slide-frame: subtle inner border (`box-shadow: inset 0 0 0 1px var(--line), 0 8px 24px -12px rgba(2,6,23,.18)`), `border-radius: var(--radius-md)`, slide-margin so the slide visually separates from the controls.
  - Add page indicator dots below the stage (8 small chalk-faint circles, current one filled with chalk-accent) — tiny element but turns "slide 3 / 8" counter into an at-a-glance position.
  - 1-hr CSS-only.

- **Profile editor "Delete profile" placement is risky** — `profile-ui.js:307-316` creates the delete link as the leftmost action in `.profile-editor-actions` with `margin-right: auto`. It's a `.btn-link` not a real destructive button, and the `confirm()` dialog is the only safety. Risk: muscle-memory click on the leftmost button when intending Cancel (which is button #2). Fix:
  - Move delete to a fully-separate row above the action footer with a `Trash` icon + "Delete this profile" label and a different visual treatment (red border + transparent bg, not a `.btn-link`).
  - OR keep current position but add a 2-step confirmation in-dialog (replace the action row with "Are you sure? This deletes Lily's profile permanently." + Confirm/Cancel) instead of relying on `confirm()`.
  - 20-min JS-only fix.

- **Tile hover green borders disappear in dark mode** — `styles.css:1646-1648` sets `.tile:hover` border to `--slate-green` (#1a3a32). On dark theme the page bg is `--bg = #0f172a` (slate-deep-ish), so a #1a3a32 border on a #1e293b tile (which is `--surface` in dark mode) — both are dark-greens-near-slate — gives roughly 1.4:1 contrast. The hover signal effectively vanishes. Fix:
  - Inside `@media (prefers-color-scheme: dark)`, override `.tile:hover { border-color: var(--chalk-green); }` (#86efac) — the named-pair light token already exists. 1-line fix.

### Nice-to-have

- **Hero "live preview widget" is the strongest distinctive element on the homepage** — `index.html:178-207`. It's the one card that says "this isn't a content site, this is a tool." Consider giving it an even-stronger frame (subtle outer chalk-stroke border like the chalk-mark underline?) so it reads as the centrepiece. Currently the preview-widget border is just `--chalk-faint` dashed-effect-via-opacity which fights the hero's natural focus.

- **Bucket-meta count + caption ordering is inverted from typical convention** — `index.html:230-232` reads: H2 → `// 3 tools` → italic description. Most editorial pages put the count under the description as a stat, or fold it into the H2 line. Current order works but creates a slightly choppy 3-line meta block. Minor; defer.

- **`.slideshow-slide-duration` pill uses `border-radius: 999px` (line 2520)** — only place in the codebase using a true pill. Everything else uses `--radius-sm` (4px) or `--radius-md` (6px). Either re-use the existing system (4px chip) or make pill-radius an explicit token (`--radius-pill: 999px`) and reach for it deliberately (e.g., the `dot` indicator in mono-caption could become a pill too). Token-system hygiene; 5 min.

- **`.country-band` text reads `// COUNTRY-AWARE FOR US · UK · CA · AU · NZ · IE · HK`** — `index.html:213-215`. The `//` prefix + middot + uppercase mono is great signature, but on mobile (375px) the row word-wraps awkwardly between "COUNTRY-AWARE" and "FOR" or breaks the 7-flag list. Minor — consider `// COUNTRY-AWARE //` on its own line + flags row beneath at <640px.

- **Newsletter "Slow, occasional notes — never spam"** — `index.html:368`. The tone is the one place where "Anti-slop" copy is slightly pushed; it's borderline cute. Not a problem, just call out for self-awareness.

- **Bucket icons** (`index.html:224-228, 257-261, 295-300, 324-330`) — currently 4 hand-rolled SVGs at 32×32 viewBox. They're charming but inconsistent in stroke weight; clipboard (1.75) vs speech bubble (1.75) vs stack (1.75) vs document (1.75) is consistent on paper but the "stack" cylinders icon visually reads as thicker because of the `ellipse` strokes. Optional polish; not a launch issue.

- **Adjust-for-today expander** — `styles.css:2393-2408` uses `border: 1px dashed var(--line-strong)`. The cefr-quick-check uses solid `border: 1px solid var(--line)`. Slideshow audience uses `flex` no border. Three different treatments for "this is a secondary control." Pick one (suggestion: dashed-border = optional/skippable; solid = primary inline form group; no border = just-a-control) and apply consistently across the lesson-plan / cefr / marking trio.

## Top 3 ship-now (effort × impact)

1. **Add `.btn-ghost` class OR swap slideshow nav to `.btn.secondary`** — 5 min, fixes a CSS bug that's quietly making the slideshow shell look heavy. Pure win.
2. **Slideshow shell to slate aesthetic + page-indicator dots + slide-frame** — ~1.5 hr CSS-only. The slideshow is the marquee new Plan-2 feature; right now it visually undersells what is technically impressive (live audience switching, .pptx export, Twemoji bundling). Pulling it into the slate frame turns it from "demo viewer" to "this is the lesson on a chalkboard." Biggest single visual upgrade available.
3. **Lesson-plan above-form chrome consolidation** — 30 min CSS, possibly 15 min JS to inline render. Reduces 3 grey-rectangle rows above the form to 1 mono-caption strip. Restores the editorial rhythm that makes Slatework distinctive vs every other AI-tool page on the internet.

## What Slatework still does well

- **Editorial-newsroom hierarchy** — mono-caption (`// LESSON-PLAN · AI`) → chalk-mark headline (`Lesson plan generator.`) → italicised lead → tool. This rhythm is unmistakable and works identically on lesson-plan / marking / cefr / contract / 404. Genuinely distinctive in a market awash with `<h1>Welcome to ToolName</h1>` + 3-column feature grid.
- **Color discipline** — single warm orange accent (#d97706, S<80%), pure neutrals (slate-* + chalk-*), and the chalk-accent yellow (#fde68a) reserved for the chalkboard zone only. Zero purple, zero neon, zero "AI lila."
- **Typography hierarchy via opsz axes** — `font-variation-settings: 'opsz' 72` on hero, `'opsz' 60` on bucket display, `'opsz' 36` on the maker italic. This is the kind of detail that signals "designed by someone who cares" without screaming.
- **Slate-loading state** — `styles.css:1163-1248`. The chalkboard texture + chalk-bounce dots + "Don't refresh" caption replaces the bare "Loading…" with an honest, branded waiting moment. Best loading state I've seen on any indie AI tool.
- **Strict-CSP-first JS** — `profile-ui.js:55-66` hand-rolls a `el()` factory specifically to avoid `innerHTML`. The CSP isn't just a header; it's an architectural choice. This shows up in code quality everywhere.
- **Responsive bucket-section grid** — `styles.css:553-562` switches 1-col → 12-col with sticky bucket-meta at >900px. The asymmetric 5/13 split for tile grid is a small thing that consistently reads "this isn't a Bootstrap site."
- **Chalk-mark underline reveal** — `styles.css:1467-1509` with `--chalk-mark-delay` set dynamically by JS based on character count so the underline always fires after the last character. That's a level of motion-design care most landing pages skip.
- **Dark mode is shipped, not implied** — explicit `@media (prefers-color-scheme: dark)` at line 2087 that re-pins button bg to `--slate-board` instead of trusting flipped tokens. Brand SVG re-tinted for visibility. Print previews pinned to paper tone. This is what "designed light/dark together" actually looks like.

---

**File path:** `C:\Users\darre\slatework\docs\superpowers\reviews\.sections-2026-05-09\section-a-design.md`
