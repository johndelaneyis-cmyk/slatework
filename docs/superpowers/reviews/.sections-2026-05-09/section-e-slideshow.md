# Section E — Slideshow Feature Deep-Dive (2026-05-09)

**Score:** 8.4/10 — solid first-day shipping with one real audience-derivation bug, two preview-UX gaps, and a fallback that reads slightly under-baked. Architecture is sound (server contract, normalize-then-validate salvage, alt_audiences for in-page audience switch, raster-on-export). PPTX path is now working end-to-end after `a92dc38`. Subtractive issues are mostly polish, not stop-ship.

## Sub-scores

| Sub-dim | Score | Notes |
| --- | --- | --- |
| Server prompt quality | 9 | Tight, opinionated, mode-aware override block, audience rules cleanly enumerated, PII guard. Drift surface estimated low (~10–15% need normalize). |
| Validation/normalize layer | 9 | `normalizeDeck` covers id aliasing, slide reorder, image_keywords coercion, alt_audiences gap-fill — four common Sonnet/Haiku drift modes. Validator runs after, fails closed to fallback. |
| Fallback deck quality | 6.5 | Mode-aware (post `ee8d91f`), but copy is **generic at exam_prep / adult** ("Look. Say the word.") and identical across topics — feels like the "default deck" the user got, not a real lesson. |
| Cost ceiling | 8.5 | 30/IP/day × ~$0.045 = ~$1.35/IP/day worst-case. Reasonable for a free tool. Global 2000/day = ~$90/day worst case across all users. Below lesson-plan's 3000/day, which is appropriate (slideshow is downstream). |
| Preview UX | 7.5 | Functional, accessible-ish, polished CSS. **Doesn't auto-focus the slideshow region**, so keyboard nav silently doesn't work until user tabs in. No slide-counter "X of 8" announcement timing. |
| Audience switcher | 9 | Server caches `alt_audiences` so re-render uses no new API call — exactly per spec §6.4. `idx` resets to 0 on switch, which is right. |
| Keyboard nav | 8 | Arrow / Space / Enter / PageUp / PageDown / Home / End all wired. Missing: Esc to close (preview is inline, not modal — debatable), no announce for slide change to AT (counter is `aria-live` but slide-title isn't focused). |
| PPTX export quality | 8 | LAYOUT_WIDE 10×5.625, branded header strip, classroom 1.2× scale, body wraps at 60%/100% based on image presence, slide notes carry slide id + audience + attribution. Footer says "Made with Slatework" + tutor name. |
| SVG raster (post-fix) | 8.5 | `a92dc38` Canvas rasterizer correctly handles Twemoji's viewBox-only SVGs by force-setting `img.width/height = 800` (ll. 161-162 of slideshow-export.js). Transparent background renders OK over white slide. **Verified manually:** Twemoji `<svg viewBox="0 0 36 36">` shape, no width/height attributes — rasterizer is exactly the right approach. |
| Mode discipline | 9 | Prompt's mode rules are unambiguous and OVERRIDE the source markdown — strong instruction. The system prompt explicitly enumerates banned phrases ("work in pairs", etc.) and replacements. Sonnet 4.6 is well-suited to follow this. |
| Audience profile correctness | 6 | **`deriveAudience` mis-classifies adult A1/A2 learners as `young_learner`.** Standard demographic for tutoring. Not sub-2 — only the auto-derive path is broken; manual `audience_profile` on a saved Student profile overrides it. Quick Lesson users (no profile) hit the bug. |
| Lesson-plan integration | 8.5 | Trigger button correctly conditioned (post-result). `b153061` (today) wires worksheet/marking sibling links with full lesson context — sibling deconfliction works. `_debug` fallback field is present and useful for diagnosis but never user-visible (good). |

---

## Findings

### Critical

- **Adult A1/A2 learner gets a Twemoji cartoon deck** — `src/lib/profile.js:275-283` — `deriveAudience` returns `young_learner` for any A1/A2 input regardless of mode. An adult businessperson learning Spanish at A1 will get a deck of pigs and apples. The bug is in the level→audience mapping: A1/A2 should consider `mode` as well (`one_to_one` + adult-ish exam-empty + A1 = `adult`, not `young_learner`). Fix: branch on mode first; only return `young_learner` when `mode === 'classroom'` AND level ≤ A2 AND no exam — OR add an explicit "Is this a young learner?" toggle on the form. Manual override via saved profile works, but most Quick Lesson users skip the profile.

- **Preview region not auto-focused after render** — `src/lib/slideshow-render.js:225` — `await renderForAudience(audience)` returns without calling `root.focus()`. The shell has `tabindex="0"` and a keydown listener, but the listener only fires once focus is on `.slideshow`. Tutors clicking "Generate slideshow" land on a deck they can't navigate without first tabbing or clicking. Fix: add `root.focus({ preventScroll: true })` after the first render.

### Important

- **Fallback warmup body is the exact text in user's bug report** — `functions/api/slideshow.js:124-125` — body string is `"Look. Say the word."`. For `audience='adult'`, `warmupKw=['conversation']` (line 116), which goes to Pexels; if that also fails (no PEXELS_API_KEY at the time, or Pexels returned 0 results), the slide ships with no image AND that exact text. **This is what the user saw.** The fallback is functioning as designed, but that "designed" output is bare. Two improvements: (a) add an audience-tailored fallback body for adult/exam_prep ("Tell your tutor about your last weekend"), (b) inline a tiny "speech-bubble" emoji-as-SVG into the fallback for warmup so the slide is never blank.

- **`aria-hidden="true"` on `.slideshow-slide-media`** — `src/lib/slideshow-render.js:130` — the media wrapper hides itself from AT, but the `<img alt="...">` inside is the only descriptor of the slide's visual content. Either drop the `aria-hidden` and let the alt text in (preferred for vocab slides where the picture IS the content) or keep it and add a paragraph to `.slideshow-slide-text` saying "Picture: cow, farm, sun." Either is a meaningful improvement.

- **Double `aria-live="polite"` regions can stutter** — `src/lib/slideshow-render.js:106` (counter) and `:113` (stage) — both will announce on slide change. AT will read counter ("3 of 8") then re-read entire stage as it re-renders the active slide. Demote stage to `aria-live="off"` and rely on counter + a focus move into the slide title.

- **Reduced motion CSS is defensive but not wired** — `src/lib/styles.css:2549-2553` — `transition: none !important` is correct, but the renderer's only "transition" is `display: none/grid` so there's no actual motion to suppress. The CSS block is harmless but the spec mention of "respects reduced motion" is being met by accident, not design. Add a class-based fade-in for active slide transitions (200ms opacity) and gate it on `@media (prefers-reduced-motion: no-preference)` — meaningful UX, properly accessible.

- **`metadata.mode` echo not enforced in normalize** — `functions/api/slideshow.js:336-337` — fallback to user-supplied mode happens after validate. But if Sonnet returns `metadata.mode` as `"1:1"` or `"one to one"` (with a space), validator passes (no mode constraint in `validateDeck`) and renderer's `metadata.mode === 'classroom'` check silently fails to detect classroom mode. Add mode normalization in `normalizeDeck`: coerce `'one to one'` → `'one_to_one'`, validate against `VALID_MODES`, default to user-supplied mode otherwise.

- **`PptxGenJS` SRI verified** — `src/lib/slideshow-export.js:28` — pinned hash `qb0Xhi7LLYpvW1HCK6oMrmDLSY9sy7vwm6ZlV6KjtrlL9yg30+YN4neTwnmX+Kp8` matches the live unpkg bundle (computed sha384 base64 against fetched 460,889-byte file). Bundle.js correctly inlines JSZip — no second script needed.

### Nice-to-have

- **Image rasterization quality could be sharper at 800×800** — `src/lib/slideshow-export.js:154-186` — Twemoji SVGs render at native 36×36 viewBox but are scaled to 800×800. Canvas does linear interpolation by default, which on a 36→800 upscale gives soft edges. Set `ctx.imageSmoothingQuality = 'high'` before `drawImage` for slightly crisper output. Won't matter on a projector; will look better in screenshots.

- **`pres.title` derived from slide[0].title is fine, but `pres.subject` and `pres.company` empty** — `src/lib/slideshow-export.js:192-194` — adding `pres.subject = 'Lesson plan'` and `pres.company = 'Slatework'` improves PPTX file inspector metadata. Free polish.

- **Loading state copy is good but generic** — `src/lib/slideshow-render.js:292` — "BUILDING DECK · 10–30 seconds. Don't refresh." is honest. Could be "Designing 8 slides for your A1 Spanish lesson." — uses payload to feel personal. Optional.

- **Manifest matching is exact-then-substring; no fuzzy** — `src/lib/slideshow-images.js:58-67` — keyword "schoolbag" matches `school-bag.svg` (substring), but "back-pack" wouldn't match `school-bag.svg`. Add a 1–2 stop-word and hyphen-stripping pass before matching. Cheap.

- **No telemetry on fallback rate** — `functions/api/slideshow.js:321,330` — `console.error` only. The `_debug` field is great for ad-hoc inspection but you'll never know what % of decks fall back without instrumentation. Cloudflare Pages doesn't ship a stat back. Add a 1-pixel beacon to `/api/event` (or extend `_lib`'s rate KV with a counter) so fallback frequency surfaces over a week.

- **`prepFor` PPTX could include a "speaker notes" section per slide for tutor cues** — `src/lib/slideshow-export.js:116-118` — currently slide notes are slide id + audience + attribution. Adding the `subtitle` and an auto-extracted "Tutor cue: …" sentence (from the source markdown) would make the PPTX truly classroom-ready, not just visually equivalent to the preview. v0.2 work.

- **Manifest has a `verb-smile.svg` AND `greet-smile.svg`** — `assets/illustrations/young-learner/manifest.json:511-516, 740-745` — two entries with `keywords: ['smile', ...]`. `find()` returns whichever is first (verb-smile, line 511). Either dedupe or scope keywords ('smile-action' vs 'smile-greeting'). Tiny.

---

## Top 3 ship-now

1. **Fix `deriveAudience` to consider mode/exam, not just level** (`src/lib/profile.js:275-283`). Adult A1 learners getting a Twemoji deck is a credibility hit — first impression for any new tutor whose first lesson is A1 (the most common entry level). 5-line change. Highest ROI in the section.

2. **Auto-focus the slideshow region after `renderForAudience()`** (`src/lib/slideshow-render.js:225`). One line: `root.focus({ preventScroll: true })`. Without it, the keyboard-nav implementation is invisible to the user. This is the difference between "polished feature" and "debug tool" the brief asked about.

3. **Improve the static fallback's adult/exam_prep warmup body** (`functions/api/slideshow.js:124-125`). Replace `"Look. Say the word."` with audience-branched copy: young → "Look. Say the word." (current), teen → "Tell your tutor about your week.", adult → "Quick recap from last lesson — what stuck?", exam_prep → "Look at the prompt. Plan three points.". Cuts the "default deck" feel when fallback fires.

---

## What slideshow does well

- **Architecture choice is right.** Single Anthropic call with `alt_audiences` baked into the response means the audience switcher is instant — exactly per spec §6.4. No second API call, no spinner on switch. Delightful.

- **Normalize-then-validate is robust.** Four common Sonnet/Haiku drift modes (id casing, slide reorder, missing alt_audiences, image_keywords as scalar) are silently salvaged. `normalizeDeck` is well-targeted, not over-aggressive.

- **The mode override in the prompt is forceful and correct.** The system prompt explicitly says "These OVERRIDE anything the source lesson-plan markdown may say" and enumerates banned phrases for `one_to_one`. This is the right level of insistence for a feature where 1:1 tutors are the modal user.

- **Twemoji + SVG rasterizer is the right call for v1.** CC-BY 4.0, ~80–120 covering A1 vocab, no per-slide network call for young_learner decks (vs Pexels), AND the rasterizer means PPTX renders correctly across PowerPoint versions. Better than spec's deferred Storyset/Open Doodles call.

- **Per-IP / global rate sensible.** 30/IP daily is one slideshow per ~half-hour of teaching prep — generous. Global 2000/day at ~$90 worst-case is acceptable for the free-tool stance. Lower than lesson-plan's 3000 because slideshow is downstream — right call.

- **The `_debug` field on fallback responses** (`functions/api/slideshow.js:312, 326-333`) — diagnostic info for the tutor's network panel without being user-visible. Pragmatic operability that paid off the same day it shipped.

- **PPTX file size is reasonable.** With 8 slides, 4 raster images at ~800×800 PNG (~50–80KB each), header/footer text, JSZip overhead — typical export will be 300–500KB. Well within the 100–500KB target band.

- **The CSS shell is clean.** 90 lines of slideshow CSS in `src/lib/styles.css:2461-2553`, uses design-token vars (`--line`, `--ring`, `--surface`), classroom-mode font scaling is one line per element, mobile breakpoint at 640px collapses to single column. No CSS-in-JS, no abandoned utility classes. Looks like Slatework.
