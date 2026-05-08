# Profile architecture + UX cleanup + slideshow integration — design spec

**Date:** 2026-05-09
**Author:** Darren (with Claude)
**Status:** Approved design, ready for implementation planning
**Trigger:** Slideshow feature brainstorm exposed structural friction across the toolkit. Fixing only the slideshow would paper over the underlying problems. This spec addresses the structural friction first, then folds the slideshow in as an extension.

---

## 1. Motivation

### 1.1 Problems this spec solves

The 2026-05-09 brainstorm surfaced four structural friction sources, in order of severity:

1. **Cross-tool re-entry.** `lesson-plan`, `worksheet`, `marking`, and `cefr` each duplicate the same five inputs (target language, source language, CEFR level, mode, exam). A tutor running a weekly lesson cycle re-enters the same data 3–4 times per student. Verified by grep: `localStorage` is used in only one HTML file across the entire site (`setup.html` for checklist progress). No state is shared between AI tools.

2. **CEFR knowledge barrier.** ~60% of the realistic tutor audience does not fluently know CEFR levels. Today's options for these tutors are (a) guess wrong, (b) navigate to `/cefr.html` and run a 3-minute Can-Do questionnaire, (c) navigate to `/cefr.html` AI mode and run an Anthropic call on a writing sample. With 5–10 active students, the per-student setup cost is 15–30 minutes before the toolkit produces any value.

3. **Form bloat on `contract.html`.** 15 visible inputs, including 3–4 optional advanced fields shown by default. Most online contract templates run 8–10 fields.

4. **Slideshow as a sibling tool would compound the above.** Adding a `/slideshow` page with its own form would add to cross-tool re-entry. The slideshow must inherit data from the lesson plan it derives from, not require re-entry.

### 1.2 Constraints (carry over from existing project decisions)

- Vanilla HTML/CSS/JS only. No build, no framework, no npm.
- Strict CSP. No inline scripts, no inline styles. New code respects this.
- Cloudflare Pages deploy. Static assets + Pages Functions for API.
- Privacy posture: nothing about students leaves the browser unless an AI tool is invoked. This spec strengthens that posture (profiles are localStorage-only).
- "No signup" positioning. Profile feature is **opt-in, never gated, never default**.
- 7 announced launch countries: US, UK, CA, AU, NZ, IE, HK.

---

## 2. Architecture overview

The toolkit moves from "10 independent tool forms" to **two persistent client-side profiles + lightweight per-tool inputs**.

### 2.1 Two-level profile model

**Tutor profile** (1 per browser, optional, set once):
- Country (ISO 3166-1 alpha-2, restricted to the 7 launch countries)
- Display name (optional, used in contract)
- Default currency (derived from country)

**Student profiles** (0–N, switchable, optional):
- Nickname (tutor-chosen, no PII required)
- Target language
- Source language
- CEFR level
- Mode (one_to_one / small_group / classroom)
- Exam / curriculum (optional)
- Audience profile (young_learner / teen / adult / exam_prep) — auto-derived from level + mode + exam, override-able
- Notes (free text, optional)
- Audit metadata: `id`, `created_at`, `last_used_at`, `level_set_via`

### 2.2 Discoverability and opt-in framing

**Profiles are entirely optional. Slatework was designed to work without saved data and continues to work that way for users who never opt in.**

Discovery surfaces (limited):

1. A small text link `+ Save my setup for next time` at the top of each AI tool page. Easy to ignore.
2. A contextual offer *after* the user successfully generates content, shown at most 3 times across the lifetime of the browser. Has a "Don't ask again" option.
3. One FAQ entry on the homepage: "Do I have to make an account or save anything?"

Surfaces explicitly NOT used:
- No first-visit modal
- No homepage banner
- No settings dialog the user has to dismiss
- No "your account" framing anywhere

When a profile is set, every AI tool page includes a `Quick lesson →` button that bypasses the profile and renders today's full form. This is always one click away.

### 2.3 Tools affected by this spec

| Tool | Today's form complexity | Refactor scope |
|---|---|---|
| `/lesson-plan` | 8 fields | High: profile-driven, slideshow extension button on result |
| `/worksheet` | 8 fields | High: profile-driven |
| `/marking` | 5 fields | High: profile-driven |
| `/cefr` | 3 fields | Low: keeps current form (it's the meta-tool that *sets* level) + new "Save level to profile" button |
| `/rates` | 5 fields | Medium: tutor-profile-driven country |
| `/contract` | 15 fields | High: progressive disclosure refactor (separate from profile work) |
| `/tax`, `/setup`, `/insurance`, `/payments` | 1 field each | Low: tutor-profile-driven country, removes the dropdown |
| Homepage `index.html` | n/a | Low: optional FAQ entry |

---

## 3. Data model + storage

### 3.1 Storage location

- `localStorage` only. No Cloudflare KV sync, no server-side store, no cookies.
- Key: `slatework.profiles.v1` (versioned to enable future migration).
- Schema versioned via top-level `schema` field.

### 3.2 JSON shape

```json
{
  "schema": 1,
  "tutor": {
    "country": "GB",
    "name": "Sarah Chen",
    "currency": "GBP",
    "set_at": "2026-05-09T08:00:00Z"
  },
  "students": [
    {
      "id": "lily-2026-05-09-a1b2",
      "nickname": "Lily",
      "target": "English",
      "source": "Cantonese",
      "level": "A1",
      "level_set_via": "quick_check",
      "mode": "one_to_one",
      "exam": "",
      "audience_profile": "young_learner",
      "audience_set_via": "auto",
      "notes": "7yo, primary, vocab focus",
      "created_at": "2026-05-09T08:00:00Z",
      "last_used_at": "2026-05-09T08:00:00Z"
    }
  ],
  "current_student_id": "lily-2026-05-09-a1b2",
  "preferences": {
    "contextual_offer_dismissed": false,
    "contextual_offer_shown_count": 0
  }
}
```

### 3.3 Field reference

| Field | Type | Notes |
|---|---|---|
| `schema` | int | Migration anchor. v1 in this spec. |
| `tutor.country` | enum | One of: US, GB, CA, AU, NZ, IE, HK |
| `tutor.currency` | string | Derived from country pack. Stored to avoid repeat lookup. |
| `students[].id` | string | UUID-like slug. Stable across renames. Generated client-side. |
| `students[].level_set_via` | enum | "manual" / "quick_check" / "cefr_tool" / "imported" |
| `students[].audience_profile` | enum | "young_learner" / "teen" / "adult" / "exam_prep" |
| `students[].audience_set_via` | enum | "auto" / "manual" |
| `current_student_id` | string \| null | Active student. Null = profile exists but no current selection. |
| `preferences.contextual_offer_dismissed` | bool | Set true when user clicks "Don't ask again" |
| `preferences.contextual_offer_shown_count` | int | After 3, never shown again even without explicit dismissal |

### 3.4 CRUD module

`src/lib/profile.js` — single file, ES module.

Public API:
```js
// Read
SW.Profile.getTutor()                         // → tutor object or null
SW.Profile.getStudents()                       // → array of student objects
SW.Profile.getCurrentStudent()                 // → student object or null
SW.Profile.hasAnyProfile()                     // → bool (tutor OR any student)

// Write
SW.Profile.setTutor({country, name?})
SW.Profile.addStudent({nickname, target, source, level, mode, exam?, audience_profile?, notes?})
SW.Profile.updateStudent(id, partial)
SW.Profile.deleteStudent(id)
SW.Profile.setCurrentStudent(id | null)

// Bulk
SW.Profile.exportAsJson()                      // → JSON string
SW.Profile.importFromJson(jsonString)          // → success/error
SW.Profile.clearAll()                          // → wipes localStorage key

// Audience derivation
SW.Profile.deriveAudience({level, mode, exam}) // → audience_profile string

// Preferences
SW.Profile.getPreferences()
SW.Profile.bumpContextualOfferShown()
SW.Profile.dismissContextualOffer()
```

Storage failures (private browsing, quota exceeded) fail open: methods return null/empty, the rest of the site continues to work as if no profile exists.

### 3.5 Audience derivation rules

Implemented in `SW.Profile.deriveAudience()`:

```
if exam is non-empty AND non-trivial:
    return "exam_prep"
if level in {A1, A2}:
    if mode == "small_group" or "classroom":
        return "young_learner"
    else:
        return "young_learner"  // safe default; overridable
if level == "B1":
    return "teen"  // ambiguous; user can override to "adult"
if level in {B2, C1, C2}:
    return "adult"
```

Override is always available in the profile editor.

---

## 4. UI atoms (3 reusable components)

### 4.1 Tutor profile strip

**Where:** Top of homepage, top of `/rates`, `/tax`, `/setup`, `/insurance`, `/payments`. Hidden if no tutor profile is set.

**Markup template:**
```html
<aside class="tutor-strip" role="region" aria-label="Tutor profile">
  <p>You are: tutor in <strong>United Kingdom</strong> · 
    <button type="button" class="tutor-strip-edit">Change</button></p>
</aside>
```

**Behavior:** Click "Change" → inline expand with country dropdown + "Save" / "Cancel".

**No-profile state:** Strip hidden. Tools render today's country dropdown as today.

### 4.2 Student profile strip

**Where:** Top of `/lesson-plan`, `/worksheet`, `/marking`. Hidden if no student profiles.

**Markup template:**
```html
<aside class="student-strip" role="region" aria-label="Current student">
  <label for="student-picker" class="visually-hidden">Current student</label>
  <select id="student-picker" class="student-strip-picker">
    <option value="lily-2026-05-09-a1b2" selected>Lily (A1, en→zh)</option>
    <option value="...">+ Add student</option>
  </select>
  <button type="button" class="student-strip-edit">Edit</button>
  <button type="button" class="student-strip-quick">Quick lesson →</button>
</aside>
```

**Behavior:**
- Picker change → pre-fills the form
- "Edit" → opens profile editor modal
- "Quick lesson →" → clears pre-fill, restores today's full form for one session (does not delete the profile)

**No-profile state:** Strip hidden. The text link `+ Save my setup for next time` appears in the page header instead.

### 4.3 Profile editor modal

**Where:** Opens when user clicks "+ Add student" / "Edit" / `+ Save my setup`.

**Required structure:**

```html
<dialog class="profile-editor" aria-labelledby="profile-editor-title">
  <h2 id="profile-editor-title">Student profile</h2>
  <p class="profile-editor-caption">
    Optional. Slatework works without saving anything. This just skips re-entry next time.
  </p>
  
  <form>
    <div class="field">
      <label for="profile-nickname">Nickname</label>
      <input id="profile-nickname" type="text" 
             placeholder="e.g., Lily, J.K., Wed-evening kid" required />
    </div>
    
    <div class="field">
      <label for="profile-target">Target language</label>
      <select id="profile-target" required></select>
    </div>
    
    <div class="field">
      <label for="profile-source">Source language</label>
      <select id="profile-source" required></select>
    </div>
    
    <div class="field">
      <label for="profile-level">CEFR level</label>
      <select id="profile-level" required>
        <option value="A1">A1 — Just starting (basic words and set phrases)</option>
        <option value="A2">A2 — Can describe basic daily life</option>
        <option value="B1">B1 — Handles familiar everyday topics</option>
        <option value="B2">B2 — Confident at work / study, idioms still hard</option>
        <option value="C1">C1 — Fluent on any topic, with some nuance</option>
        <option value="C2">C2 — Near-native</option>
      </select>
      <details class="cefr-quick-check">
        <summary>Don't know? Quick check</summary>
        <!-- 3-question rule-based quiz, see §4.4 -->
      </details>
    </div>
    
    <div class="field">
      <label for="profile-mode">Mode</label>
      <select id="profile-mode" required>
        <option value="one_to_one">1:1</option>
        <option value="small_group">Small group</option>
        <option value="classroom">Classroom</option>
      </select>
    </div>
    
    <div class="field">
      <label for="profile-exam">Exam or curriculum (optional)</label>
      <input id="profile-exam" type="text" 
             placeholder="e.g., GCSE Spanish, IELTS Speaking, HKDSE" />
    </div>
    
    <details>
      <summary>Slideshow style</summary>
      <div class="field">
        <label for="profile-audience">Audience profile</label>
        <select id="profile-audience">
          <option value="auto">Auto (recommended) — derived from level + exam</option>
          <option value="young_learner">Young learner (image-heavy, big fonts)</option>
          <option value="teen">Teen (mid-density)</option>
          <option value="adult">Adult (text-leaning)</option>
          <option value="exam_prep">Exam prep (prompt cards, model answers)</option>
        </select>
      </div>
    </details>
    
    <div class="field">
      <label for="profile-notes">Notes (optional)</label>
      <textarea id="profile-notes" placeholder="e.g., GCSE Foundation, dyslexic, prefers visual prompts"></textarea>
    </div>
    
    <p class="profile-editor-privacy">
      This stays in your browser. Slatework's servers never see it.
    </p>
    
    <div class="profile-editor-actions">
      <button type="button" class="btn-secondary">Cancel — don't save anything</button>
      <button type="submit" class="btn-primary">Save profile</button>
    </div>
  </form>
</dialog>
```

**Behavior:**
- Native `<dialog>` element with the standard close (Esc / backdrop click)
- Focus trap: native dialog handles this
- Validates: nickname non-empty; target/source/level/mode all required
- On save: writes to `SW.Profile.addStudent()`, sets as current, closes

### 4.4 Don't-know inline quick-check

Inside the profile editor's level field. Contents:

```
Can your student...

1. Introduce themselves and answer simple personal questions
   (name, age, where they live)?
   ○ Easily   ○ With effort   ○ Not really

2. Describe their daily routine, family, or hobbies?
   ○ Yes   ○ Somewhat   ○ No

3. Discuss opinions, plans, or hypothetical situations?
   ○ Fluently   ○ With difficulty   ○ Not yet

[Set level]
```

Mapping (rule-based, fully client-side, no AI call):
- All "Not really" / "No" / "Not yet" → A1
- 1.Easily, 2.No, 3.No → A2
- 1.Easily, 2.Somewhat, 3.No → A2 (lean A2 over B1 — undershoot beats overshoot for fragile learners)
- 1.Easily, 2.Yes, 3.Not yet → B1
- 1.Easily, 2.Yes, 3.With difficulty → B2
- 1.Easily, 2.Yes, 3.Fluently → C1
- All "Easily/Yes/Fluently" exact → C1 (require external mapping for C2)

Result auto-fills the level dropdown above. Sets `level_set_via: "quick_check"`.

### 4.5 "Adjust for today" expander

**Where:** Below the per-lesson input field on `/lesson-plan`, `/worksheet`, `/marking`. Only when a profile is active.

**Contents:** override fields for level / mode / exam — only the overrides; the form does NOT show the static profile fields.

```html
<details class="adjust-for-today">
  <summary>Adjust for today (optional)</summary>
  <div class="field">
    <label>Level for this lesson only</label>
    <select><!-- A1-C2 with glosses --></select>
  </div>
  <div class="field">
    <label>Mode for this lesson only</label>
    <select><!-- 1:1 / small_group / classroom --></select>
  </div>
  <div class="field">
    <label>Exam / curriculum for this lesson only</label>
    <input type="text" />
  </div>
</details>
```

Per-session only. Does not modify the saved profile.

---

## 5. Per-tool refactors

### 5.1 `/lesson-plan.html`

**No-profile state:** today's form unchanged. Add "Don't know?" expander next to the level field (Layer 2 from the brainstorm). Add CEFR glosses to the level dropdown (Layer 1). Add `+ Save my setup for next time` link in the page header.

**Profile-set state:**
```
[Lily (A1, en→zh) ▾]  [+Add]  [Edit]  [Quick lesson →]

Today's lesson goal:
[__________________________________________________]

[Adjust for today ▾]   [Generate lesson plan]
```

**Result panel** (after generation): the existing rendered Markdown plus a new `<section class="extensions">` with three buttons:
- `[Generate slideshow from this plan]` (primary, new)
- `[Generate worksheet for this plan]` (secondary, new — links to `/worksheet?topic=...&from=lesson-plan` with goal as topic)
- `[Mark a student response to this plan]` (secondary, new — links to `/marking?from=lesson-plan`)

### 5.2 `/worksheet.html`

**No-profile state:** unchanged + glosses + "Don't know?" + "+ Save my setup" link.

**Profile-set state:**
```
[Lily ▾]  [+Add]  [Edit]  [Quick lesson →]

Topic: [_____________________________]
Format: ○ Gap-fill  ○ Multiple-choice  ○ Short-answer  ○ Reading-comprehension
Question count: [_8_]

[Adjust for today ▾]   [Generate worksheet]
```

URL parameter support: `?topic=...&from=lesson-plan` pre-fills topic field for cross-tool flow.

### 5.3 `/marking.html`

**No-profile state:** unchanged + glosses + "Don't know?" + "+ Save my setup" link.

**Profile-set state:**
```
[Lily ▾]  [+Add]  [Edit]  [Quick lesson →]

Paste student writing or drop a photo:
[__________________________________________________]
[__________________________________________________]
(drop zone for image upload — unchanged)

[Adjust for today ▾]   [Generate feedback]
```

### 5.4 `/cefr.html`

Almost entirely unchanged — this is the tool that *sets* CEFR level via Can-Do statements or AI writing-sample analysis. Single addition:

After result is rendered, show a button: `[Save this level to a student profile ▾]`. Click expands a small inline form (nickname + target/source) → calls `SW.Profile.addStudent()` with `level_set_via: "cefr_tool"`.

### 5.5 `/rates.html`

**No-profile state:** unchanged country dropdown.

**Tutor-profile-set state:** tutor-profile strip at top; country dropdown removed (rate calc reads from profile). Other fields (language pair, experience, hours/week) remain.

If a current student is set, language pair pre-fills from `target+source` of the current student. Override-able via dropdown.

### 5.6 `/contract.html` — separate progressive-disclosure refactor

**Always visible (7 fields):**
1. Student or family name (text input — per-contract, not in profile)
2. Subject / language (text — pre-filled from current student profile if set: `Spanish` from profile.target)
3. Rate per lesson (text — pre-filled from `/rates` if user came from there via URL param)
4. Lesson duration (text, default "60 minutes")
5. Location (text, default "online via Zoom")
6. Cancellation hours (number, default 24)
7. Payment terms (text, default "paid weekly in advance")

**Behind `More options ▾` expander (collapsed by default, label includes count: "More options (4 fields)"):**
8. Years teaching (number, optional)
9. Late-cancel fee (select)
10. Welcome tone (select)
11. Custom welcome paragraph (textarea)

**Pulled from tutor profile (not visible as form fields):**
- Tutor name (from `tutor.name`)
- Contact email — moves to a single "your contact email" field that reads from a new `tutor.email` profile field, set on first contract use; if no tutor profile email, prompt inline

**Business name override:** if tutor has a business name distinct from `tutor.name`, an inline checkbox in the More options expander: `☐ Use a separate business name [_________]`.

This refactor is independent of the AI-tool refactors and can ship in its own phase.

### 5.7 Data-viewer tools — `/tax`, `/setup`, `/insurance`, `/payments`

**No-profile state:** unchanged.

**Tutor-profile-set state:**
- Country dropdown removed
- Page header shows `Showing tax info for [United Kingdom]` (read from profile)
- Same content rendering as today — only the country source changes

### 5.8 Homepage — `index.html`

Single addition: one new FAQ entry inside the existing `<details>` block on the homepage:

> **Q: Do I have to make an account or save anything?**
>
> A: No. Slatework has no signup. There's an optional "save my setup" feature that stays in your browser, but every tool works fully without it.

No other changes to homepage layout, navigation, or tile grid. The slideshow does NOT get its own tile — it remains an extension of `/lesson-plan`.

---

## 6. Slideshow integration

### 6.1 Entry point

The slideshow is **NOT a sibling tool** in the homepage tile grid. It is an extension of `/lesson-plan`.

Trigger: button on the lesson-plan result panel labeled `Generate slideshow from this plan`. Visible only when a lesson plan has been generated successfully.

### 6.2 API: `POST /api/slideshow`

New endpoint: `functions/api/slideshow.js`.

Request body:
```json
{
  "lesson_plan_markdown": "## Lesson at a glance\n...",
  "audience_profile": "young_learner",
  "target_language": "English",
  "source_language": "Cantonese",
  "level": "A1",
  "mode": "one_to_one",
  "exam": ""
}
```

Audience profile is derived from the active student profile (if set) or from the lesson-plan form fields (if Quick lesson).

Response:
```json
{
  "slides": [
    {
      "id": "title",
      "type": "title",
      "title": "Farm animals",
      "subtitle": "Vocabulary for primary students",
      "image_keywords": []
    },
    {
      "id": "warmup",
      "type": "vocab",
      "heading": "Warm-up",
      "body": "Look at the picture. Can you say the word?",
      "image_keywords": ["cow", "farm", "cartoon"],
      "duration_min": 5
    }
    // ... ~8 slides for an 8-slide section-mirror deck
  ],
  "metadata": {
    "inferred_audience": "young_learner",
    "inferred_image_density": "high",
    "deck_style": "primary"
  },
  "alt_audiences": {
    "teen": { "tone_overrides": {...}, "image_density": "medium" },
    "adult": { "tone_overrides": {...}, "image_density": "low" },
    "exam_prep": { "tone_overrides": {...}, "image_density": "minimal" }
  }
}
```

Server-side: single Anthropic call, augmented system prompt that consumes the lesson plan markdown + audience profile and emits the structured JSON.

Rate limiting: same per-IP / per-tool / global cap pattern as other AI endpoints, via existing `_lib.js` `rateCheck()`.

### 6.3 Image source by audience profile

**Young learner:** curated cartoon illustration bundle.
- Source: implementation-time choice between **Storyset** (free with attribution; one illustrator pack for style coherence; broad corpus including kid-suitable scenes) and **Open Doodles** (CC0, no attribution required; smaller corpus). Default: Storyset for breadth — implementation must surface the required attribution (e.g., a small "Illustrations by Storyset" footer credit on the slideshow preview and inside the exported `.pptx` notes section).
- Bundle path: `/assets/illustrations/young-learner/` — ~80–120 SVGs covering animals (~20), food (~15), family (~10), body parts (~12), action verbs (~15), school objects (~12), weather (~6), numbers/colors (~10)
- Lazy-loaded per slide; total bundle ~1.5 MB
- File extraction module already supports image upload — tutor can swap any bundled image with their own via the `/marking` drop-zone pattern

**Teen / Adult:** Pexels API (photos).
- Add `https://images.pexels.com` to CSP `img-src` in `_headers`
- Image keywords from the slideshow API response feed Pexels search
- Tutor can swap any image

**Exam prep:** minimal images. Only the warmup slide gets one; other slides are text-anchored.

### 6.4 Preview rendering

Vanilla HTML component on the result panel. One `<section class="slide">` per slide. Keyboard-navigable (arrow keys advance/retreat; space/Enter activate). `prefers-reduced-motion` respected on transitions.

Audience switcher in the preview header:
```
Audience: [Young learner ▾]   ← derived; user can change
```

Switching re-renders the deck client-side using the cached `alt_audiences` from the response — no second AI call.

### 6.5 Export

PowerPoint (`.pptx`) via PptxGenJS:
- Loaded from cdnjs via `<script>` tag with SRI hash (mirroring the mammoth.js pattern at `src/lib/file-extract.js:14-20`)
- **Version pinning is an implementation-time decision**, not fixed in this spec. The implementation plan will pick the latest stable cdnjs build at the time of build (currently PptxGenJS 4.x family) and compute the `sha384-...` SRI hash against that exact build, exactly as we did for mammoth 1.7.2 in commit `3c8ffc0`.
- CSP allowance: `script-src 'self' https://cdnjs.cloudflare.com` — already in `_headers`

PDF export deferred to v2 (would require a server-side render pipeline or browser-canvas approach).

### 6.6 Deck structure

Default 8-slide section-mirror deck (Q1 from brainstorm, Option B):
1. Title (lesson title + level badge + tutor name from profile)
2. Lesson at a glance (objectives, time)
3. Warmup (5 min — content + image)
4. Core teaching block (20 min — content + image)
5. Practice / production (20 min — content + image)
6. Wrap-up + assignment (10 min — text)
7. Exit ticket / feedback prompt (text)
8. Differentiation notes (tutor-only — could be hidden in delivered deck via "Tutor notes" toggle)

For `mode=classroom`: font scale increases ~20% across all slides (projector-friendly).

---

## 7. Privacy posture

### 7.1 What changes in `/privacy`

Add a new section, after the existing IP-handling section:

> **Profiles. Slatework lets you save tutor and student profiles in your browser's `localStorage` so you don't re-enter the same information every lesson. These profiles never leave your device — they're not sent to our server, not synced, not backed up by us.**
>
> **Profiles are entirely optional. Slatework was designed to work without saved data and continues to work that way for users who never opt in.**
>
> Use nicknames or initials for student profiles if you'd rather avoid storing real names. You can:
> - Export your profiles as a JSON file (move to another device manually)
> - Import a JSON file (restore from backup)
> - Wipe all profiles in one click
>
> [Clear all profiles] [Export profiles] [Import profiles]

### 7.2 Inline privacy reassurances

Every profile editor modal shows: `This stays in your browser. Slatework's servers never see it.`

Every contextual offer ("Save settings for next time?") shows the same line.

### 7.3 What does NOT change

- No new server endpoint stores user data
- IP hashing, day-rotated fingerprints, no body logging — all unchanged
- Newsletter SHA-256 dedup unchanged
- Rate limiting unchanged

---

## 8. Migration / backwards compat

### 8.1 First-visit experience

Users with no profile in localStorage see Slatework exactly as it is today. No banner, no modal, no nudge. The only addition visible to them: the small `+ Save my setup for next time` link in tool-page headers.

### 8.2 URL parameters continue to work

Tools accept query parameters for pre-filling fields (`?level=B1&target=Spanish&exam=GCSE+Spanish`). This supports:
- Old bookmarks
- Shared links between tutors
- Cross-tool flow (`?from=lesson-plan` carries data without requiring a profile)

URL params take precedence over profile values for that visit. Profile is not overwritten by URL params.

### 8.3 Schema migration

Top-level `schema: 1` field. Future migrations check the version and migrate the JSON shape on load. Migration code path is dormant in v1.

---

## 9. Implementation phases

| Phase | Deliverable | Estimated effort | Dependencies |
|---|---|---|---|
| **A** | `src/lib/profile.js` — data model, localStorage CRUD, JSON import/export, audience-derivation, preferences. Includes unit-style smoke tests. | 2–3 hr | None |
| **B** | UI atoms — tutor strip, student strip, profile editor modal, "Adjust for today" expander, "Don't know?" inline check. CSS in `styles.css`. JS in `src/lib/profile-ui.js`. | 4–6 hr | A |
| **C** | Refactor 4 AI tool pages: `/lesson-plan`, `/worksheet`, `/marking`, `/cefr`. Each: integrate strip, switch form to profile-driven mode, keep no-profile fallback, add CEFR glosses + Don't-know inline check (Layers 1+2 apply regardless of profile state). | 6–8 hr | A, B |
| **D** | Refactor `/contract.html` with progressive disclosure (`More options ▾`). Independent of profile work — can run in parallel with C. | 3–4 hr | None (independent) |
| **E** | Refactor 4 data-viewer tools (`/tax`, `/setup`, `/insurance`, `/payments`) and `/rates` to read tutor-profile country. | 1–2 hr | A, B |
| **F** | Update `/privacy` with profile section and Clear/Export/Import buttons. Add new homepage FAQ entry. | 30 min – 1 hr | A |
| **G** | Slideshow build: `functions/api/slideshow.js` worker, `src/lib/slideshow-render.js` client, illustration bundle at `/assets/illustrations/young-learner/`, PptxGenJS integration. Extension button on `/lesson-plan` result. | 8–12 hr | A, B, C (lesson-plan refactor) |

**Total Phase A–F (UX cleanup):** 17–24 hours focused work (~2.5–3 days).
**Plus G (slideshow):** 8–12 hours (~1–1.5 days).

Atomic commits per phase, conventional-commits format. Each phase ends in a deployable state.

### 9.1 Suggested ship order

1. A + B (foundation; no UI exposed yet)
2. F (privacy text — ship before UI exposes the feature)
3. C (AI tool refactors — main UX win lands here)
4. E (data-viewer cleanup — small win, fast)
5. D (contract refactor — independent, can slot anywhere)
6. G (slideshow — final feature)

---

## 10. Risks & tradeoffs

### 10.1 Active risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Tutor opts in, then switches to a new device, loses profiles | Medium | Medium | JSON export/import buttons. Document on `/privacy`. |
| `localStorage` cleared by user / browser policy | Low | Medium | Same: export/import. Profile loss does not break tools (they fall back to today's form). |
| Tutor accidentally enters real student PII as nickname | Medium | Low (data stays in browser) | Placeholder text "e.g., Lily, J.K., Wed-evening kid" + privacy caption on every editor surface |
| Profile feature feels like an account / signup | Medium | High (positioning) | Opt-in only, explicit "you don't have to" copy on 7+ surfaces, Quick-lesson exit always visible |
| Quick-check level mapping is wrong for an edge-case student | Medium | Low | Override always available; `/cefr.html` deeper tool still exists; `level_set_via` field flags the source |
| `contract.html` progressive disclosure hides a field a tutor needs | Medium | Low | Field count visible in the toggle text ("More options (4 fields)"); fields are one click away |
| Slideshow AI call output drifts from spec (model returns slides in wrong shape) | Low | Medium | JSON-shape validation server-side; fall back to a default deck structure if validation fails; log errors via existing observability path |
| Cartoon bundle covers <90% of common A1–A2 vocab → tutor frustrated by missing illustrations | Medium | Medium | Tutor swap-out via file upload (existing `/marking` pattern); optional v2 escalation to AI image gen |

### 10.2 Tradeoffs accepted

- **No multi-device sync in v1.** Tutors using Slatework on a laptop AND a phone will have separate profile lists. Documented. v2 may add optional encrypted sync.
- **Slight extra Anthropic token spend per slideshow generation** (~50–100 tokens for `alt_audiences` payload). Pays off the first time anyone clicks the audience switcher; avoids a second AI call.
- **First-time tutor setup is 30 seconds longer** (creating the first profile vs. just filling the form). Amortized after lesson 2.
- **Profile feature is invisible to most users.** That's the point. It serves the 20–40% who want it without inflicting on the 60–80% who don't.

---

## 11. Out of scope (deferred to v0.3+)

- **Cross-device profile sync.** Optional encrypted sync via Cloudflare KV with a user-derived passphrase. v2 candidate.
- **Multi-tutor support.** This spec assumes one tutor per browser. Households with two tutors sharing a computer would need separate browser profiles or browser users.
- **Profile sharing between tutors.** Export/import is manual JSON file transfer in v1. No share-link feature.
- **AI image generation for slideshows.** Pexels + curated bundle in v1. Imagen / DALL-E / SDXL deferred until cost economics shift or specific tutor demand surfaces.
- **PDF export of slideshows.** PptxGenJS only in v1. PDF deferred.
- **Slideshow content regeneration (different prompt, same slides).** v1 reuses lesson-plan content. v2 might add "regenerate this slide" per-slide.
- **Per-slide image swap UI for adult/exam decks.** v1 supports tutor upload via the `/marking` drop-zone pattern, but the swap UX is minimal. v2 could add Pexels image search inline.
- **Historical lesson archive per student.** v1 stores nothing about generated content. Profile is data, not history.
- **Templates from saved lessons** ("Generate a similar lesson to last week's"). Out of scope.

---

## 12. Acceptance criteria (for verification phase)

The implementation is complete when:

- [ ] A user with no profile can use every AI tool exactly as today (verified: form looks unchanged, generates correctly, no banners/modals appear).
- [ ] CEFR glosses appear in the level dropdown on every AI tool page (no-profile and profile-set states).
- [ ] The "Don't know? Quick check" inline expander appears next to every level field and produces a level value when completed.
- [ ] A user can save a student profile, see the strip appear at the top of AI tool pages, and have the form auto-pre-fill on next visit.
- [ ] "Quick lesson →" button restores the no-profile form for the current session without deleting the saved profile.
- [ ] Tutor profile strip shows on data-viewer tools when a country is set; pages render the country's data without a dropdown click.
- [ ] `contract.html` shows 7 fields by default; "More options (4)" expander reveals the rest.
- [ ] `/privacy` page has the profile section, Clear/Export/Import buttons function correctly.
- [ ] `+ Save my setup` link appears in the no-profile state of every AI tool.
- [ ] Contextual offer ("Save these settings?") appears at most 3 times across the browser lifetime, has a "Don't ask again" option, and never reappears after dismissal.
- [ ] Slideshow extension button appears on the lesson-plan result panel and generates a valid 8-slide deck.
- [ ] Generated decks for `audience_profile=young_learner` use cartoon illustrations from the bundle, not photos.
- [ ] Generated decks for `audience_profile=adult/teen` use Pexels photos.
- [ ] Audience switcher on the slideshow preview re-renders the deck client-side without a second AI call.
- [ ] PptxGenJS export produces a valid `.pptx` file viewable in PowerPoint, Keynote, and Google Slides.
- [ ] Strict CSP unchanged; no `unsafe-inline` reintroduced.
- [ ] `localStorage` failures (private browsing, quota) fail open: site continues to function as if no profile exists.
- [ ] All new copy passes the "you don't have to" check: every profile-related surface says or implies that profiles are optional.
- [ ] WCAG 2.2 AA compliance maintained on all new UI atoms (verified via `accessibility` skill rubric: focus order, ARIA, contrast, keyboard support).
- [ ] Lighthouse scores on `/lesson-plan` (largest changed page) maintain or improve their pre-spec values (currently A11y 9.4, Perf 9.0).

---

## 13. References

- Brainstorm transcript: 2026-05-09 session (this spec is the formal output)
- Prior spec: `docs/superpowers/specs/2026-05-06-slatework-design.md`
- 2026-05-08 multi-skill audit: `docs/superpowers/reviews/2026-05-08-multi-skill-audit.md`
- Slideshow marketplace research: `docs/superpowers/research/2026-05-07-slideshow-marketplace-scan.md`
- 7 announced launch countries: `docs/superpowers/launch/posts/show-hn.md:33`
- mammoth.js SRI pattern: `src/lib/file-extract.js:14-20` (commit `3c8ffc0`)
- Anthropic API discipline: `functions/api/_lib.js`
- Country pack format: `data/countries/*.json`
- Existing `setup.html` localStorage pattern (precedent for profile storage)

---

**End of design spec.** Implementation plan to follow via the `writing-plans` skill.
