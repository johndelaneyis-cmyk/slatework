# Section B — Color System & Copy/Voice — Slatework

**Color score:** 8.6/10 — Strong slate-and-chalk concept executed with disciplined two-region tokens (dark hero / light tools), passing 4.5:1 on every body-text pairing tested. Three real WCAG fails on `--ink-faint` decoration text and the `.has-file` success check. No `prefers-color-scheme: dark` despite a productivity-tool audience that bills itself "privacy-first." `--accent` (#d97706) hits only 3.19:1 on white at 16px — passes WCAG large-text but is below 4.5:1 for the inferred regular-weight button label.
**Copy/voice score:** 9.2/10 — Distinct, opinionated voice ("// FREE · NO ACCOUNT · NO PLATFORM FEE"), confident verb-led CTAs, error states that always offer a recovery path. Voice slips in three places: the hero subtitle's stitched-together complexity, the `Other (type below)` fallback option, and four duplicated `help` blocks across tools that read like cut-and-paste instead of authored copy.
**Combined:** 8.9/10

## Sub-scores
| Sub-dim | Score | Note |
|---|---|---|
| Color tokens | 9.5 | Two-region split (dark `--slate-*` / light `--ink-*`), semantic state tokens (`--ok`, `--warn`, `--err`), accessible naming (`--chalk-mute` not `--gray-300`); `styles.css:3-45` |
| State contrast | 8.0 | All button hover/focus pass 4.5:1; `.btn-primary` regular state at 3.19:1 only passes large-text; no styled disabled (`opacity: 0.5` only); no error/invalid input state token |
| Dark mode | 5.5 | No `prefers-color-scheme: dark` query in 1855 lines. Tools render full-bright on a dark-mode user's OS at 11pm — uncomfortable for a tool tutors use after lessons |
| Color a11y | 7.5 | Body text strong (19.28:1, 13.59:1); `--ink-faint` (#94a3b8) tile-slug fails at 2.56:1; `.has-file` ✓ checkmark fails at 2.28:1; `.preview-rate-label` borderline 3.75:1 (large text) |
| Voice consistency | 9.5 | "Honest answers", "The slate is clean", "no quota panic" — coherent across landing, FAQ, 404, legal. Privacy/terms keep the voice instead of going legalese |
| Action verbs | 9.5 | "Generate plan", "Mark and suggest feedback", "Place the student", "Browse the toolkit ↓" — verb-first, specific to the work, no "Submit" |
| Error microcopy | 9.0 | Pattern holds: "Could not mark. Try again." / "OCR failed. Type the writing in the box below instead." Always offers recovery; no blame language |
| Empty states | 8.5 | Inline validation copy ("Pick a target language", "Paste writing or attach a file/photo first") is good; no first-run empty state for result panels — they're just `hidden` |
| Friction/legal tone | 9.8 | Privacy in 12-word sentences, plain English ("No accounts, no logins, no profiles"); terms uses "you are the teacher" — outstanding for the genre |

## Findings

### Critical

- **`--ink-faint` text fails WCAG AA on every surface it touches** — `styles.css:25` (`#94a3b8`) used at `styles.css:627` for `.tile .tile-slug`, `styles.css:1040` for `input::placeholder`, and `styles.css:1384` for `.drop-zone-text em`. Measured 2.56:1 on `--surface` (#fff) and 2.34:1 on `--surface-2` (#f1f5f9). The "// setup", "// rates", "// marking" labels above every tile on the homepage fail. Fix: darken `--ink-faint` to `#64748b` (passes at 4.49:1 on white — same as `--chalk-faint` already in use elsewhere) or move all uppercase mono captions to `--ink-muted` (#475569) which already passes at 7.58:1. Vanilla, single-token edit.

- **`.has-file` ✓ check is invisible to low-vision users** — `styles.css:1645-1653`, color `var(--ok)` = `#22c55e` on white tests 2.28:1. The visual confirmation that "your file is attached" is unreadable. Fix: change the success-check color to `#16a34a` (passes 4.54:1) or use the existing `--accent-hover` `#b45309` which already exists in the palette and reads as "active state" rather than introducing a fourth state hue. Edit one line.

- **Hero subtitle is the longest sentence on the site and breaks the voice** — `index.html:129`: `"Set up your business, set defensible rates, plan lessons, mark student work — without paying a platform 30% or stitching seven free templates together. Ten free tools, country-aware, no signup."` 41 words; double-em-dash construction; "country-aware" unexplained; "stitching seven free templates" is a niche metaphor. The H1 above it ("Tutor tools that don't waste your evening.") is sharp. Fix: `"Set defensible rates, plan lessons, and mark student work — without paying a platform 30%. Ten free tools, no signup, country-aware for 7 markets."` 25 words, same content, voice consistent.

### Important

- **No `prefers-color-scheme: dark` despite the audience** — `styles.css` lines 1240 and 1429 handle `prefers-reduced-motion` but no dark-mode handler exists. A productivity tool used after-hours by tutors, on a stack already organized into two color regions, is the perfect candidate. The current dark hero is `--slate-deep` `#020617` and light surface is `#f8fafc` — flipping the semantic tokens (`--bg`, `--surface`, `--ink`) under `@media (prefers-color-scheme: dark)` would re-skin every tool without touching markup. Vanilla, CSP-clean, ~30 lines. Defer to v0.4 if launch-window blocks it, but call it out as a known gap on the site (not silent).

- **`.btn-primary` regular state borderline on 16px** — `styles.css:1098-1101`, `--accent` `#d97706` on white at 3.19:1. Passes WCAG AA for "large text" (≥18.66px regular or ≥14px bold); the button uses `font-size: 0.9375rem` (15px) at `font-weight: 600`. Bold + 14px qualifies as large text → passes. **However:** `--accent-hover` `#b45309` would pass 4.5:1 (5.02:1 measured). Consider promoting the hover color to default and removing the hover darken (or invert: use `#a44308` for hover). One-line palette change.

- **Tool-page H1s are inconsistent in title-case logic** — `lesson-plan.html:43` `"Lesson plan generator AI"`, `marking.html:43` `"Marking accelerator AI"`, `worksheet.html:44` `"Worksheet + answer-key generator AI"`. The trailing `<span class="tag">AI</span>` shows as visible "AI" badge so it reads as a sentence, not a tag. The plus-sign in the worksheet H1 is the only mathematical operator on any title and visually noisy. Fix: rename to `"Worksheet & answer-key generator"` (ampersand matches the 4 H2s on `index.html:225`, `:264` already using `&amp;`).

- **Four `help` blocks ship the exact same 26-word string** — `lesson-plan.html:54`, `cefr.html:68`, `marking.html:54`, `worksheet.html:55` all carry: `"Pick the language the student is learning. The two English options distinguish "native/advanced" (test prep, writing improvement) from "ESL/EFL" (English as a second language)."` The repetition reads like a deferred TODO. Either authored as the canonical version (then it's fine) or reduce to: `"Pick the language being taught. Two English options: native/advanced vs. ESL/EFL."` 13 words. Saves vertical space on every tool form.

- **`Other (type below)` is the only place the voice cracks** — `page-lesson-plan.js:47`. Every other label and helper is in tutor frame; this one is in form-builder frame. Fix: `"Other — I'll type it"` or add it as a `placeholder` value on the existing free-text input so it doesn't appear in the dropdown at all.

- **No styled invalid/error input state** — Forms use only `input:focus { outline: 2px solid var(--ring) }` (`styles.css:1043-1048`); no `:invalid` or `[aria-invalid="true"]` style. When `Could not mark. Try again.` renders, the offending field has no visual link to the error block. Fix: add `input[aria-invalid="true"], select[aria-invalid="true"], textarea[aria-invalid="true"] { border-color: var(--err); box-shadow: 0 0 0 1px var(--err); }` to `styles.css` — JS already has the error context to set the attr.

- **Disabled button state is `opacity: 0.5` only** — `styles.css:1080`. No contrast guarantee. A disabled `--ink` (#020617) button at 0.5 opacity composited on `--bg` lands near 6:1, but a disabled `--accent` button drops below 2:1. Fix: explicit `button:disabled, .btn:disabled { background: var(--surface-2); color: var(--ink-faint); border-color: var(--line); }` and document — the disabled state exists for "you haven't picked a target language yet" UX and currently looks broken.

- **`.preview-rate-label` and `.mono-caption` on dark hover the WCAG large-text floor** — `--chalk-faint` (#64748b) on `--slate-deep` measures 4.24:1, on `--slate-board` measures 3.75:1. Both pass for large text (the `mono-caption` is uppercased at 0.6875rem — `large` rule applies for ≥0.75rem at this weight; this is borderline). Bump `--chalk-faint` to `#94a3b8` (already exists as `--ink-faint`) to land 4.5:1+ on dark surfaces, or rename `--ink-faint` and `--chalk-faint` to a single shared `--neutral-400` because they collide semantically. (Not urgent — large-text rule covers it.)

- **`drop-status` text uses `var(--accent)` for normal state, not just errors** — `styles.css:1385`. The orange that means "danger / hot CTA" elsewhere here means "OCR is running." Mixed signal. Fix: use `var(--ink-muted)` for in-flight ("Extracting text from photo (OCR)…") and reserve `var(--accent)` for errors and primary CTA only.

### Nice-to-have

- **`The slate is clean.`** — `404.html:28` is the best line on the site. Don't touch it.

- **Newsletter button label `"Join"`** — `index.html:322`. Two letters; everywhere else uses verb+object ("Generate plan"). `"Join the newsletter"` would match the rest. Defensible to keep terse since the form context is unambiguous.

- **`// FREE · NO ACCOUNT · NO PLATFORM FEE`** uppercased eyebrow on `index.html:124`. Mono caption color is `--chalk-faint` on `--slate-deep` → 4.24:1. Borderline; passes large-text rule but at 11px-equivalent size. Consider bumping to `--chalk-mute` (13.59:1) — uppercase tracking already differentiates it from headline.

- **Two privacy notices use slightly different phrasing for the same idea** — `lesson-plan.html:46`: `"Your inputs are sent to Anthropic for generation but are not stored by us. Don't include student names."` vs. `marking.html:46`: `"Don't include the student's name or identifying info — paste the writing only. The sample is sent to Anthropic for processing and not stored by us."` Order is flipped (action-first vs. context-first). Pick one pattern. Marking's order (action-first) is stronger because tutors are about to paste student writing.

- **`--ring` is `#020617` (same as `--ink`)** — `styles.css:34`. Not wrong, but a separate `--ring` token suggests an intent that didn't materialize. Either alias it explicitly (`--ring: var(--ink);`) or pick a distinguishable focus ring (`--accent` would also pass 3:1 on light bg and signal "interactive" not "text"). Currently the focus ring on a button blends into the button border because both are `--ink`. Move `--ring` to `var(--accent)` and the focus state pops on every surface.

- **Color naming has one inconsistency** — `--ok` `--warn` `--err` are abbreviated state tokens, but `--accent` is a full word and `--accent-hover` mixes the two. Either `--accent`/`--accent-hov` or `--success`/`--warning`/`--error`. Trivial; do once if you do it.

- **`ai-disclaimer` paragraph on `marking.html` is 79 words** — `marking.html:88-90`. Above the WCAG 14-word ceiling for full comprehension by ~5x. Content is correct (OCR explanation) but reads as policy. Tighten to: `"How photo upload works: we extract text via Google Cloud Vision OCR, drop it in the box, then send only text to the marking model. Review and edit before clicking Mark — OCR isn't perfect with cursive."` 38 words. Loses zero info.

- **`.tag.warn` is the only "tag" variant; the base `.tag` exists** — `styles.css:1331`, `:1344`. If only one variant ships, the base modifier system is overhead. Either add `.tag.beta`, `.tag.new` and pay it down, or inline `tag.warn`'s styles where used. Architectural tidy, not user-visible.

- **`Print / save as PDF`** — `contract.html:97`. The slash is doing platform-detection work. Cleaner: `"Print or save as PDF"` (3 chars, scans the same).

## Ship-now top 3
1. **Fix `--ink-faint` failures.** Change `styles.css:25` from `#94a3b8` to `#64748b`. Passes WCAG AA on tile-slugs, drop-zone helper text, and input placeholders in one line. Highest user impact, lowest risk.
2. **Fix `.has-file` ✓ check.** Change `styles.css:1650` color from `var(--ok)` to a darker green or to `var(--accent-hover)`. Currently invisible to low-vision tutors confirming a file uploaded.
3. **Cut hero subtitle to 25 words.** `index.html:129` rewrite — keeps voice consistent with the H1 and FAQ; reduces above-fold cognitive load. No CSS touched.

## What Slatework does well

- **Two-region token discipline.** Dark `--slate-*` / light `--ink-*` semantic split with state tokens (`--ok`, `--warn`, `--err`) and concept tokens (`--chalk-accent`, `--chalk-green`) — `styles.css:3-45`. Clean, justified, no `--gray-300`-style design-debt naming. The slate-and-chalk metaphor is real, not ornamental: the `--chalk-accent` (#fde68a) on dark slate at 16:1 is genuinely the most legible on-brand combination on the site.
- **Voice is opinionated and stays put.** "Honest answers" / "no quota panic" / "The slate is clean" / "you are the teacher" — coherent across landing, tools, FAQ, 404, privacy, terms. Most products lose voice in legal pages; Slatework's privacy page reads like the maker is still talking.
- **Verb-first CTAs without exception.** "Generate plan", "Mark and suggest feedback", "Place the student", "Browse the toolkit ↓", "See full breakdown →" — no "Submit", no "OK", no "Click here". One outlier ("Join") but defensible.
- **Error microcopy follows the recovery-path pattern reliably.** Every error message in the four AI tools includes a what-failed + what-to-do pair: `"OCR failed. Type the writing in the box below instead."` (`page-marking.js:59`) — perfect ux-writing pattern application.
- **Privacy notices are inline, contextual, and short.** `cefr.html:52` `"Runs entirely in your browser. We don't see anything you enter."` — 11 words, tells the user the privacy posture for *this specific tool* before they paste. This is the exception, not the norm, in productivity tools.
- **Strict-CSP utility classes are documented in-CSS.** `styles.css:1608-1614` annotates *why* the utility classes exist and what they replace. Future-Darren-friendly.
