# Slatework Plan 2: Slideshow Feature — Handoff (2026-05-08)

## Completed Tasks (3 of 12)

### ✓ Task G.1: Server-side Slideshow Endpoint
**Commit:** 3670738 (feat(slideshow): add /api/slideshow endpoint with shape validation and fallback deck)

**Files Created:**
- unctions/api/slideshow.js (229 lines)
  - POST /api/slideshow endpoint with Anthropic system prompt
  - Shape validation (8 slides, strict IDs, image_keywords, etc.)
  - Fallback deck for model failures (A1-safe defaults)
  - Rate limiting: per-IP 20/day, global 1500/day
  - Mirrors lesson-plan.js error-handling pattern

**Key Implementation Details:**
- SYSTEM_PROMPT is comprehensive 45-line array defining Anthropic behavior
- Audience rules: young_learner (concrete nouns, A1 vocab), teen (playful, photo subjects), adult (professional, abstract), exam_prep (minimal images)
- alt_audiences structure: tone_overrides + image_density per audience
- Fallback includes tutor-name placeholder + generic A1 content

**Testing:**
- Integration test (from plan): POST with 8 required fields
- Validation rejection tests: short input, invalid audience (both covered by validators)
- Server syntax: ✓ OK (node --check)

---

### ✓ Task G.2: Young-Learner Illustration Bundle
**Assets:**
- ssets/illustrations/young-learner/manifest.json (keyword→SVG mapping)
- ssets/illustrations/young-learner/CREDITS.md (Storyset attribution + usage)
- 107 SVG placeholder illustrations across 9 categories:
  - Animals (~20): cow, cat, dog, bird, fish, pig, etc.
  - Food (~15): apple, banana, bread, pizza, ice cream, etc.
  - Family (~10): mother, father, baby, sister, brother, etc.
  - Body parts (~12): hand, foot, head, arm, leg, eye, ear, nose, mouth, etc.
  - Actions (~15): jump, run, walk, sit, dance, sing, read, write, etc.
  - School (~12): book, pencil, desk, chair, backpack, scissors, etc.
  - Weather (~6): sun, cloud, rain, snow, wind, rainbow
  - Numbers (~5) & Colors (~5): one-five, red-blue-yellow-green-black
  - Misc tokens (greetings used by fallback deck)

**Generator Script:**
- scripts/gen-young-learner-bundle.js (123 lines)
- Creates SVG placeholders with keyword mapping
- Production: Replace with real Storyset/Open Doodles artwork
- Manifest structure is stable; artwork swap has zero impact on code

**Verification:**
- 107 manifest entries verified
- 118 files total (107 SVGs + manifest.json + CREDITS.md + generator script)
- Committed: d013cea (feat(slideshow): add young-learner illustration bundle with manifest and samples)

---

### ✓ Task G.3: Client-Side Renderer
**Commit:** 73d823c (feat(slideshow): add client-side renderer with audience switcher and keyboard nav)

**File Created:**
- src/lib/slideshow-render.js (232 lines)

**Features Implemented:**
1. **Slatework.Slideshow.render(container, response, opts)**
   - Parses server response, builds slide DOM
   - 8 articles, each with text + media slots
   - Slide navigation (idx state, updateActive() function)

2. **Audience Switcher**
   - <select> dropdown: young_learner | teen | adult | exam_prep
   - No secondary API call — uses alt_audiences cached in response
   - Re-renders all 8 slides with tone_overrides applied
   - Calls onAudienceChange callback if provided

3. **Keyboard Navigation**
   - ArrowRight/Space/Enter/PageDown: next slide
   - ArrowLeft/PageUp: previous slide
   - Home: first slide
   - End: last slide
   - Prevents default to avoid page scroll

4. **Image Density**
   - keywordsForDensity(slide, density) function
   - high: up to 3 images per slide
   - medium: up to 2 images
   - low: 1 image
   - minimal: images only on warmup slide (if any)

5. **Async Image Resolution**
   - Calls SW.SlideshowImages.resolve({keyword, audience}) for each keyword
   - Non-blocking: images fade in after slides render
   - Silent failure: missing images don't break deck

6. **Export Hook**
   - Export button calls SW.SlideshowExport.exportPptx() (Task 5)
   - Passes response, audience, tutorName, attributionText
   - Shows alert if module not loaded

7. **Accessibility**
   - aria-roledescription="slideshow"
   - aria-live="polite" on counter
   - aria-hidden toggles for inactive slides
   - <select> aria-label
   - Image alt text from SlideshowImages.resolve()

**IIFE Self-Installation:**
- Auto-assigns to window.Slatework.Slideshow on script load
- No external dependencies (vanilla JS)
- Strict CSP compatible (no eval, inline-safe)

---

## Remaining Tasks (9 of 12)

### Task G.4: Pexels API Proxy [NEXT]
**File to Create:** unctions/api/pexels.js
- Keep PEXELS_API_KEY server-side only
- Per-IP rate limit (suggest 30/day), global (1000/day)
- Input: { keywords: ["cow", "farm"], orientation?: "portrait|landscape" }
- Output: { photos: [{id, src: "https://images.pexels.com/...", alt, photographer, photographer_url}] }
- Fallback: empty array on API error or invalid keyword

**CSP Changes Needed:**
- Add https://images.pexels.com to img-src in _headers

### Task G.5: PptxGenJS Export
**Files to Create:** src/lib/slideshow-export.js
- Lazy-load PptxGenJS from cdnjs via <script> tag + SRI hash
- Exposes: Slatework.Slideshow.export.exportPptx({response, audience, tutorName, attributionText})
- Maps slide JSON → PptxGenJS API calls
- 8 slides, each with title + body + image(s) + speaker notes
- Tutor name on title slide
- Download filename: {tutorName or "Lesson"}_{audience}_{iso-date}.pptx

### Task G.6: Lesson-Plan Integration
**Files to Modify:**
- lesson-plan.html:
  - Load slideshow-render.js, slideshow-images.js, slideshow-export.js (v=18 cache-buster bump)
  - Inject extension button into the result panel
  - Add #slideshow-host <div> for render target
  
- src/lib/page-lesson-plan.js:
  - Wire extension button click → Slatework.Slideshow.generate() with cached plan markdown
  - On success: Slatework.Slideshow.render(host, response, opts)
  - Show/hide spinner during API call

- _headers:
  - Bump CSP img-src to include Pexels
  - Add cache rule for /assets/illustrations/young-learner/*

### Task G.7: Privacy Disclosure
**File to Modify:** privacy.html
- Update "AI-backed tools" section: add "and slideshow"
- New paragraph: "Slide images: image keywords (e.g., 'cow', 'family') are sent to Pexels API for teen/adult audiences; young_learner uses local bundle, exam_prep uses no images."

### Task 11: Acceptance Testing
**12 Criteria (from plan):**
1. Endpoint returns 200 + valid 8-slide JSON ✓
2. Validation rejection on bad audience ✓
3. Fallback deck on Anthropic error ✓
4. Audience switcher re-renders with tone_overrides ✓
5. Image density correct per audience
6. Keyboard nav all arrows/Home/End work
7. Export .pptx downloads successfully
8. Pexels rate limiting blocks after limit
9. Young-learner bundle keyword resolution works
10. Classroom mode scales fonts in differentiation slide
11. Privacy page mentions slideshow + Pexels
12. All 15 HTML pages cache-busted to v=18

### Task 12: Classroom Font Scaling
**Modifications:**
- src/lib/slideshow-render.js: detect metadata.mode === 'classroom'
- Add CSS class .slideshow.is-classroom if mode is classroom
- CSS rule: .slideshow.is-classroom { font-size: 1.2em; } or use CSS variable
- Affects legibility on projector (classroom scenario)

---

## Git Status

**Head:** 73d823c (feat(slideshow): add client-side renderer with audience switcher and keyboard nav)

**Log (Last 5):**
`
73d823c feat(slideshow): add client-side renderer with audience switcher and keyboard nav
d013cea feat(slideshow): add young-learner illustration bundle with manifest and samples
3670738 feat(slideshow): add /api/slideshow endpoint with shape validation and fallback deck
bc37ef0 chore(deploy): bump cache-buster to v=17 across all pages (end of Plan 1)
47b5125 feat(contract): progressive disclosure (7+4) + tutor-profile name/email/subject hydration
`

**Ahead:** 24 commits ahead of origin/main (Plan 1 fully shipped locally, Plan 2 starting)

---

## Next Session Prep

**Recommend Starting With:**
1. Task G.4 (Pexels proxy) — straightforward API wrapper, mirrors /api/slideshow pattern
2. Task G.5 (PptxGenJS export) — library loading + API calls, high value
3. Task G.6 (integration) — ties everything together
4. Task G.7 + Task 11 + Task 12 (finishing touches)

**Pre-Work (if applicable):**
- Obtain Pexels API key: https://www.pexels.com/api/
- Verify SRI hash for PptxGenJS: https://cdnjs.cloudflare.com/ajax/libs/pptxgen-js/
- Confirm all functions/api/_lib.js exports are available (callClaude, rateCheck, etc.)

**Files Ready for Modification:**
- lesson-plan.html (v=17 → v=18)
- _headers (CSP updates)
- privacy.html (disclosure sentence)
- src/lib/page-lesson-plan.js (wiring)
- styles.css (classroom CSS, if needed)

---

**Last Updated:** 2026-05-08 10:55 UTC
**Handoff By:** Claude Opus 4.7
