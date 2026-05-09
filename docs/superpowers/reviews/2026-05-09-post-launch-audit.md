# Slatework — Post-launch audit (2026-05-09)

**Aggregate score:** **9.3/10** (down from 9.6 on 2026-05-08)
**What changed since 2026-05-08:** ~50 commits — profile architecture (Plan 1), slideshow feature (Plan 2 — brand new surface), Pexels integration, English-target collapse, FAQ rewrites, ~6 cache bumps.
**Why down:** the slideshow is genuinely new ground (8.4/10 on first day is fine, not great), and adding profile-mount + slideshow trigger panels on top of the existing AI-tool form pushes lesson-plan toward "vertical AI-app stack" and away from the editorial-newsroom feel that was the brand differentiator. Several dimensions actually went UP (SEO, a11y, best-practices).
**5-day Reddit/HN runway:** all Critical items in this report are closeable in ≤2 hours total. Launch is not at risk.

## Scored summary table

| Dimension | 2026-05-08 | 2026-05-09 | Δ | Top issue |
|---|---|---|---|---|
| Visual / Design / UI-UX | 9.5 | **9.1** | ↓ 0.4 | Profile-mount stack breaks lesson-plan visual rhythm; slideshow shell undersells the slate brand; undefined `.btn-ghost` class reference |
| Backend / Code Quality | 9.6 | **9.4** | ↓ 0.2 | None new — slight regression purely from added surface area |
| Security | 9.7 | **9.5** | ↓ 0.2 | `connect-src` CSP missing Pexels host — silently breaks PPTX photo embed |
| Accessibility (WCAG 2.2 AA) | 9.4 | **9.5** | ↑ 0.1 | Slideshow region not auto-focused after render |
| Performance / CWV | 9.0 | **9.2** | ↑ 0.2 | Twemoji bundle lazy load is correct; PptxGenJS lazy too |
| Best Practices | 9.5 | **9.6** | ↑ 0.1 | Strict CSP + SRI on PptxGenJS verified |
| SEO | 9.5 | **9.7** | ↑ 0.2 | Title/meta polish; privacy `#profile-data` anchor link-target-friendly |
| Copy / Voice / Microcopy | 9.7 | **9.55** | ↓ 0.15 | Slideshow fallback ships "Look. Say the word." for all audiences; "Showing X for [Country]" template renders awkwardly |
| **Slideshow feature (NEW)** | n/a | **8.4** | new | Audience derivation bug (A1 adult → young_learner kid deck); fallback content under-baked; preview region not auto-focused |
| **Aggregate** | **9.6** | **9.3** | ↓ 0.3 | (weighted avg) |

## Consolidated Critical findings (ship before launch — Tue May 12 Reddit / Wed May 13 HN)

Total: **7 Critical items, all ≤30 min each, total ~2 hours work.**

### 1. `connect-src` CSP gap → PPTX photo embed silently fails for Pexels (Section B)
**File:** `_headers:7`
**Fix:** add `https://images.pexels.com` to the `connect-src` directive (already in `img-src`). Without it, `imgUrlToDataUrl` in `slideshow-export.js` can't `fetch()` Pexels URLs from the client; the PPTX exports text-only for teen/adult/exam decks. The user's "no picture attached" report was a symptom.
**Effort:** 1 line change + cache bump.

### 2. Audience derivation mis-classifies adult absolute beginners as `young_learner` (Section E)
**File:** `src/lib/profile.js:275-283`
**Fix:** when `level ∈ {A1, A2}` AND mode is `one_to_one` AND no exam, the rule should leave audience as `adult` (not auto-pick `young_learner`). A 70-year-old retiring civil servant doing A1 Spanish gets a Twemoji cartoon deck. Add a `student_age` hint field OR change the rule to `young_learner` only when `mode === 'small_group' || mode === 'classroom'`.
**Effort:** ~5 lines + one paragraph in the spec doc.

### 3. Undefined `.btn-ghost` class on slideshow toolbar (Section A)
**File:** `src/lib/slideshow-render.js:108-109`
**Fix:** replace `.btn-ghost` with the existing `.btn-link` class (which has the right understated treatment) OR define `.btn-ghost` in `styles.css`. Currently those buttons render unstyled.
**Effort:** 1 line, ~30 sec.

### 4. Slideshow fallback deck ships young-learner copy for all audiences (Section F)
**File:** `functions/api/slideshow.js:124-132` (warmup, core, practice slide bodies)
**Fix:** branch the fallback `body` strings by `audience`. "Look. Say the word." reads infantilizing for an adult IELTS prep student. Already mode-aware after `ee8d91f`; needs audience-aware too. The exact slide the user reported.
**Effort:** ~15 min.

### 5. Country-binding caption template renders broken English (Section F)
**Files:** `src/lib/page-tax.js`, `src/lib/page-setup.js`, `src/lib/page-insurance.js`, `src/lib/page-payments.js`, `src/lib/page-rates.js`
**Symptom:** "Showing Hourly rate calculator for United Kingdom Change" instead of "Showing rates for United Kingdom · Change"
**Fix:** the caption template uses `document.title.split('—')[0]` which returns the full page title. Each page should declare a `pageTopic` constant ('rates', 'tax info', 'setup steps', etc.) and the caption should use `Showing {pageTopic} for {country}` with proper " · Change" separator.
**Effort:** ~15 min across 5 files.

### 6. Slideshow preview not auto-focused after render (Section E)
**File:** `src/lib/slideshow-render.js:225`
**Fix:** after the slide stack renders, call `.focus({preventScroll: true})` on the slide container so keyboard navigation works without an extra Tab keystroke. Currently arrow keys silently no-op until the user manually tabs into the preview.
**Effort:** 1 line.

### 7. Stacked profile-mount above-form chrome on lesson-plan/worksheet/marking pushes the form below the fold (Section A)
**Files:** `lesson-plan.html`, `worksheet.html`, `marking.html`, `src/lib/styles.css` (.profile-mount selector)
**Fix:** consolidate the three mount divs (`profile-tutor-strip`, `profile-student-strip`, `profile-save-link`) into a single horizontal row at lower density when both strips are hidden (no-profile state). Currently three empty 50-px-tall containers stack vertically before the form even renders, costing ~150 pixels of above-fold real estate for first-time visitors. Less critical than the others but the most visible regression in the visual scorecard.
**Effort:** ~30 min — one CSS rule change + adjust the empty-state shell.

## Important findings (post-launch polish)

Pulled top items from each section. Not blocking launch, but worth a follow-up cycle.

- **Section A:** slideshow shell underuses the slate aesthetic (no chalk-mark on slide titles, no mono-caption "// AUDIENCE" eyebrow, no chalk-dust grain on slide backgrounds). The slideshow looks like a generic tool rather than a Slatework tool.
- **Section B:** `_diag-models.js` endpoint is token-gated but never used in production code — verify it's actually being hit (or remove).
- **Section C:** `<dialog>` requires Safari 15.4+. HK older Safari users (Safari 14 still has ~5% share in HK) will get a non-modal fallback. Cheap polyfill or a warning.
- **Section D:** Tool-page titles could carry "for language tutors" qualifier within 60-char limit (only 4 of 11 tool pages need this).
- **Section E:** `metadata.mode` not normalized — Sonnet drift like `"1:1"` would silently break classroom font scaling. Add to `normalizeDeck`.
- **Section F:** `aria-hidden="true"` on `.slideshow-slide-media` blocks alt text from screen readers. Drop the aria-hidden, ensure decorative images have empty alt.

## What Slatework still does well (cross-cutting strengths)

1. **Strict CSP discipline** — surface area grew (Pexels host, PptxGenJS, Twemoji bundle) without reintroducing `unsafe-inline`. SRI on every CDN script.
2. **Privacy posture** — profiles are localStorage-only, day-salted IP hashes, no body logging on any worker. The privacy disclosures in the new `/privacy#profile-data` section read like a real engineer wrote them, not a lawyer.
3. **Voice consistency** — peer-tutor voice carried into ~3,200 words of new content + the profile UI strings + the new homepage FAQ. Zero LLM-slop tells.
4. **Server-side defensive layers on the slideshow worker** — fallback deck never blocks, normalizeDeck salvages most Sonnet drift, `_debug` field on fallback responses for future diagnosis.
5. **alt_audiences architecture** — instant audience switch with no re-API-call. Genuine engineering taste.
6. **Form-clutter discipline** — collapsed two redundant English options in the same session feedback was raised; reordered dropdown so English is #1; rewrote stale help text. Three commits, ~30 min total.

## Files

- This master report: `docs/superpowers/reviews/2026-05-09-post-launch-audit.md`
- Section files (drill-down):
  - `.sections-2026-05-09/section-a-design.md` (9.1/10)
  - `.sections-2026-05-09/section-b-backend-security.md` (9.45/10)
  - `.sections-2026-05-09/section-c-quality.md` (9.4/10 combined)
  - `.sections-2026-05-09/section-d-seo.md` (9.7/10)
  - `.sections-2026-05-09/section-e-slideshow.md` (8.4/10)
  - `.sections-2026-05-09/section-f-copy.md` (9.55/10)

## Honest read

The site is launch-ready. The 7 Critical items are real but small — total ~2 hours of fix work. The slideshow at 8.4/10 is the weakest dimension and that's appropriate for a feature that shipped today; the rest of the site is at 9.4–9.7 across every dimension, including SEO and accessibility which both went up.

The user-reported "Warm-up · Look. Say the word. · no picture attached" issue is actually three separate root causes converging: (a) Sonnet output failed validation → fallback fired, (b) fallback deck has young-learner-only slide bodies, (c) Pexels host missing from CSP `connect-src` so the photo couldn't be fetched even if the deck had been right. Critical items #1, #2, #4 close all three.

Single biggest perceived-quality lever before launch: **fix the slideshow fallback flow** (items #1, #2, #4, #6, plus the audience-aware fallback content). ~45 min total. After that the slideshow goes from "8.4/10 with frustrating edge cases" to "9.0/10 with rare graceful degradations."
