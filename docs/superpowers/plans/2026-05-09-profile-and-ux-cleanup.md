# Profile Architecture + UX Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the optional, opt-in client-side profile system (one tutor + many students) and refactor the eight tool surfaces around it so that tutors stop re-entering the same five fields per student per week — without breaking the existing no-profile flows or the strict CSP.

**Architecture:** A single `src/lib/profile.js` module exposes a versioned `Slatework.Profile.*` namespace backed by `localStorage` under key `slatework.profiles.v1`, with fail-open reads so quota / private-browsing failures degrade silently. A second `src/lib/profile-ui.js` module renders three reusable atoms (tutor strip, student strip, profile-editor `<dialog>`) plus two inline helpers (CEFR Don't-know quick-check, Adjust-for-today expander). Each consuming page imports both modules with `defer`, mounts the atoms idempotently if the relevant DOM hooks exist, and falls back to today's behaviour when no profile is set. Phases D (contract progressive disclosure) and F (privacy + FAQ) are independent leaves of the same tree.

**Tech Stack:** Vanilla HTML/CSS/JS, localStorage API, native `<dialog>` element, no build step

**Source spec:** `docs/superpowers/specs/2026-05-09-profile-architecture-and-ux-cleanup-design.md` (committed at 04840e1)

**Followup plan:** `docs/superpowers/plans/2026-05-09-slideshow-feature.md` (Phase G — depends on this plan being complete)

**Pre-existing work to retire:** `src/lib/profile.js` and `src/lib/profile.test.js` already exist on disk from earlier exploratory work but use a flat `Slatework.*` namespace and a different schema (no `target/source/level/mode/exam`). They do **not** match the spec or the slideshow plan's expectations and must be replaced by Task A1's implementation. The existing `tests/profile-smoke-test.html` page can be reused as the smoke-test harness in Phase A and updated to call the new namespaced API.

---

## File structure

| File | Action | Responsibility |
|---|---|---|
| `src/lib/profile.js` | Replace | Owns the versioned `Slatework.Profile.*` namespace: tutor + student CRUD, current-student selection, JSON import/export, audience derivation, preferences (contextual-offer counter, dismissed flag), schema validation, fail-open localStorage handling. |
| `src/lib/profile-ui.js` | Create | Owns reusable UI atoms: `Slatework.ProfileUI.mountTutorStrip(opts)`, `mountStudentStrip(opts)`, `openEditor(opts)`, `mountQuickCheck(targetSelectId)`, `mountAdjustForToday(opts)`, `mountSavePrompt(opts)`. Each is a no-op if its container element is absent so pages can opt in independently. |
| `tests/profile-smoke-test.html` | Replace | Browser smoke-test runner. Loads the live `profile.js`, calls every public API, asserts results, prints a green/red summary in the page. Engineer opens this in a browser between commits. |
| `src/lib/styles.css` | Modify | Add the profile-related selectors: `.tutor-strip`, `.student-strip`, `.profile-editor`, `.profile-editor::backdrop`, `.cefr-quick-check`, `.adjust-for-today`, `.profile-empty-link`, `.profile-actions`, `.visually-hidden`. Dark-mode safe (uses existing tokens only). |
| `lesson-plan.html` | Modify | Insert tutor + student strip mount points + Save-link header + extension result-panel block. Add `<script src="/src/lib/profile.js">` and `<script src="/src/lib/profile-ui.js">` tags before the page-script tag. |
| `worksheet.html` | Modify | Same pattern as lesson-plan minus the result-panel extensions. |
| `marking.html` | Modify | Same pattern as worksheet. |
| `cefr.html` | Modify | Add tutor-strip + Save-this-level-to-profile button on result panel. No student strip (cefr.html is the tool that *creates* the level). |
| `src/lib/page-lesson-plan.js` | Modify | Read `Slatework.Profile.getCurrentStudent()`, pre-fill form fields, render tutor/student strip via `ProfileUI`, mount `Adjust for today` and CEFR Don't-know expander, register the slideshow extension button (placeholder — Phase G implements the handler), keep URL-param + Quick-lesson fallbacks. |
| `src/lib/page-worksheet.js` | Modify | Same pattern minus extension buttons. Honour `?topic=&from=lesson-plan` URL params. |
| `src/lib/page-marking.js` | Modify | Same pattern minus extension buttons. Honour `?from=lesson-plan` URL params. |
| `src/lib/page-cefr.js` | Modify | After result render, surface Save-to-profile button calling `Slatework.Profile.addStudent({..., level_set_via: 'cefr_tool'})`. |
| `contract.html` | Modify | Reorder fields: 7 always-visible + 4 inside `<details><summary>More options (4 fields)</summary>`. Remove Tutor name + Contact email when tutor profile present (read from profile). |
| `src/lib/page-contract.js` | Modify | When `Slatework.Profile.getTutor()` returns non-null, hide the inline Tutor-name and Contact-email inputs and source those values from the profile. Pre-fill Subject from current student profile target language. Preserve existing live-render and print behaviour. |
| `rates.html` | Modify | Insert tutor-strip mount slot. Hide country dropdown when tutor profile country is set; add inline Change link. Pre-fill language pair from current student. |
| `src/lib/page-rates.js` | Modify | Read tutor country + current student target/source via `Slatework.Profile.*`; bypass country dropdown when set; auto-select language pair if matching pair exists. |
| `tax.html`, `setup.html`, `insurance.html`, `payments.html` | Modify | Insert tutor-strip mount slot at top; add a `data-profile-country-bound` marker on the existing country select so the page script can hide/replace it. |
| `src/lib/page-tax.js`, `src/lib/page-setup.js`, `src/lib/page-insurance.js`, `src/lib/page-payments.js` | Modify | When tutor country is set, auto-select that country, hide the dropdown, and render `Showing X for [Country] [✎ change]` under the H1. |
| `privacy.html` | Modify | Add `<section id="profile-data">` with the spec §7.1 copy and three buttons (Clear / Export / Import). Include a tiny inline-deferred script tag pointing at `/src/lib/page-privacy.js`. |
| `src/lib/page-privacy.js` | Create | Wires the Clear/Export/Import buttons to `Slatework.Profile.clearAll()`, `exportAsJson()`, `importFromJson()`. Includes a hidden `<input type="file" accept="application/json">` for the Import flow. |
| `index.html` | Modify | Add one new `<details>` FAQ entry "Do I have to make an account or save anything?" inside the existing FAQ block; mirror the same Q&A in the page's `FAQPage` JSON-LD schema. |

---

## Suggested ship order (per spec §9.1)

1. **Phase A** — replace `profile.js`, smoke-test (no UI yet)
2. **Phase B** — build `profile-ui.js` + CSS (no pages mount yet)
3. **Phase F** — privacy text + FAQ ship before any UI exposes the feature
4. **Phase C** — refactor 4 AI tool pages (main UX win)
5. **Phase E** — refactor 4 data-viewer tools + rates (small win, fast)
6. **Phase D** — contract progressive disclosure (independent, can slot anywhere)

Each task ends in an atomic commit. Conventional-commits prefix per task. Re-deploy to the live `slatework.tools` Cloudflare Pages branch is a manual step at the end of each phase (Darren's call).

---

## Phase A — Profile data layer

### Task A1: Replace `src/lib/profile.js` with the spec-conformant namespaced module

**Files:**
- Replace: `src/lib/profile.js`

- [ ] **Step 1: Open `tests/profile-smoke-test.html` in a browser to confirm the existing tests fail against the new contract**

The current smoke-test page calls `Slatework.getTutor()` (flat). After we replace `profile.js`, those calls need to become `Slatework.Profile.getTutor()`. This step is purely diagnostic — observe the broken page so we know what we're replacing.

Run: `npx wrangler pages dev .` (or any static server). Open `http://localhost:8788/tests/profile-smoke-test.html`.
Expected: page loads but throws `TypeError: Slatework.getTutor is not a function` once we land Step 3 (because we will namespace under `Profile`). For now confirm what the existing API surface is so the rewrite has nothing missed.

- [ ] **Step 2: Write the new `profile.js` (replace the existing file in full)**

Replace `src/lib/profile.js` with the following file. Note: the IIFE pattern, `(window.Slatework = window.Slatework || {})`, and the `Profile` sub-namespace exactly match the slideshow plan's expectations (`Slatework.Profile.getCurrentStudent()`, `Slatework.Profile.deriveAudience(...)`, etc.).

```js
// src/lib/profile.js
// Slatework Profile module — owns the versioned Slatework.Profile.* namespace.
//
// Storage:   localStorage key 'slatework.profiles.v1'
// Failure:   localStorage failures fail open (return null/empty, site continues).
// Privacy:   never sent to any server. All data is browser-local.
// Spec:      docs/superpowers/specs/2026-05-09-profile-architecture-and-ux-cleanup-design.md
//
// Public API (everything users of this module touch):
//   getTutor(), setTutor(p), clearTutor()
//   getStudents(), getStudent(id), getCurrentStudent(), setCurrentStudent(id|null), clearCurrentStudent()
//   addStudent(p), updateStudent(id, partial), deleteStudent(id)
//   hasAnyProfile()
//   exportAsJson(), importFromJson(s), clearAll()
//   deriveAudience({level, mode, exam}) -> 'young_learner'|'teen'|'adult'|'exam_prep'
//   getPreferences(), bumpContextualOfferShown(), dismissContextualOffer(), shouldShowContextualOffer()

(() => {
  const SW = (window.Slatework = window.Slatework || {});
  const STORAGE_KEY = 'slatework.profiles.v1';
  const SCHEMA_VERSION = 1;
  const COUNTRY_ALLOWLIST = ['US', 'GB', 'CA', 'AU', 'NZ', 'IE', 'HK'];
  const CONTEXTUAL_OFFER_MAX_SHOWS = 3;

  // ---- internal: storage ----

  function emptyShape() {
    return {
      schema: SCHEMA_VERSION,
      tutor: null,
      students: [],
      current_student_id: null,
      preferences: {
        contextual_offer_dismissed: false,
        contextual_offer_shown_count: 0
      }
    };
  }

  function read() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyShape();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return emptyShape();
      if (parsed.schema !== SCHEMA_VERSION) return emptyShape(); // future-proof migration anchor
      // Defensive defaults — old shapes get patched up rather than discarded.
      parsed.tutor = parsed.tutor || null;
      parsed.students = Array.isArray(parsed.students) ? parsed.students : [];
      if (typeof parsed.current_student_id === 'undefined') parsed.current_student_id = null;
      parsed.preferences = parsed.preferences || {
        contextual_offer_dismissed: false,
        contextual_offer_shown_count: 0
      };
      return parsed;
    } catch (err) {
      // Private browsing, quota, JSON.parse error — fail open.
      return emptyShape();
    }
  }

  function write(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (err) {
      return false;
    }
  }

  // ---- internal: helpers ----

  function nowIso() { return new Date().toISOString(); }

  function genId(nickname) {
    const slug = String(nickname || 'student')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24) || 'student';
    const date = new Date().toISOString().slice(0, 10);
    const rand = Math.random().toString(36).slice(2, 6);
    return `${slug}-${date}-${rand}`;
  }

  // Currency derived from country pack — these match data/countries/*.json.
  const COUNTRY_TO_CURRENCY = {
    US: 'USD', GB: 'GBP', CA: 'CAD', AU: 'AUD', NZ: 'NZD', IE: 'EUR', HK: 'HKD'
  };

  // ---- public: tutor ----

  function getTutor() {
    return read().tutor;
  }

  function setTutor(partial) {
    if (!partial || typeof partial !== 'object') return null;
    const country = String(partial.country || '').toUpperCase();
    if (!COUNTRY_ALLOWLIST.includes(country)) return null;
    const state = read();
    const existing = state.tutor || {};
    const next = {
      country,
      currency: COUNTRY_TO_CURRENCY[country] || existing.currency || 'USD',
      name: typeof partial.name === 'string' ? partial.name.trim() : (existing.name || ''),
      email: typeof partial.email === 'string' ? partial.email.trim() : (existing.email || ''),
      business_name: typeof partial.business_name === 'string'
        ? partial.business_name.trim()
        : (existing.business_name || ''),
      set_at: existing.set_at || nowIso()
    };
    state.tutor = next;
    return write(state) ? next : null;
  }

  function clearTutor() {
    const state = read();
    state.tutor = null;
    return write(state);
  }

  // ---- public: students ----

  function getStudents() {
    return read().students.slice();
  }

  function getStudent(id) {
    return read().students.find(s => s.id === id) || null;
  }

  function getCurrentStudent() {
    const state = read();
    if (!state.current_student_id) return null;
    return state.students.find(s => s.id === state.current_student_id) || null;
  }

  function setCurrentStudent(id) {
    const state = read();
    if (id === null) {
      state.current_student_id = null;
      return write(state);
    }
    if (!state.students.some(s => s.id === id)) return false;
    state.current_student_id = id;
    return write(state);
  }

  function clearCurrentStudent() {
    return setCurrentStudent(null);
  }

  function addStudent(p) {
    if (!p || typeof p !== 'object') return null;
    if (!p.nickname || typeof p.nickname !== 'string') return null;
    const state = read();
    const id = genId(p.nickname);
    const level = String(p.level || 'B1').toUpperCase();
    const mode = String(p.mode || 'one_to_one');
    const exam = (typeof p.exam === 'string' ? p.exam : '').trim();
    const audience = p.audience_profile || deriveAudience({level, mode, exam});
    const student = {
      id,
      nickname: p.nickname.trim(),
      target: String(p.target || ''),
      source: String(p.source || 'English'),
      level,
      level_set_via: p.level_set_via || 'manual',
      mode,
      exam,
      audience_profile: audience,
      audience_set_via: p.audience_profile ? 'manual' : 'auto',
      notes: typeof p.notes === 'string' ? p.notes.trim() : '',
      created_at: nowIso(),
      last_used_at: nowIso()
    };
    state.students.push(student);
    if (!state.current_student_id) state.current_student_id = id;
    return write(state) ? student : null;
  }

  function updateStudent(id, partial) {
    if (!partial || typeof partial !== 'object') return null;
    const state = read();
    const idx = state.students.findIndex(s => s.id === id);
    if (idx === -1) return null;
    const merged = { ...state.students[idx], ...partial, id, last_used_at: nowIso() };
    if (partial.level || partial.mode || partial.exam) {
      merged.audience_profile = partial.audience_profile
        || deriveAudience({level: merged.level, mode: merged.mode, exam: merged.exam});
      merged.audience_set_via = partial.audience_profile ? 'manual' : 'auto';
    }
    state.students[idx] = merged;
    return write(state) ? merged : null;
  }

  function deleteStudent(id) {
    const state = read();
    const before = state.students.length;
    state.students = state.students.filter(s => s.id !== id);
    if (state.current_student_id === id) state.current_student_id = null;
    return state.students.length < before && write(state);
  }

  function hasAnyProfile() {
    const state = read();
    return !!state.tutor || state.students.length > 0;
  }

  // ---- public: bulk ----

  function exportAsJson() {
    return JSON.stringify(read(), null, 2);
  }

  function importFromJson(s) {
    try {
      const parsed = JSON.parse(s);
      if (!parsed || parsed.schema !== SCHEMA_VERSION) return false;
      // Trust import only at the schema level; do not run wider validation
      // because the user's exported file was produced by exportAsJson() so we
      // can rely on its shape.
      return write(parsed);
    } catch (err) {
      return false;
    }
  }

  function clearAll() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (err) {
      return false;
    }
  }

  // ---- public: audience derivation ----
  // Spec §3.5. Pure function; no storage access.

  function deriveAudience({level, mode, exam} = {}) {
    const trimmedExam = typeof exam === 'string' ? exam.trim() : '';
    if (trimmedExam.length >= 2) return 'exam_prep';
    const lvl = String(level || '').toUpperCase();
    if (lvl === 'A1' || lvl === 'A2') return 'young_learner';
    if (lvl === 'B1') return 'teen';
    if (lvl === 'B2' || lvl === 'C1' || lvl === 'C2') return 'adult';
    return 'adult'; // safe default for unrecognised levels
  }

  // ---- public: preferences ----

  function getPreferences() {
    return Object.assign({}, read().preferences);
  }

  function bumpContextualOfferShown() {
    const state = read();
    state.preferences.contextual_offer_shown_count =
      (state.preferences.contextual_offer_shown_count || 0) + 1;
    return write(state);
  }

  function dismissContextualOffer() {
    const state = read();
    state.preferences.contextual_offer_dismissed = true;
    return write(state);
  }

  function shouldShowContextualOffer() {
    const p = read().preferences;
    if (p.contextual_offer_dismissed) return false;
    return (p.contextual_offer_shown_count || 0) < CONTEXTUAL_OFFER_MAX_SHOWS;
  }

  // ---- expose namespace ----

  SW.Profile = Object.freeze({
    // tutor
    getTutor, setTutor, clearTutor,
    // students
    getStudents, getStudent, getCurrentStudent, setCurrentStudent, clearCurrentStudent,
    addStudent, updateStudent, deleteStudent, hasAnyProfile,
    // bulk
    exportAsJson, importFromJson, clearAll,
    // derivation
    deriveAudience,
    // preferences
    getPreferences, bumpContextualOfferShown, dismissContextualOffer, shouldShowContextualOffer,
    // constants exposed for UI (read-only)
    COUNTRY_ALLOWLIST: Object.freeze(COUNTRY_ALLOWLIST.slice()),
    SCHEMA_VERSION
  });
})();
```

- [ ] **Step 3: Update `tests/profile-smoke-test.html` to drive the new namespaced API**

Replace the file's body and runner with the version below. The `<script src="/src/lib/profile.js">` tag stays, but the inline-style assertions need to talk to `Slatework.Profile.*`. Note: this page is a TEST harness, not a production page — inline `<script>` is acceptable here because the page is excluded from the deploy via `.gitignore` rules and is never served from `slatework.tools/` (verify via `git status` that no `_redirects` or sitemap references the path; if it does, gate the script behind a CSP-clean external file instead).

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Profile module smoke tests</title>
  <link rel="stylesheet" href="/src/lib/styles.css" />
  <style>
    .pass { color: #16a34a; }
    .fail { color: #b91c1c; font-weight: 700; }
    pre { background: #0f172a; color: #f8fafc; padding: 1rem; overflow: auto; max-height: 60vh; }
    button { margin-right: .5rem; }
  </style>
</head>
<body>
  <main class="container">
    <h1>Profile smoke tests</h1>
    <p>Click <strong>Run</strong>. Expected: every line says <code class="pass">PASS</code>. The runner clears localStorage between tests, then wipes everything at the end.</p>
    <button id="run">Run</button>
    <button id="wipe">Clear localStorage and reload</button>
    <pre id="out">(not yet run)</pre>
  </main>
  <script src="/src/lib/profile.js"></script>
  <script src="/tests/profile-smoke-test.js"></script>
</body>
</html>
```

Then create `tests/profile-smoke-test.js` (sibling file — keeps the runner CSP-clean and avoids inline `<script>`):

```js
// tests/profile-smoke-test.js
// Browser-driven smoke tests for src/lib/profile.js.
// Open /tests/profile-smoke-test.html, click Run.

(() => {
  const out = document.getElementById('out');
  const runBtn = document.getElementById('run');
  const wipeBtn = document.getElementById('wipe');
  const P = () => window.Slatework && window.Slatework.Profile;
  const lines = [];
  const log = (cls, msg) => lines.push(`<span class="${cls}">${cls.toUpperCase()}</span>  ${msg}`);
  const pass = (m) => log('pass', m);
  const fail = (m) => log('fail', m);
  const assertEq = (actual, expected, label) => {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a === e) pass(label);
    else fail(`${label} — expected ${e}, got ${a}`);
  };
  const assert = (cond, label) => cond ? pass(label) : fail(label);

  function clearStorage() {
    try { localStorage.removeItem('slatework.profiles.v1'); } catch (_) {}
  }

  function run() {
    lines.length = 0;
    clearStorage();
    if (!P()) { fail('Slatework.Profile not loaded'); render(); return; }

    // 1. Empty state
    assertEq(P().getTutor(), null, 'getTutor() empty -> null');
    assertEq(P().getStudents(), [], 'getStudents() empty -> []');
    assertEq(P().getCurrentStudent(), null, 'getCurrentStudent() empty -> null');
    assert(!P().hasAnyProfile(), 'hasAnyProfile() empty -> false');

    // 2. setTutor + getTutor
    const t = P().setTutor({country: 'GB', name: 'Sarah Chen', email: 'a@b.com'});
    assert(t && t.country === 'GB', 'setTutor() returns the tutor record');
    assertEq(P().getTutor().country, 'GB', 'getTutor() persists country');
    assertEq(P().getTutor().currency, 'GBP', 'tutor.currency derived from country');
    assert(P().hasAnyProfile(), 'hasAnyProfile() true after setTutor');

    // 3. setTutor rejects invalid country
    assertEq(P().setTutor({country: 'ZZ', name: 'X'}), null, 'setTutor() rejects unknown country');

    // 4. addStudent
    const lily = P().addStudent({
      nickname: 'Lily', target: 'English', source: 'Cantonese',
      level: 'A1', mode: 'one_to_one', exam: ''
    });
    assert(lily && /lily-/.test(lily.id), 'addStudent() returns student with id slug');
    assertEq(lily.audience_profile, 'young_learner', 'A1 derives young_learner');
    assertEq(P().getStudents().length, 1, 'students list grows');
    assertEq(P().getCurrentStudent().id, lily.id, 'first student becomes current');

    // 5. addStudent without nickname rejected
    assertEq(P().addStudent({level: 'B1'}), null, 'addStudent() rejects missing nickname');

    // 6. updateStudent + audience re-derivation
    const updated = P().updateStudent(lily.id, {level: 'B2'});
    assertEq(updated.audience_profile, 'adult', 'B2 update re-derives adult');

    // 7. exam overrides audience
    const examUpdate = P().updateStudent(lily.id, {level: 'B2', exam: 'GCSE Spanish'});
    assertEq(examUpdate.audience_profile, 'exam_prep', 'non-empty exam -> exam_prep');

    // 8. deriveAudience pure function
    assertEq(P().deriveAudience({level: 'A1', mode: 'classroom', exam: ''}), 'young_learner', 'derive A1');
    assertEq(P().deriveAudience({level: 'B1', mode: 'one_to_one', exam: ''}), 'teen', 'derive B1');
    assertEq(P().deriveAudience({level: 'C1', mode: 'one_to_one', exam: ''}), 'adult', 'derive C1');
    assertEq(P().deriveAudience({level: 'A2', mode: 'one_to_one', exam: 'IELTS'}), 'exam_prep', 'derive exam beats level');

    // 9. add second student, switch current
    const carlos = P().addStudent({
      nickname: 'Carlos', target: 'Spanish', source: 'English',
      level: 'C1', mode: 'one_to_one'
    });
    assertEq(P().getStudents().length, 2, 'two students stored');
    assert(P().setCurrentStudent(carlos.id), 'setCurrentStudent(carlos)');
    assertEq(P().getCurrentStudent().id, carlos.id, 'current is carlos');

    // 10. setCurrentStudent rejects unknown id
    assert(!P().setCurrentStudent('does-not-exist'), 'setCurrentStudent rejects unknown id');

    // 11. delete student clears current if needed
    P().deleteStudent(carlos.id);
    assertEq(P().getCurrentStudent(), null, 'deleting current clears current_student_id');
    assertEq(P().getStudents().length, 1, 'only lily remains');

    // 12. JSON export/import round-trip
    const exported = P().exportAsJson();
    P().clearAll();
    assertEq(P().getStudents(), [], 'clearAll wiped students');
    assert(P().importFromJson(exported), 'importFromJson returns true');
    assertEq(P().getStudents().length, 1, 'imported students restored');

    // 13. Schema mismatch rejected
    const bad = JSON.stringify({schema: 999, tutor: null, students: []});
    assert(!P().importFromJson(bad), 'importFromJson rejects wrong schema');

    // 14. Preferences counter + dismiss
    P().clearAll();
    assert(P().shouldShowContextualOffer(), 'fresh state shows offer');
    P().bumpContextualOfferShown();
    P().bumpContextualOfferShown();
    P().bumpContextualOfferShown();
    assert(!P().shouldShowContextualOffer(), 'three shows -> stop showing');
    P().clearAll();
    P().dismissContextualOffer();
    assert(!P().shouldShowContextualOffer(), 'dismiss -> stop showing');

    // 15. Fail-open: simulate unavailable storage by stubbing setItem to throw
    P().clearAll();
    const realSet = localStorage.setItem.bind(localStorage);
    localStorage.setItem = () => { throw new Error('quota'); };
    try {
      const failResult = P().setTutor({country: 'US'});
      assertEq(failResult, null, 'setTutor returns null when write fails');
    } finally {
      localStorage.setItem = realSet;
    }

    // tidy
    P().clearAll();
    render();
  }

  function render() {
    out.innerHTML = lines.join('\n');
    const failures = lines.filter(l => l.includes('class="fail"')).length;
    out.innerHTML += `\n\n${failures === 0 ? '✓ ALL PASS' : '✗ ' + failures + ' FAILED'}`;
  }

  runBtn.addEventListener('click', run);
  wipeBtn.addEventListener('click', () => { clearStorage(); location.reload(); });
})();
```

- [ ] **Step 4: Run the smoke tests in a browser**

Run: `npx wrangler pages dev .` (or `python -m http.server 8788` from the repo root).
Open `http://localhost:8788/tests/profile-smoke-test.html`.
Click Run.
Expected: every line shows `PASS` (green); final line `✓ ALL PASS`. If any line is red, fix the offending function in `profile.js` and re-run.

- [ ] **Step 5: Commit**

```bash
git add src/lib/profile.js tests/profile-smoke-test.html tests/profile-smoke-test.js
git commit -m "feat(profile): add Slatework.Profile namespace + smoke tests"
```

### Task A2: Add `<script src="/src/lib/profile.js" defer>` to all 11 tool pages

**Files:**
- Modify: `lesson-plan.html`, `worksheet.html`, `marking.html`, `cefr.html`, `rates.html`, `contract.html`, `tax.html`, `setup.html`, `insurance.html`, `payments.html`, `index.html`

The module is small (~6 KB) and has zero side effects beyond attaching `Slatework.Profile`. Loading it on every tool page costs ~1 KB gzipped and lets later pages opt in without HTML changes.

- [ ] **Step 1: Add the script tag to `lesson-plan.html`**

Find the existing scripts at the bottom (`<script src="/src/lib/countries.js?v=14"></script>` etc.) and insert the profile script BEFORE `page-lesson-plan.js`. Bump the cache-buster version too — change all `?v=14` to `?v=15` on this page (so users get a fresh load after deploy).

```html
<script src="/src/lib/countries.js?v=15"></script>
<script src="/src/lib/markdown.js?v=15"></script>
<script src="/src/lib/profile.js?v=15"></script>
<script src="/feedback.js?v=15" defer></script>
<script src="/src/lib/page-lesson-plan.js?v=15" defer></script>
```

Also bump the stylesheet:
```html
<link rel="stylesheet" href="/src/lib/styles.css?v=15" />
```

- [ ] **Step 2: Repeat the same edit on the other 10 pages**

For each of `worksheet.html`, `marking.html`, `cefr.html`, `rates.html`, `contract.html`, `tax.html`, `setup.html`, `insurance.html`, `payments.html`, `index.html`:
1. Bump `?v=14` to `?v=15` on every `src/lib/*` link/script tag.
2. Insert `<script src="/src/lib/profile.js?v=15"></script>` immediately before each page's `page-*.js` tag.

For pages that DON'T currently load `countries.js` (e.g. `worksheet.html`, `marking.html`, `cefr.html`), put `profile.js` directly above the `page-*.js` line.

- [ ] **Step 3: Open every page once in a browser to confirm no regression**

Run: `npx wrangler pages dev .`
Visit each of the 11 tool pages. Open DevTools console. Confirm no `Slatework is not defined` errors and that `Slatework.Profile` is truthy on every page:
```js
typeof Slatework.Profile === 'object' && typeof Slatework.Profile.getTutor === 'function'
```
Expected: `true` on every page.

- [ ] **Step 4: Commit**

```bash
git add lesson-plan.html worksheet.html marking.html cefr.html rates.html contract.html tax.html setup.html insurance.html payments.html index.html
git commit -m "chore(profile): wire profile.js + bump cache-buster to v15"
```

### Task A3: Document the new public API in `docs/`

**Files:**
- Create: `docs/superpowers/notes/2026-05-09-profile-api.md`

Engineers reading the spec or executing later tasks need a single page that lists the function signatures with examples. The spec has them but in prose; a flat reference file beats grep-the-spec.

- [ ] **Step 1: Write the API reference**

Create `docs/superpowers/notes/2026-05-09-profile-api.md`:

```markdown
# Slatework.Profile API reference

Source: `src/lib/profile.js` · Spec: `docs/superpowers/specs/2026-05-09-profile-architecture-and-ux-cleanup-design.md`

## Tutor
| Method | Returns | Notes |
|---|---|---|
| `getTutor()` | `{country, currency, name, email, business_name, set_at}` or `null` | |
| `setTutor({country, name?, email?, business_name?})` | tutor object or `null` | Country must be in `COUNTRY_ALLOWLIST` |
| `clearTutor()` | `bool` | Does NOT delete students |

## Students
| Method | Returns | Notes |
|---|---|---|
| `getStudents()` | array (copy) | Safe to mutate caller-side; reads re-fetch fresh |
| `getStudent(id)` | object or `null` | |
| `getCurrentStudent()` | object or `null` | |
| `setCurrentStudent(id\|null)` | `bool` | Validates id exists |
| `clearCurrentStudent()` | `bool` | Alias for `setCurrentStudent(null)` |
| `addStudent({nickname, target, source, level, mode, exam?, audience_profile?, notes?, level_set_via?})` | new student or `null` | First student becomes current automatically |
| `updateStudent(id, partial)` | merged student or `null` | Re-derives audience if level/mode/exam change |
| `deleteStudent(id)` | `bool` | Clears `current_student_id` if it matches |

## Bulk + audience
| Method | Returns | Notes |
|---|---|---|
| `hasAnyProfile()` | `bool` | true if tutor OR any student |
| `exportAsJson()` | string | Pretty-printed |
| `importFromJson(s)` | `bool` | Rejects schema mismatch |
| `clearAll()` | `bool` | Wipes the localStorage key |
| `deriveAudience({level, mode, exam})` | `'young_learner'\|'teen'\|'adult'\|'exam_prep'` | Pure |

## Preferences
| Method | Returns | Notes |
|---|---|---|
| `getPreferences()` | copy of preferences | |
| `bumpContextualOfferShown()` | `bool` | Increment shown counter |
| `dismissContextualOffer()` | `bool` | Sets dismissed flag |
| `shouldShowContextualOffer()` | `bool` | False if dismissed OR shown >= 3 times |

## Constants
- `Slatework.Profile.COUNTRY_ALLOWLIST` — frozen `['US','GB','CA','AU','NZ','IE','HK']`
- `Slatework.Profile.SCHEMA_VERSION` — `1`

## Storage
- Key: `slatework.profiles.v1`
- Failure mode: any localStorage error returns null/empty/false; site continues to work.
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/notes/2026-05-09-profile-api.md
git commit -m "docs(profile): add public API reference"
```

---

## Phase B — UI atoms

### Task B1: Create `src/lib/profile-ui.js`

**Files:**
- Create: `src/lib/profile-ui.js`

Each public function in this module is a no-op when its host element is absent so that pages can opt in piecemeal.

- [ ] **Step 1: Write the failing browser-console test**

Open `http://localhost:8788/lesson-plan.html` (Phase A is deployed locally, the script tag is wired). Open the console and paste:

```js
console.assert(typeof Slatework.ProfileUI === 'object', 'ProfileUI namespace missing');
console.assert(typeof Slatework.ProfileUI.openEditor === 'function', 'openEditor missing');
console.assert(typeof Slatework.ProfileUI.mountTutorStrip === 'function', 'mountTutorStrip missing');
```

Expected: all three asserts fail because `profile-ui.js` does not exist yet.

- [ ] **Step 2: Create `src/lib/profile-ui.js`**

```js
// src/lib/profile-ui.js
// Reusable UI atoms for the profile system.
//   Slatework.ProfileUI.mountTutorStrip(opts)
//   Slatework.ProfileUI.mountStudentStrip(opts)
//   Slatework.ProfileUI.openEditor(opts)              // dialog: tutor or student
//   Slatework.ProfileUI.mountQuickCheck(opts)         // CEFR Don't-know expander
//   Slatework.ProfileUI.mountAdjustForToday(opts)     // session-only override expander
//   Slatework.ProfileUI.mountSavePrompt(opts)         // "+ Save my setup" link
//
// All functions are no-ops when their target element does not exist.
// Strict CSP — uses textContent / classList; never innerHTML for user-supplied
// strings. Two static-template HTML strings (editor markup, strip markup) are
// safe because they contain no interpolation.

(() => {
  const SW = (window.Slatework = window.Slatework || {});
  if (!SW.Profile) {
    console.warn('[Slatework.ProfileUI] Slatework.Profile not loaded; UI atoms inert.');
    return;
  }

  const COUNTRIES = [
    {code: 'US', name: 'United States'},
    {code: 'GB', name: 'United Kingdom'},
    {code: 'CA', name: 'Canada'},
    {code: 'AU', name: 'Australia'},
    {code: 'NZ', name: 'New Zealand'},
    {code: 'IE', name: 'Ireland'},
    {code: 'HK', name: 'Hong Kong'}
  ];
  const LEVELS = [
    {code: 'A1', gloss: 'Just starting (basic words and set phrases)'},
    {code: 'A2', gloss: 'Can describe basic daily life'},
    {code: 'B1', gloss: 'Handles familiar everyday topics'},
    {code: 'B2', gloss: 'Confident at work / study, idioms still hard'},
    {code: 'C1', gloss: 'Fluent on any topic, with some nuance'},
    {code: 'C2', gloss: 'Near-native'}
  ];
  const MODES = [
    {code: 'one_to_one', label: '1:1'},
    {code: 'small_group', label: 'Small group'},
    {code: 'classroom', label: 'Classroom'}
  ];
  const AUDIENCES = [
    {code: 'auto', label: 'Auto (recommended) — derived from level + exam'},
    {code: 'young_learner', label: 'Young learner (image-heavy, big fonts)'},
    {code: 'teen', label: 'Teen (mid-density)'},
    {code: 'adult', label: 'Adult (text-leaning)'},
    {code: 'exam_prep', label: 'Exam prep (prompt cards, model answers)'}
  ];

  // ---- helpers ----

  function el(tag, attrs, kids) {
    const n = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      if (k === 'class') n.className = attrs[k];
      else if (k === 'text') n.textContent = attrs[k];
      else if (k === 'html') n.innerHTML = attrs[k]; // only for static strings
      else if (k.startsWith('on') && typeof attrs[k] === 'function') n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k]);
    }
    if (kids) for (const c of [].concat(kids)) if (c) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    return n;
  }

  function buildOption(value, label, selected) {
    const o = document.createElement('option');
    o.value = value;
    o.textContent = label;
    if (selected) o.selected = true;
    return o;
  }

  // ---- tutor strip ----

  function mountTutorStrip({container, onChange}) {
    if (!container) return;
    function render() {
      container.innerHTML = '';
      const t = SW.Profile.getTutor();
      if (!t) { container.hidden = true; return; }
      container.hidden = false;
      const country = (COUNTRIES.find(c => c.code === t.country) || {}).name || t.country;
      const wrap = el('aside', {class: 'tutor-strip', role: 'region', 'aria-label': 'Tutor profile'});
      const p = el('p');
      p.appendChild(document.createTextNode('You are: tutor in '));
      p.appendChild(el('strong', {text: country}));
      p.appendChild(document.createTextNode(' · '));
      const btn = el('button', {type: 'button', class: 'tutor-strip-edit btn-link'}, 'Change');
      btn.addEventListener('click', () => openTutorEditor({onSaved: () => { render(); if (onChange) onChange(); }}));
      p.appendChild(btn);
      wrap.appendChild(p);
      container.appendChild(wrap);
    }
    render();
    return { refresh: render };
  }

  // ---- student strip ----

  function mountStudentStrip({container, onChange}) {
    if (!container) return;
    function render() {
      container.innerHTML = '';
      const students = SW.Profile.getStudents();
      if (!students.length) { container.hidden = true; return; }
      container.hidden = false;
      const current = SW.Profile.getCurrentStudent();
      const wrap = el('aside', {class: 'student-strip', role: 'region', 'aria-label': 'Current student'});
      const lbl = el('label', {for: 'student-picker', class: 'visually-hidden', text: 'Current student'});
      const sel = el('select', {id: 'student-picker', class: 'student-strip-picker'});
      for (const s of students) {
        sel.appendChild(buildOption(
          s.id,
          `${s.nickname} (${s.level}${s.target ? ', ' + s.target : ''})`,
          current && s.id === current.id
        ));
      }
      const addOpt = buildOption('__add__', '+ Add student');
      sel.appendChild(addOpt);
      sel.addEventListener('change', () => {
        if (sel.value === '__add__') {
          openStudentEditor({onSaved: () => { render(); if (onChange) onChange('add'); }});
          sel.value = current ? current.id : students[0].id;
        } else {
          SW.Profile.setCurrentStudent(sel.value);
          if (onChange) onChange('switch');
        }
      });
      const editBtn = el('button', {type: 'button', class: 'student-strip-edit secondary'}, 'Edit');
      editBtn.addEventListener('click', () => {
        const cur = SW.Profile.getCurrentStudent();
        if (!cur) return;
        openStudentEditor({existing: cur, onSaved: () => { render(); if (onChange) onChange('edit'); }});
      });
      const quickBtn = el('button', {type: 'button', class: 'student-strip-quick btn-link'}, 'Quick lesson →');
      quickBtn.addEventListener('click', () => { if (onChange) onChange('quick'); });
      wrap.appendChild(lbl);
      wrap.appendChild(sel);
      wrap.appendChild(editBtn);
      wrap.appendChild(quickBtn);
      container.appendChild(wrap);
    }
    render();
    return { refresh: render };
  }

  // ---- editor dialog ----

  // Single dialog element reused across opens. Created on first use.
  let dialogEl = null;

  function ensureDialog() {
    if (dialogEl) return dialogEl;
    dialogEl = document.createElement('dialog');
    dialogEl.className = 'profile-editor';
    dialogEl.setAttribute('aria-labelledby', 'profile-editor-title');
    document.body.appendChild(dialogEl);
    return dialogEl;
  }

  function closeDialog() {
    if (!dialogEl) return;
    if (dialogEl.open) dialogEl.close();
    dialogEl.innerHTML = '';
  }

  function openTutorEditor({onSaved} = {}) {
    const d = ensureDialog();
    d.innerHTML = '';
    const existing = SW.Profile.getTutor() || {};
    const title = el('h2', {id: 'profile-editor-title', text: 'Your tutor profile'});
    const caption = el('p', {class: 'profile-editor-caption', text: 'Optional. Slatework works without saving anything. This sets your country once so the rates / tax / payments / insurance pages skip the dropdown.'});
    const form = el('form', {novalidate: 'novalidate'});

    const countryField = el('div', {class: 'field'});
    countryField.appendChild(el('label', {for: 'profile-tutor-country', text: 'Country'}));
    const countrySel = el('select', {id: 'profile-tutor-country', required: 'required'});
    for (const c of COUNTRIES) countrySel.appendChild(buildOption(c.code, c.name, c.code === existing.country));
    countryField.appendChild(countrySel);
    form.appendChild(countryField);

    const nameField = el('div', {class: 'field'});
    nameField.appendChild(el('label', {for: 'profile-tutor-name', text: 'Display name (optional)'}));
    const nameInput = el('input', {id: 'profile-tutor-name', type: 'text', placeholder: 'e.g., Sarah Chen', maxlength: '80'});
    nameInput.value = existing.name || '';
    nameField.appendChild(nameInput);
    form.appendChild(nameField);

    const privacy = el('p', {class: 'profile-editor-privacy', text: "This stays in your browser. Slatework's servers never see it."});
    form.appendChild(privacy);

    const actions = el('div', {class: 'profile-editor-actions'});
    const cancel = el('button', {type: 'button', class: 'btn secondary', text: "Cancel — don't save anything"});
    const save = el('button', {type: 'submit', class: 'btn btn-primary', text: 'Save profile'});
    cancel.addEventListener('click', closeDialog);
    actions.appendChild(cancel);
    actions.appendChild(save);
    form.appendChild(actions);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const result = SW.Profile.setTutor({
        country: countrySel.value,
        name: nameInput.value
      });
      if (!result) return;
      closeDialog();
      if (onSaved) onSaved(result);
    });

    d.appendChild(title);
    d.appendChild(caption);
    d.appendChild(form);
    d.showModal();
    nameInput.focus();
  }

  function openStudentEditor({existing, onSaved} = {}) {
    const d = ensureDialog();
    d.innerHTML = '';
    const ex = existing || {};
    const title = el('h2', {id: 'profile-editor-title', text: existing ? 'Edit student profile' : 'New student profile'});
    const caption = el('p', {
      class: 'profile-editor-caption',
      text: 'Optional. Slatework works without saving anything. This just skips re-entry next time.'
    });
    const form = el('form', {novalidate: 'novalidate'});

    function field(id, label, control) {
      const f = el('div', {class: 'field'});
      f.appendChild(el('label', {for: id, text: label}));
      control.id = id;
      f.appendChild(control);
      return f;
    }

    // Nickname
    const nickInput = el('input', {type: 'text', placeholder: 'e.g., Lily, J.K., Wed-evening kid', required: 'required', maxlength: '60'});
    nickInput.value = ex.nickname || '';
    form.appendChild(field('profile-nickname', 'Nickname', nickInput));

    // Target language (text input — uses the existing `targetLanguageList` if available)
    const targetSel = el('select', {required: 'required'});
    if (SW.targetLanguageList) {
      for (const t of SW.targetLanguageList()) targetSel.appendChild(buildOption(t.value, t.label, t.value === ex.target));
    } else {
      // Fallback minimal list
      ['Spanish','French','German','English (ESL / EFL)','Mandarin','Japanese','Korean','Italian','Portuguese','Arabic','Other'].forEach(v => targetSel.appendChild(buildOption(v, v, v === ex.target)));
    }
    form.appendChild(field('profile-target', 'Target language', targetSel));

    // Source language
    const sourceSel = el('select', {required: 'required'});
    ['English','Spanish','French','German','Italian','Portuguese','Mandarin','Cantonese','Japanese','Korean','Arabic','Russian','Irish'].forEach(v =>
      sourceSel.appendChild(buildOption(v, v, v === (ex.source || 'English'))));
    form.appendChild(field('profile-source', 'Source language', sourceSel));

    // Level + Don't know quick check
    const levelField = el('div', {class: 'field'});
    levelField.appendChild(el('label', {for: 'profile-level', text: 'CEFR level'}));
    const levelSel = el('select', {id: 'profile-level', required: 'required'});
    for (const l of LEVELS) levelSel.appendChild(buildOption(l.code, `${l.code} — ${l.gloss}`, l.code === (ex.level || 'A1')));
    levelField.appendChild(levelSel);
    const quick = buildQuickCheckEl({onLevel: (lvl) => {
      levelSel.value = lvl;
      // Mark intent — page-level code reads `dataset.levelSetVia` if needed.
      levelSel.dataset.levelSetVia = 'quick_check';
    }});
    levelField.appendChild(quick);
    form.appendChild(levelField);

    // Mode
    const modeSel = el('select', {required: 'required'});
    for (const m of MODES) modeSel.appendChild(buildOption(m.code, m.label, m.code === (ex.mode || 'one_to_one')));
    form.appendChild(field('profile-mode', 'Mode', modeSel));

    // Exam (optional)
    const examInput = el('input', {type: 'text', placeholder: 'e.g., GCSE Spanish, IELTS Speaking, HKDSE', maxlength: '120'});
    examInput.value = ex.exam || '';
    form.appendChild(field('profile-exam', 'Exam or curriculum (optional)', examInput));

    // Slideshow style (audience profile) — collapsed
    const audWrap = el('details');
    audWrap.appendChild(el('summary', {text: 'Slideshow style'}));
    const audSel = el('select', {id: 'profile-audience'});
    const currentAud = ex.audience_set_via === 'manual' ? ex.audience_profile : 'auto';
    for (const a of AUDIENCES) audSel.appendChild(buildOption(a.code, a.label, a.code === currentAud));
    const audField = el('div', {class: 'field'});
    audField.appendChild(el('label', {for: 'profile-audience', text: 'Audience profile'}));
    audField.appendChild(audSel);
    audWrap.appendChild(audField);
    form.appendChild(audWrap);

    // Notes
    const notesArea = el('textarea', {placeholder: 'e.g., GCSE Foundation, dyslexic, prefers visual prompts', maxlength: '500'});
    notesArea.value = ex.notes || '';
    form.appendChild(field('profile-notes', 'Notes (optional)', notesArea));

    const privacy = el('p', {class: 'profile-editor-privacy', text: "This stays in your browser. Slatework's servers never see it."});
    form.appendChild(privacy);

    // Actions
    const actions = el('div', {class: 'profile-editor-actions'});
    if (existing) {
      const del = el('button', {type: 'button', class: 'btn-link', text: 'Delete profile'});
      del.addEventListener('click', () => {
        if (!confirm('Delete this student profile? This cannot be undone.')) return;
        SW.Profile.deleteStudent(existing.id);
        closeDialog();
        if (onSaved) onSaved(null);
      });
      actions.appendChild(del);
    }
    const cancel = el('button', {type: 'button', class: 'btn secondary', text: "Cancel — don't save anything"});
    cancel.addEventListener('click', closeDialog);
    const save = el('button', {type: 'submit', class: 'btn btn-primary', text: 'Save profile'});
    actions.appendChild(cancel);
    actions.appendChild(save);
    form.appendChild(actions);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!nickInput.value.trim()) { nickInput.focus(); return; }
      const audValue = audSel.value === 'auto' ? undefined : audSel.value;
      const payload = {
        nickname: nickInput.value,
        target: targetSel.value,
        source: sourceSel.value,
        level: levelSel.value,
        mode: modeSel.value,
        exam: examInput.value,
        notes: notesArea.value,
        audience_profile: audValue,
        level_set_via: levelSel.dataset.levelSetVia || 'manual'
      };
      const result = existing
        ? SW.Profile.updateStudent(existing.id, payload)
        : SW.Profile.addStudent(payload);
      if (!result) return;
      if (!existing) SW.Profile.setCurrentStudent(result.id);
      closeDialog();
      if (onSaved) onSaved(result);
    });

    d.appendChild(title);
    d.appendChild(caption);
    d.appendChild(form);
    d.showModal();
    nickInput.focus();
  }

  function openEditor(opts) {
    if (opts && opts.kind === 'tutor') return openTutorEditor(opts);
    return openStudentEditor(opts);
  }

  // ---- CEFR Don't-know quick check ----
  // Rule-based mapping from spec §4.4.

  function quickCheckMap(a1, a2, a3) {
    // a1: introduction question — easily/effort/notreally
    // a2: routine question      — yes/somewhat/no
    // a3: opinion question      — fluently/difficulty/notyet
    if (a1 === 'notreally' && a2 === 'no' && a3 === 'notyet') return 'A1';
    if (a1 === 'effort' && a2 === 'no' && a3 === 'notyet') return 'A1';
    if (a1 === 'easily' && a2 === 'no' && a3 === 'notyet') return 'A2';
    if (a1 === 'easily' && a2 === 'somewhat' && a3 === 'notyet') return 'A2';
    if (a1 === 'easily' && a2 === 'yes' && a3 === 'notyet') return 'B1';
    if (a1 === 'easily' && a2 === 'yes' && a3 === 'difficulty') return 'B2';
    if (a1 === 'easily' && a2 === 'yes' && a3 === 'fluently') return 'C1';
    // safe fallback
    return 'A2';
  }

  function buildQuickCheckEl({onLevel}) {
    const wrap = el('details', {class: 'cefr-quick-check'});
    wrap.appendChild(el('summary', {text: "Don't know? Quick check"}));
    const intro = el('p', {class: 'small', text: 'Three quick questions about what your student can do today. The level fills in for you — change it anytime.'});
    wrap.appendChild(intro);

    const Q = [
      {key: 'q1', label: '1. Introduce themselves and answer simple personal questions (name, age, where they live)?',
       options: [['easily','Easily'],['effort','With effort'],['notreally','Not really']]},
      {key: 'q2', label: '2. Describe their daily routine, family, or hobbies?',
       options: [['yes','Yes'],['somewhat','Somewhat'],['no','No']]},
      {key: 'q3', label: '3. Discuss opinions, plans, or hypothetical situations?',
       options: [['fluently','Fluently'],['difficulty','With difficulty'],['notyet','Not yet']]}
    ];
    const state = {q1: null, q2: null, q3: null};
    const setBtn = el('button', {type: 'button', class: 'btn secondary', text: 'Set level'});
    setBtn.disabled = true;

    for (const q of Q) {
      const fs = el('fieldset');
      fs.appendChild(el('legend', {text: q.label}));
      for (const [val, lbl] of q.options) {
        const id = `qc-${q.key}-${val}`;
        const radio = el('input', {type: 'radio', name: q.key, value: val, id});
        radio.addEventListener('change', () => {
          state[q.key] = val;
          setBtn.disabled = !(state.q1 && state.q2 && state.q3);
        });
        const label = el('label', {for: id});
        label.appendChild(radio);
        label.appendChild(document.createTextNode(' ' + lbl));
        fs.appendChild(label);
      }
      wrap.appendChild(fs);
    }
    setBtn.addEventListener('click', () => {
      const lvl = quickCheckMap(state.q1, state.q2, state.q3);
      if (onLevel) onLevel(lvl);
      wrap.open = false;
    });
    wrap.appendChild(setBtn);
    return wrap;
  }

  function mountQuickCheck({container, onLevel}) {
    if (!container) return;
    const node = buildQuickCheckEl({onLevel});
    container.appendChild(node);
    return node;
  }

  // ---- Adjust for today expander ----

  function mountAdjustForToday({container, onApply}) {
    if (!container) return;
    container.innerHTML = '';
    const wrap = el('details', {class: 'adjust-for-today'});
    wrap.appendChild(el('summary', {text: 'Adjust for today (optional)'}));

    const lvlField = el('div', {class: 'field'});
    lvlField.appendChild(el('label', {for: 'aft-level', text: 'Level for this lesson only'}));
    const lvlSel = el('select', {id: 'aft-level'});
    lvlSel.appendChild(buildOption('', '(no change)'));
    for (const l of LEVELS) lvlSel.appendChild(buildOption(l.code, `${l.code} — ${l.gloss}`));
    lvlField.appendChild(lvlSel);
    wrap.appendChild(lvlField);

    const modeField = el('div', {class: 'field'});
    modeField.appendChild(el('label', {for: 'aft-mode', text: 'Mode for this lesson only'}));
    const modeSel = el('select', {id: 'aft-mode'});
    modeSel.appendChild(buildOption('', '(no change)'));
    for (const m of MODES) modeSel.appendChild(buildOption(m.code, m.label));
    modeField.appendChild(modeSel);
    wrap.appendChild(modeField);

    const examField = el('div', {class: 'field'});
    examField.appendChild(el('label', {for: 'aft-exam', text: 'Exam / curriculum for this lesson only'}));
    const examInput = el('input', {id: 'aft-exam', type: 'text', placeholder: 'e.g., GCSE Spanish, IELTS Speaking', maxlength: '120'});
    examField.appendChild(examInput);
    wrap.appendChild(examField);

    container.appendChild(wrap);

    return {
      readOverrides() {
        return {
          level: lvlSel.value || null,
          mode: modeSel.value || null,
          exam: examInput.value.trim() || null
        };
      }
    };
  }

  // ---- Save prompt link ----

  function mountSavePrompt({container, prefill, onClick}) {
    if (!container) return;
    container.innerHTML = '';
    if (SW.Profile.hasAnyProfile()) { container.hidden = true; return; }
    container.hidden = false;
    const link = el('button', {type: 'button', class: 'btn-link profile-empty-link'}, '+ Save my setup for next time');
    link.addEventListener('click', () => {
      // Build a pre-fill from the current form values if provided.
      const seed = prefill ? prefill() : {};
      openStudentEditor({existing: Object.assign({}, seed), onSaved: (result) => {
        if (onClick) onClick(result);
      }});
    });
    container.appendChild(link);
  }

  // ---- expose ----

  SW.ProfileUI = Object.freeze({
    mountTutorStrip,
    mountStudentStrip,
    openEditor,
    openTutorEditor,
    openStudentEditor,
    mountQuickCheck,
    mountAdjustForToday,
    mountSavePrompt
  });
})();
```

- [ ] **Step 3: Re-run the failing test**

In the browser console on `lesson-plan.html`:
```js
typeof Slatework.ProfileUI === 'object'
typeof Slatework.ProfileUI.openEditor === 'function'
typeof Slatework.ProfileUI.mountTutorStrip === 'function'
```
Expected: all three return `true`. (Note: `profile-ui.js` isn't yet loaded by `lesson-plan.html`. Add it to the page temporarily for this test, OR copy-paste the file contents into the console as a one-shot. Once Phase C wires the script tag, this will be automatic.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/profile-ui.js
git commit -m "feat(profile): add ProfileUI atoms (strips, dialog, quick-check, adjust-for-today)"
```

### Task B2: Add CSS atoms to `src/lib/styles.css`

**Files:**
- Modify: `src/lib/styles.css` (append to end of file)

The atoms reuse existing tokens (`--ink`, `--surface`, `--accent`, `--ink-faint`, `--shadow-sm`, `--radius`) so the only thing new are the layout selectors. Append the block at the very end of the file so it sits with the other late-stage rules.

- [ ] **Step 1: Add the CSS block**

Append this to `src/lib/styles.css`:

```css
/* =========================================================
   PROFILE UI ATOMS — Phase B (2026-05-09)
   Spec: docs/superpowers/specs/2026-05-09-profile-architecture-and-ux-cleanup-design.md
   ========================================================= */

.visually-hidden {
  position: absolute !important;
  width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
}

/* Tutor strip — small bar at the top of country-aware pages */
.tutor-strip {
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 0.625rem 1rem;
  margin: 0 0 1.25rem;
  font-size: 0.9375rem;
  color: var(--ink-2);
  box-shadow: var(--shadow-sm);
}
.tutor-strip p { margin: 0; line-height: 1.4; }
.tutor-strip strong { color: var(--ink); }
.tutor-strip-edit { padding: 0; min-height: 0; }

/* Student strip — picker + edit + Quick lesson exit */
.student-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 0.625rem 0.75rem;
  margin: 0 0 1.25rem;
  box-shadow: var(--shadow-sm);
}
.student-strip-picker {
  flex: 1 1 auto;
  min-width: 14rem;
  margin: 0;
  height: 38px;
  padding: 0 12px;
}
.student-strip-edit, .student-strip-quick {
  min-height: 38px;
  padding: 0 12px;
  font-size: 0.875rem;
}
.student-strip-quick {
  background: transparent;
  border: 1px dashed var(--line-strong);
  color: var(--ink-muted);
}
.student-strip-quick:hover {
  border-color: var(--ink);
  color: var(--ink);
}

/* Save-my-setup link in no-profile state */
.profile-empty-link {
  background: transparent;
  border: 1px dashed var(--line-strong);
  color: var(--ink-muted);
  padding: 8px 14px;
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  margin-bottom: 1rem;
}
.profile-empty-link:hover {
  border-color: var(--accent);
  color: var(--accent);
}

/* Profile editor dialog */
dialog.profile-editor {
  width: min(36rem, 90vw);
  max-height: min(90vh, 800px);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--ink);
  padding: 1.5rem;
  box-shadow: 0 10px 40px rgba(2, 6, 23, 0.18);
}
dialog.profile-editor::backdrop {
  background: rgba(2, 6, 23, 0.55);
}
dialog.profile-editor h2 {
  margin: 0 0 0.25rem;
  font-size: 1.25rem;
}
dialog.profile-editor .profile-editor-caption {
  margin: 0 0 1.25rem;
  color: var(--ink-faint);
  font-size: 0.875rem;
}
dialog.profile-editor form .field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 1rem;
}
dialog.profile-editor fieldset {
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  padding: 0.5rem 0.75rem;
  margin: 0 0 0.75rem;
}
dialog.profile-editor fieldset legend {
  font-size: 0.875rem;
  color: var(--ink-2);
  padding: 0 4px;
}
dialog.profile-editor fieldset label {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.875rem;
  margin: 0.25rem 0;
  cursor: pointer;
}
.profile-editor-privacy {
  font-size: 0.8125rem;
  color: var(--ink-faint);
  margin: 0.5rem 0 1rem;
}
.profile-editor-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  flex-wrap: wrap;
  margin-top: 1rem;
}
.profile-editor-actions .btn-link {
  margin-right: auto;
  color: var(--err);
}

/* CEFR Don't-know inline check */
details.cefr-quick-check {
  margin-top: 0.5rem;
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  padding: 0.5rem 0.75rem;
  background: var(--surface-2);
}
details.cefr-quick-check[open] {
  background: var(--surface);
}
details.cefr-quick-check > summary {
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--ink-muted);
  padding: 0.25rem 0;
}
details.cefr-quick-check[open] > summary {
  color: var(--ink);
  font-weight: 500;
  margin-bottom: 0.5rem;
}

/* Adjust-for-today expander */
details.adjust-for-today {
  margin: 0.5rem 0 1rem;
  border: 1px dashed var(--line-strong);
  border-radius: var(--radius-sm);
  padding: 0.5rem 0.75rem;
}
details.adjust-for-today > summary {
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--ink-muted);
}
details.adjust-for-today[open] > summary {
  color: var(--ink);
  font-weight: 500;
  margin-bottom: 0.5rem;
}

/* Result-panel extension buttons (lesson-plan.html, populated by Phase G) */
.extensions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 1.25rem 0 0;
  padding-top: 1.25rem;
  border-top: 1px dashed var(--line);
}

@media (prefers-color-scheme: dark) {
  dialog.profile-editor {
    border-color: rgba(255,255,255,0.08);
    box-shadow: 0 10px 40px rgba(0,0,0,0.6);
  }
  dialog.profile-editor::backdrop { background: rgba(0,0,0,0.65); }
}

@media (max-width: 30rem) {
  dialog.profile-editor { padding: 1rem; }
  .student-strip { gap: 0.5rem; }
  .student-strip-picker { min-width: 100%; }
}
```

- [ ] **Step 2: Smoke-test in a browser**

Open `http://localhost:8788/lesson-plan.html`. In the console:
```js
// Manually inject the script tag to load profile-ui.js for now
const s = document.createElement('script');
s.src = '/src/lib/profile-ui.js?v=15';
document.body.appendChild(s);
// Wait a tick, then trigger an editor:
setTimeout(() => Slatework.ProfileUI.openStudentEditor({onSaved: (s) => console.log('saved', s)}), 200);
```
Expected: a centred dialog opens with the form fields styled inside the chalk-board palette. The Don't-know expander reveals the three-question quiz. Esc closes the dialog. Click outside closes the dialog (native `<dialog>` `light dismiss` happens via the click handler in modern browsers — confirm visually).

Bump the cache buster to `v=16` on the page once you confirm visually:
```html
<link rel="stylesheet" href="/src/lib/styles.css?v=16" />
```
But don't propagate the bump to the rest yet — we'll do that when Phase C wires every page.

- [ ] **Step 3: Commit**

```bash
git add src/lib/styles.css
git commit -m "feat(profile): add styles for tutor/student strip, editor dialog, quick-check, adjust-for-today"
```

### Task B3: Wire `profile-ui.js` script tag onto every consuming page

**Files:**
- Modify: `lesson-plan.html`, `worksheet.html`, `marking.html`, `cefr.html`, `rates.html`, `tax.html`, `setup.html`, `insurance.html`, `payments.html`, `privacy.html`, `index.html`

`contract.html` does not need `profile-ui.js` (it only reads tutor name/email via `profile.js` directly), but it's harmless to load and consistent with the rest. Skip `contract.html` to keep its tiny payload smaller.

- [ ] **Step 1: Add the script tag and bump cache-buster to v=16**

For each page in the list, add this line directly below the existing `<script src="/src/lib/profile.js?v=15"></script>` tag and update versions:

```html
<script src="/src/lib/profile.js?v=16"></script>
<script src="/src/lib/profile-ui.js?v=16"></script>
```

Also bump every `?v=15` ref on these pages to `?v=16`.

- [ ] **Step 2: Verify load on all pages**

Visit each page. In the console:
```js
typeof Slatework.ProfileUI.mountTutorStrip === 'function' && typeof Slatework.Profile.getTutor === 'function'
```
Expected: `true` everywhere except `contract.html`, where ProfileUI is intentionally absent (`Slatework.Profile` should still be `true`).

- [ ] **Step 3: Commit**

```bash
git add lesson-plan.html worksheet.html marking.html cefr.html rates.html tax.html setup.html insurance.html payments.html privacy.html index.html
git commit -m "chore(profile): wire profile-ui.js across consumer pages, v=16"
```

---

## Phase F — Privacy + FAQ (ships before any UI exposes the feature)

### Task F1: Add profile section + Clear/Export/Import buttons to `/privacy`

**Files:**
- Modify: `privacy.html`
- Create: `src/lib/page-privacy.js`

- [ ] **Step 1: Add the profile section to `privacy.html`**

Insert this `<section>` directly AFTER the existing `<h2 id="student-data">` block and BEFORE the `<h2>Cookies</h2>` block:

```html
  <section id="profile-data">
    <h2>Profiles (optional)</h2>
    <p><strong>Slatework lets you save tutor and student profiles in your browser's <code>localStorage</code> so you don't re-enter the same information every lesson. These profiles never leave your device — they're not sent to our server, not synced, not backed up by us.</strong></p>
    <p><strong>Profiles are entirely optional.</strong> Slatework was designed to work without saved data and continues to work that way for users who never opt in.</p>
    <p>Use nicknames or initials for student profiles if you'd rather avoid storing real names. You can:</p>
    <ul>
      <li>Export your profiles as a JSON file (move to another device manually)</li>
      <li>Import a JSON file (restore from backup)</li>
      <li>Wipe all profiles in one click</li>
    </ul>
    <div class="profile-actions">
      <button type="button" id="profile-clear-btn" class="btn secondary">Clear all profiles</button>
      <button type="button" id="profile-export-btn" class="btn secondary">Export profiles (JSON)</button>
      <button type="button" id="profile-import-btn" class="btn secondary">Import profiles (JSON)</button>
      <input type="file" id="profile-import-file" accept="application/json" hidden />
    </div>
    <p id="profile-action-status" class="small" aria-live="polite"></p>
  </section>
```

Also append this script tag at the bottom of `privacy.html` directly above `</body>`:

```html
<script src="/src/lib/profile.js?v=16"></script>
<script src="/src/lib/page-privacy.js?v=16" defer></script>
```

And bump the stylesheet cache-buster to `?v=16` if not already.

- [ ] **Step 2: Add the supporting CSS for `.profile-actions`**

Append to `src/lib/styles.css`:

```css
.profile-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 1rem 0;
}
.profile-actions .btn { min-height: 40px; }
```

- [ ] **Step 3: Create `src/lib/page-privacy.js`**

```js
// src/lib/page-privacy.js
// Wires the Clear / Export / Import controls on /privacy.
(() => {
  const $ = (id) => document.getElementById(id);
  const status = $('profile-action-status');
  if (!status) return;
  const SW = window.Slatework;
  if (!SW || !SW.Profile) {
    status.textContent = 'Profile module failed to load.';
    return;
  }

  function setStatus(msg, ok) {
    status.textContent = msg;
    status.style.color = ok ? 'var(--ok)' : (ok === false ? 'var(--err)' : 'var(--ink-faint)');
  }

  $('profile-clear-btn').addEventListener('click', () => {
    if (!confirm('Wipe all tutor and student profiles from this browser? This cannot be undone.')) return;
    const ok = SW.Profile.clearAll();
    setStatus(ok ? 'All profiles cleared.' : 'Could not clear profiles (storage error).', ok);
  });

  $('profile-export-btn').addEventListener('click', () => {
    try {
      const data = SW.Profile.exportAsJson();
      const blob = new Blob([data], {type: 'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'slatework-profiles-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatus('Exported.', true);
    } catch (err) {
      setStatus('Export failed.', false);
    }
  });

  const fileInput = $('profile-import-file');
  $('profile-import-btn').addEventListener('click', () => { fileInput.click(); });
  fileInput.addEventListener('change', () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const ok = SW.Profile.importFromJson(reader.result);
      setStatus(ok ? 'Imported.' : 'Import failed (wrong shape or schema).', ok);
      fileInput.value = '';
    };
    reader.onerror = () => setStatus('Could not read file.', false);
    reader.readAsText(file);
  });
})();
```

- [ ] **Step 4: Smoke-test the Clear/Export/Import flow**

Open `http://localhost:8788/privacy.html`. In the console:
```js
Slatework.Profile.setTutor({country: 'GB', name: 'Test'});
Slatework.Profile.addStudent({nickname: 'Lily', target: 'English', source: 'Cantonese', level: 'A1', mode: 'one_to_one'});
```
Click Export — confirm a `slatework-profiles-YYYY-MM-DD.json` file downloads.
Click Clear — confirm the alert and the success message.
Confirm via console: `Slatework.Profile.hasAnyProfile()` returns `false`.
Click Import, select the just-downloaded file. Confirm `Slatework.Profile.getTutor().country === 'GB'` after import.

- [ ] **Step 5: Commit**

```bash
git add privacy.html src/lib/page-privacy.js src/lib/styles.css
git commit -m "feat(privacy): add profile section with Clear/Export/Import controls"
```

### Task F2: Add new homepage FAQ entry

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add the `<details>` entry inside the existing FAQ block**

Find the existing FAQ section (`<section class="faq"><div class="faq-inner">`) at line ~374 of `index.html`. Insert this new `<details>` element AFTER the "Why use this instead of ChatGPT?" entry and BEFORE "Is this legal or tax advice?":

```html
      <details>
        <summary>Do I have to make an account or save anything?</summary>
        <div class="answer">
          <p>No. Slatework has no signup. There's an optional "save my setup" feature that stays in your browser — you can use it to skip re-entering the same student details every lesson — but every tool works fully without it. Nothing is sent to our servers when you use it.</p>
          <p>If you want to opt in, look for the small <strong>+ Save my setup for next time</strong> link at the top of any AI tool. <a href="/privacy.html#profile-data">Privacy details and an export/clear button</a> live on the privacy page.</p>
        </div>
      </details>
```

- [ ] **Step 2: Mirror the FAQ in the page's `FAQPage` JSON-LD**

Find the existing `<script type="application/ld+json">` block on `index.html` (line ~84 — the `"@type": "FAQPage"` block) and add this entry to the `mainEntity` array as the second item (after "Why use this instead of ChatGPT?"):

```json
,
{
  "@type": "Question",
  "name": "Do I have to make an account or save anything?",
  "acceptedAnswer": {
    "@type": "Answer",
    "text": "No. Slatework has no signup. There's an optional 'save my setup' feature that stays in your browser, but every tool works fully without it. Nothing is sent to our servers when you use it."
  }
}
```

- [ ] **Step 3: Validate the JSON-LD parses**

In the browser console on `index.html`:
```js
JSON.parse(document.querySelectorAll('script[type="application/ld+json"]')[2].textContent)
```
(Index 2 is the FAQPage block; adjust if the order differs in this revision.)
Expected: parses without error, `mainEntity` has 6 entries.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat(index): add 'Do I have to make an account?' FAQ + JSON-LD"
```

---

## Phase C — AI tool refactors

### Task C1: Lesson-plan page — strips, glosses, Don't-know, Adjust-for-today, extension placeholder

**Files:**
- Modify: `lesson-plan.html`
- Modify: `src/lib/page-lesson-plan.js`

- [ ] **Step 1: Add markup hooks to `lesson-plan.html`**

Insert these mount points inside `<main id="main" class="container">` AFTER the `<p class="lead">` line and BEFORE `<div class="privacy-notice">`:

```html
  <div id="profile-mount" class="profile-mount">
    <div id="profile-tutor-strip"></div>
    <div id="profile-student-strip"></div>
    <div id="profile-save-link"></div>
  </div>
```

Then update the level dropdown inside the form to add CEFR glosses (replace the existing `<select id="level">` block):

```html
      <div class="field">
        <label for="level">CEFR level</label>
        <select id="level" required>
          <option value="A1">A1 — Just starting (basic words and set phrases)</option>
          <option value="A2">A2 — Can describe basic daily life</option>
          <option value="B1" selected>B1 — Handles familiar everyday topics</option>
          <option value="B2">B2 — Confident at work / study, idioms still hard</option>
          <option value="C1">C1 — Fluent on any topic, with some nuance</option>
          <option value="C2">C2 — Near-native</option>
        </select>
        <div id="level-quick-check"></div>
      </div>
```

Add the Adjust-for-today expander mount BELOW the goal field but BEFORE the submit button:

```html
    <div id="adjust-for-today"></div>

    <button type="submit" id="go" class="btn btn-primary">Generate plan</button>
```

Modify the result-panel section to include a placeholder extension block. Replace the existing `<section id="result"...></section>` with:

```html
  <section id="result" class="result" role="region" aria-live="polite" hidden>
    <div id="result-body"></div>
    <section id="extensions" class="extensions" hidden>
      <button type="button" id="ext-slideshow" class="btn btn-primary" data-stub="phase-g">Generate slideshow from this plan</button>
      <a id="ext-worksheet" href="/worksheet.html?from=lesson-plan" class="btn secondary">Generate worksheet for this plan</a>
      <a id="ext-marking" href="/marking.html?from=lesson-plan" class="btn secondary">Mark a student response to this plan</a>
    </section>
  </section>
```

- [ ] **Step 2: Replace `src/lib/page-lesson-plan.js`**

Replace `src/lib/page-lesson-plan.js` with the version below. The new file (a) reads the current student profile and pre-fills the form, (b) mounts the strips and atoms, (c) reads URL params for backwards compat, (d) wires the placeholder extension button to a `console.info` stub (Phase G replaces this).

```js
// Extracted from lesson-plan.html during CSP-nonce refactor (2026-05-07).
// Phase C (2026-05-09): profile-aware. Loaded via <script src="/src/lib/page-lesson-plan.js" defer> from lesson-plan.html.
const $ = (id) => document.getElementById(id);
const SW = window.Slatework;
const renderMarkdown = SW.renderMarkdown;
const escapeHtml = SW.escapeHtml;

// ---- 1. Build language dropdowns (unchanged from prior behaviour) ----
(function buildLangDropdowns() {
  const targetSel = $('target');
  const sourceSel = $('source');

  const targets = SW.targetLanguageList();
  for (const t of targets) {
    const opt = document.createElement('option');
    opt.value = t.value;
    opt.textContent = t.label;
    targetSel.appendChild(opt);
  }
  targetSel.value = 'Spanish';

  const sources = ['English','Spanish','French','German','Italian','Portuguese','Mandarin','Cantonese','Japanese','Korean','Arabic','Russian','Irish'];
  for (const s of sources) {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    sourceSel.appendChild(opt);
  }
  const sourceOther = document.createElement('option');
  sourceOther.value = 'Other';
  sourceOther.textContent = "Other — I'll type it";
  sourceSel.appendChild(sourceOther);
  sourceSel.value = 'English';

  function wireOther(selectEl, otherInputId) {
    selectEl.addEventListener('change', () => {
      const otherInput = document.getElementById(otherInputId);
      if (selectEl.value === 'Other') {
        otherInput.hidden = false;
        otherInput.required = true;
      } else {
        otherInput.hidden = true;
        otherInput.required = false;
      }
    });
  }
  wireOther(targetSel, 'target_other');
  wireOther(sourceSel, 'source_other');
})();

function resolveLang(selectId, otherId) {
  const sel = $(selectId);
  if (sel.value === 'Other') return $(otherId).value.trim();
  return sel.value;
}

// ---- 2. URL params (backwards compat) ----
(function applyUrlParams() {
  const params = new URLSearchParams(location.search);
  const map = {
    target: 'target',
    source: 'source',
    level: 'level',
    mode: 'mode',
    exam: 'exam',
    goal: 'goal'
  };
  for (const [param, id] of Object.entries(map)) {
    const v = params.get(param);
    if (v && $(id)) {
      const el = $(id);
      el.value = v;
      el.dispatchEvent(new Event('change'));
    }
  }
})();

// ---- 3. Profile pre-fill ----
let quickLessonModeActive = false;

function applyProfilePrefill(student) {
  if (!student || quickLessonModeActive) return;
  if ($('target') && student.target) $('target').value = student.target;
  if ($('source') && student.source) $('source').value = student.source;
  if ($('level') && student.level) $('level').value = student.level;
  if ($('mode') && student.mode) $('mode').value = student.mode;
  if ($('exam') && typeof student.exam === 'string') $('exam').value = student.exam;
  // URL params still take precedence — re-apply
  const params = new URLSearchParams(location.search);
  for (const k of ['target','source','level','mode','exam','goal']) {
    const v = params.get(k);
    if (v && $(k)) $(k).value = v;
  }
}

// ---- 4. Mount profile UI atoms ----
(function mountProfileUi() {
  if (!SW.ProfileUI) return;
  const tutorContainer = $('profile-tutor-strip');
  const studentContainer = $('profile-student-strip');
  const saveContainer = $('profile-save-link');

  const tutorMount = SW.ProfileUI.mountTutorStrip({container: tutorContainer});
  const studentMount = SW.ProfileUI.mountStudentStrip({
    container: studentContainer,
    onChange: (action) => {
      if (action === 'quick') {
        quickLessonModeActive = true;
        // Restore today's full form by clearing pre-fill from current student.
        // Don't delete the profile — just stop syncing for this session.
      } else {
        quickLessonModeActive = false;
        applyProfilePrefill(SW.Profile.getCurrentStudent());
      }
      // Re-render save link visibility
      saveMount && saveMount.refresh && saveMount.refresh();
    }
  });
  const saveMount = SW.ProfileUI.mountSavePrompt({
    container: saveContainer,
    prefill: () => ({
      target: $('target') ? $('target').value : '',
      source: $('source') ? $('source').value : 'English',
      level: $('level') ? $('level').value : 'B1',
      mode: $('mode') ? $('mode').value : 'one_to_one',
      exam: $('exam') ? $('exam').value : ''
    }),
    onClick: (created) => {
      // Created student becomes current automatically.
      tutorMount && tutorMount.refresh && tutorMount.refresh();
      studentMount && studentMount.refresh && studentMount.refresh();
      applyProfilePrefill(created);
    }
  });

  // Initial pre-fill if a current student already exists
  applyProfilePrefill(SW.Profile.getCurrentStudent());
})();

// ---- 5. Don't-know quick-check next to level dropdown ----
(function mountQuickCheck() {
  if (!SW.ProfileUI) return;
  SW.ProfileUI.mountQuickCheck({
    container: $('level-quick-check'),
    onLevel: (lvl) => { if ($('level')) $('level').value = lvl; }
  });
})();

// ---- 6. Adjust-for-today expander ----
let adjustHandle = null;
(function mountAdjust() {
  if (!SW.ProfileUI) return;
  adjustHandle = SW.ProfileUI.mountAdjustForToday({container: $('adjust-for-today')});
})();

// ---- 7. Form submit ----
$('form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const btn = $('go');
  const result = $('result');
  const body = $('result-body');
  ['target_other', 'source_other', 'goal'].forEach((id) => {
    const el = $(id); if (el) el.removeAttribute('aria-invalid');
  });
  btn.disabled = true;
  result.hidden = false;
  $('extensions').hidden = true;
  body.innerHTML = '<div class="slate-loading"><p class="mono-caption"><span class="dot"></span>COMPOSING ON THE SLATE</p><div class="chalk-dots" aria-hidden="true"><span class="chalk-dot"></span><span class="chalk-dot"></span><span class="chalk-dot"></span></div><p class="slate-loading-sub">Roughly 10&ndash;40 seconds. Don\'t refresh &mdash; the model is writing, not stuck.</p></div>';

  // Apply Adjust-for-today overrides if set
  const overrides = adjustHandle ? adjustHandle.readOverrides() : {level: null, mode: null, exam: null};

  try {
    const r = await fetch('/api/lesson-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_language: resolveLang('target', 'target_other'),
        source_language: resolveLang('source', 'source_other'),
        level: overrides.level || $('level').value,
        mode: overrides.mode || $('mode').value,
        goal: $('goal').value,
        exam: overrides.exam || $('exam').value
      })
    });
    if (!r.ok) {
      const errBody = await r.json().catch(() => ({}));
      const goalEl = $('goal');
      if (goalEl && r.status === 400) goalEl.setAttribute('aria-invalid', 'true');
      body.innerHTML = '<p>' + escapeHtml(errBody.error || 'Could not generate plan. Try again.') + '</p>';
      return;
    }
    const data = await r.json();
    body.innerHTML = '<div id="md">' + renderMarkdown(data.markdown || '') + '</div><p class="small mt-1">Tip: select all and paste into your notes; the formatting comes through.</p>';
    // Cache the plan markdown for Phase G slideshow generation
    window.__lastLessonPlanMarkdown = data.markdown || '';
    $('extensions').hidden = false;
  } catch {
    body.innerHTML = '<p>Network error. Try again in a moment.</p>';
  } finally {
    btn.disabled = false;
  }
});

// ---- 8. Extension button stubs (Phase G implements the slideshow handler) ----
(function wireExtensionStubs() {
  const slideBtn = $('ext-slideshow');
  if (slideBtn) slideBtn.addEventListener('click', () => {
    if (window.Slatework && Slatework.Slideshow && typeof Slatework.Slideshow.generateAndRender === 'function') {
      // Phase G provides this method
      const md = window.__lastLessonPlanMarkdown || '';
      Slatework.Slideshow.generateAndRender({
        lesson_plan_markdown: md,
        currentStudent: SW.Profile.getCurrentStudent(),
        formValues: {
          target_language: resolveLang('target', 'target_other'),
          source_language: resolveLang('source', 'source_other'),
          level: $('level').value,
          mode: $('mode').value,
          exam: $('exam').value
        }
      });
    } else {
      console.info('[lesson-plan] Slideshow extension not yet loaded — Phase G ships this.');
    }
  });
})();
```

- [ ] **Step 3: Run the smoke test in browser**

Open `http://localhost:8788/lesson-plan.html`. Open the console.

Empty-state pre-flight:
```js
Slatework.Profile.clearAll(); location.reload();
```
After reload — confirm:
- The tutor + student strips do NOT show (containers are `hidden`)
- The form looks visually unchanged from before
- The level dropdown shows the new glosses (e.g., "B1 — Handles familiar everyday topics")
- The Adjust-for-today expander is below the goal field
- The "+ Save my setup for next time" link appears in the top section
- Click the level dropdown's "Don't know? Quick check" — three radio-button groups + Set level button

Profile-state run:
```js
Slatework.Profile.setTutor({country: 'GB'});
Slatework.Profile.addStudent({nickname: 'Lily', target: 'Spanish', source: 'English', level: 'A2', mode: 'small_group'});
location.reload();
```
After reload — confirm:
- The tutor strip + student strip both render
- Form auto-pre-fills target=Spanish, source=English, level=A2, mode=small_group
- "+ Save my setup" link is hidden
- Click "Quick lesson →" → watch Network tab on next submit, confirm the form submits with the form's current values (not the profile values, in case the user changes them)

Generate flow:
- Type a goal, click Generate. Confirm the lesson plan renders. Confirm the `#extensions` block becomes visible with three buttons. Click "Generate slideshow from this plan" — confirm console says `Slideshow extension not yet loaded` (Phase G replaces this).

URL-param flow:
- Visit `/lesson-plan.html?level=C1&target=French`. Confirm form shows level=C1 target=French even with a profile set.

- [ ] **Step 4: Commit**

```bash
git add lesson-plan.html src/lib/page-lesson-plan.js
git commit -m "feat(lesson-plan): integrate profile system + glosses + adjust-for-today + extension placeholders"
```

### Task C2: Worksheet page

**Files:**
- Modify: `worksheet.html`
- Modify: `src/lib/page-worksheet.js`

- [ ] **Step 1: Add markup hooks to `worksheet.html`**

Insert the same `<div id="profile-mount">` block as Task C1 immediately after `<p class="lead">` (or whatever the first paragraph is). Add CEFR glosses to the level dropdown (use the same option list as C1). Place the level-quick-check container directly below the level dropdown and the adjust-for-today container directly above the submit button.

Concretely, find the existing level field in `worksheet.html` and replace with:

```html
      <div class="field">
        <label for="level">CEFR level</label>
        <select id="level" required>
          <option value="A1">A1 — Just starting (basic words and set phrases)</option>
          <option value="A2">A2 — Can describe basic daily life</option>
          <option value="B1" selected>B1 — Handles familiar everyday topics</option>
          <option value="B2">B2 — Confident at work / study, idioms still hard</option>
          <option value="C1">C1 — Fluent on any topic, with some nuance</option>
          <option value="C2">C2 — Near-native</option>
        </select>
        <div id="level-quick-check"></div>
      </div>
```

Add `<div id="adjust-for-today"></div>` directly above the submit button.

- [ ] **Step 2: Modify `src/lib/page-worksheet.js`**

Insert the following block verbatim AFTER the existing `function resolveTargetLang()` declaration in `page-worksheet.js`. The block adds URL-param handling, profile pre-fill, the Don't-know quick-check, and the Adjust-for-today expander:

```js
// ---- Phase C: profile-aware additions ----

// URL params (?topic=...&from=lesson-plan)
(function applyUrlParams() {
  const params = new URLSearchParams(location.search);
  const t = params.get('topic'); if (t && document.getElementById('topic')) document.getElementById('topic').value = t;
  for (const id of ['target','level','mode','exam']) {
    const v = params.get(id); if (v && document.getElementById(id)) document.getElementById(id).value = v;
  }
})();

let __wsQuickLessonActive = false;
function applyProfilePrefill(student) {
  if (!student || __wsQuickLessonActive) return;
  if (document.getElementById('target') && student.target) document.getElementById('target').value = student.target;
  if (document.getElementById('level') && student.level) document.getElementById('level').value = student.level;
  if (document.getElementById('mode') && student.mode) document.getElementById('mode').value = student.mode;
  if (document.getElementById('exam') && typeof student.exam === 'string') document.getElementById('exam').value = student.exam;
  // URL params take precedence
  const params = new URLSearchParams(location.search);
  for (const k of ['target','level','mode','exam']) {
    const v = params.get(k); if (v && document.getElementById(k)) document.getElementById(k).value = v;
  }
}

(function mountProfileUi() {
  if (!SW.ProfileUI) return;
  const tutorContainer = document.getElementById('profile-tutor-strip');
  const studentContainer = document.getElementById('profile-student-strip');
  const saveContainer = document.getElementById('profile-save-link');
  const tutorMount = SW.ProfileUI.mountTutorStrip({container: tutorContainer});
  const studentMount = SW.ProfileUI.mountStudentStrip({
    container: studentContainer,
    onChange: (action) => {
      if (action === 'quick') { __wsQuickLessonActive = true; }
      else { __wsQuickLessonActive = false; applyProfilePrefill(SW.Profile.getCurrentStudent()); }
    }
  });
  SW.ProfileUI.mountSavePrompt({
    container: saveContainer,
    prefill: () => ({
      target: (document.getElementById('target') || {}).value || '',
      source: 'English',
      level: (document.getElementById('level') || {}).value || 'B1',
      mode: (document.getElementById('mode') || {}).value || 'one_to_one',
      exam: (document.getElementById('exam') || {}).value || ''
    }),
    onClick: (created) => {
      tutorMount && tutorMount.refresh && tutorMount.refresh();
      studentMount && studentMount.refresh && studentMount.refresh();
      applyProfilePrefill(created);
    }
  });
  applyProfilePrefill(SW.Profile.getCurrentStudent());
})();

(function mountQuickCheck() {
  if (!SW.ProfileUI) return;
  SW.ProfileUI.mountQuickCheck({
    container: document.getElementById('level-quick-check'),
    onLevel: (lvl) => { if (document.getElementById('level')) document.getElementById('level').value = lvl; }
  });
})();

let __wsAdjustHandle = null;
(function mountAdjust() {
  if (!SW.ProfileUI) return;
  __wsAdjustHandle = SW.ProfileUI.mountAdjustForToday({container: document.getElementById('adjust-for-today')});
})();
```

Then modify the form-submit handler to apply the overrides — find the existing `body: JSON.stringify({` payload and replace the `level`, `mode`, `exam` fields with:

```js
        level: (__wsAdjustHandle && __wsAdjustHandle.readOverrides().level) || $('level').value,
        mode: (__wsAdjustHandle && __wsAdjustHandle.readOverrides().mode) || $('mode').value,
        exam: (__wsAdjustHandle && __wsAdjustHandle.readOverrides().exam) || ($('exam') ? $('exam').value : ''),
```

(If `worksheet.html` doesn't have a `mode` field today, leave that line out — see the actual HTML.)

- [ ] **Step 3: Smoke-test in browser (worksheet flow)**

Open `http://localhost:8788/worksheet.html?topic=irregular+verbs&from=lesson-plan`. Confirm the topic field pre-fills. Set a profile via console and reload — confirm pre-fill happens. Click Quick lesson and submit — confirm the request body uses the form values, not the profile values.

- [ ] **Step 4: Commit**

```bash
git add worksheet.html src/lib/page-worksheet.js
git commit -m "feat(worksheet): integrate profile system + glosses + adjust-for-today + URL params"
```

### Task C3: Marking page

**Files:**
- Modify: `marking.html`
- Modify: `src/lib/page-marking.js`

- [ ] **Step 1: Add markup hooks to `marking.html`**

Add the `<div id="profile-mount">` block (with `tutor-strip`, `student-strip`, `save-link` children) right after the lead paragraph.

Replace the level select with the gloss-augmented version from C1:

```html
      <div class="field">
        <label for="level">Student CEFR level</label>
        <select id="level" required>
          <option value="A1">A1 — Just starting (basic words and set phrases)</option>
          <option value="A2">A2 — Can describe basic daily life</option>
          <option value="B1" selected>B1 — Handles familiar everyday topics</option>
          <option value="B2">B2 — Confident at work / study, idioms still hard</option>
          <option value="C1">C1 — Fluent on any topic, with some nuance</option>
          <option value="C2">C2 — Near-native</option>
        </select>
        <div id="level-quick-check"></div>
      </div>
```

Add `<div id="adjust-for-today"></div>` directly above the submit button.

- [ ] **Step 2: Modify `src/lib/page-marking.js`**

Insert the following block verbatim AFTER the existing `function resolveTargetLang()` declaration in `page-marking.js`. Marking has no `mode`, `exam`, or `goal` fields today — the profile pre-fill only touches `target` and `level`. Variable names use the `__mk` prefix so the module doesn't collide with other page scripts that might one day share a global scope:

```js
// ---- Phase C: profile-aware additions ----

// URL params (?from=lesson-plan&target=...&level=...)
(function applyUrlParams() {
  const params = new URLSearchParams(location.search);
  for (const id of ['target','level']) {
    const v = params.get(id); if (v && document.getElementById(id)) document.getElementById(id).value = v;
  }
})();

let __mkQuickLessonActive = false;
function applyMarkingPrefill(student) {
  if (!student || __mkQuickLessonActive) return;
  if (document.getElementById('target') && student.target) document.getElementById('target').value = student.target;
  if (document.getElementById('level') && student.level) document.getElementById('level').value = student.level;
  // URL params take precedence
  const params = new URLSearchParams(location.search);
  for (const k of ['target','level']) {
    const v = params.get(k); if (v && document.getElementById(k)) document.getElementById(k).value = v;
  }
}

(function mountProfileUi() {
  if (!SW.ProfileUI) return;
  const tutorContainer = document.getElementById('profile-tutor-strip');
  const studentContainer = document.getElementById('profile-student-strip');
  const saveContainer = document.getElementById('profile-save-link');
  const tutorMount = SW.ProfileUI.mountTutorStrip({container: tutorContainer});
  const studentMount = SW.ProfileUI.mountStudentStrip({
    container: studentContainer,
    onChange: (action) => {
      if (action === 'quick') { __mkQuickLessonActive = true; }
      else { __mkQuickLessonActive = false; applyMarkingPrefill(SW.Profile.getCurrentStudent()); }
    }
  });
  SW.ProfileUI.mountSavePrompt({
    container: saveContainer,
    prefill: () => ({
      target: (document.getElementById('target') || {}).value || '',
      source: 'English',
      level: (document.getElementById('level') || {}).value || 'B1',
      mode: 'one_to_one',
      exam: ''
    }),
    onClick: (created) => {
      tutorMount && tutorMount.refresh && tutorMount.refresh();
      studentMount && studentMount.refresh && studentMount.refresh();
      applyMarkingPrefill(created);
    }
  });
  applyMarkingPrefill(SW.Profile.getCurrentStudent());
})();

(function mountQuickCheck() {
  if (!SW.ProfileUI) return;
  SW.ProfileUI.mountQuickCheck({
    container: document.getElementById('level-quick-check'),
    onLevel: (lvl) => { if (document.getElementById('level')) document.getElementById('level').value = lvl; }
  });
})();

let __mkAdjustHandle = null;
(function mountAdjust() {
  if (!SW.ProfileUI) return;
  __mkAdjustHandle = SW.ProfileUI.mountAdjustForToday({container: document.getElementById('adjust-for-today')});
})();
```

Then patch the marking-form submit handler. Find the existing `body: JSON.stringify({` and replace its `level:` field so it reads:

```js
        level: (__mkAdjustHandle && __mkAdjustHandle.readOverrides().level) || $('level').value,
```

(The marking endpoint accepts `target`, `level`, and `sample` text. The Adjust-for-today expander only exposes `level` here because no `mode`/`exam` fields exist on the marking form.)

- [ ] **Step 3: Smoke-test**

Open `/marking.html`, set a profile, reload, confirm pre-fill. Hit Quick lesson — confirm the form is no longer pre-filled by the profile.

- [ ] **Step 4: Commit**

```bash
git add marking.html src/lib/page-marking.js
git commit -m "feat(marking): integrate profile system + glosses + adjust-for-today"
```

### Task C4: CEFR page — Save-this-level-to-profile button

**Files:**
- Modify: `cefr.html`
- Modify: `src/lib/page-cefr.js`

CEFR is the meta-tool that *creates* a level. The Phase C addition is a single button after the result renders that captures `nickname + target + source + level` into a profile.

- [ ] **Step 1: Add markup hooks to `cefr.html`**

Add the tutor strip + save-link mount AFTER the lead paragraph (no student strip — this is the tool that creates students):

```html
  <div id="profile-mount" class="profile-mount">
    <div id="profile-tutor-strip"></div>
    <div id="profile-save-link"></div>
  </div>
```

Inside the result panel (find the existing result section), append a placeholder for the Save-to-profile widget:

```html
  <div id="cefr-save-to-profile" class="cefr-save-block" hidden></div>
```

- [ ] **Step 2: Modify `src/lib/page-cefr.js`**

Locate where `cefr.html`'s page script renders the final result level. Append this block AFTER the level is set in the result panel:

```js
// Phase C: surface a Save-to-profile widget when a level is determined.
(function showSaveBlock(determinedLevel) {
  if (!SW.ProfileUI) return;
  const block = document.getElementById('cefr-save-to-profile');
  if (!block) return;
  block.hidden = false;
  block.innerHTML = '';
  const heading = document.createElement('p');
  heading.className = 'mono-caption';
  heading.textContent = '// SAVE THIS LEVEL TO A PROFILE';
  block.appendChild(heading);
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn secondary';
  btn.textContent = 'Save to a student profile';
  btn.addEventListener('click', () => {
    SW.ProfileUI.openStudentEditor({
      existing: {
        level: determinedLevel,
        target: (document.getElementById('target') || {}).value || '',
        source: (document.getElementById('source') || {}).value || 'English'
      },
      onSaved: (s) => {
        if (!s) return;
        // The dialog's save path defaulted level_set_via to 'manual'.
        // Override now to record the actual provenance.
        SW.Profile.updateStudent(s.id, {level_set_via: 'cefr_tool'});
        block.innerHTML = '';
        const ok = document.createElement('p');
        ok.className = 'small';
        ok.textContent = `Saved as "${s.nickname}". You'll see this student on every AI tool.`;
        block.appendChild(ok);
      }
    });
  });
  block.appendChild(btn);
})(window.__cefrLastLevel || 'B1');
```

You'll need to expose the determined level — find where the existing code computes the level and add `window.__cefrLastLevel = lvl;` immediately above the call site of `showSaveBlock`. The exact location depends on whether cefr.html uses the Can-Do path or the AI path; both branches must set `__cefrLastLevel` before invoking `showSaveBlock`.

Also add a tutor-strip mount near the top (mirrors Task C1):

```js
(function mountTutor() {
  if (!SW.ProfileUI) return;
  SW.ProfileUI.mountTutorStrip({container: document.getElementById('profile-tutor-strip')});
  SW.ProfileUI.mountSavePrompt({
    container: document.getElementById('profile-save-link'),
    prefill: () => ({}),
    onClick: () => location.reload()
  });
})();
```

- [ ] **Step 3: Smoke-test**

Open `/cefr.html`. Run a sample assessment. Confirm the Save-to-profile button appears below the result. Click it, save a student, then visit `/lesson-plan.html` and confirm the new student appears in the picker.

- [ ] **Step 4: Commit**

```bash
git add cefr.html src/lib/page-cefr.js
git commit -m "feat(cefr): add Save-this-level-to-profile widget on result panel"
```

---

## Phase E — Country-aware tools (rates, tax, setup, insurance, payments)

### Task E1: Tax / setup / insurance / payments — hide country dropdown when tutor profile present

**Files:**
- Modify: `tax.html`, `setup.html`, `insurance.html`, `payments.html`
- Modify: `src/lib/page-tax.js`, `src/lib/page-setup.js`, `src/lib/page-insurance.js`, `src/lib/page-payments.js`

These four files share a near-identical pattern: a `<select id="country">` driven by `SW.listCountries()`. Phase E hides the dropdown when a tutor country is set and shows a small "Showing X for [Country] [✎]" caption instead. The caption click reopens the tutor editor.

- [ ] **Step 1: Add tutor-strip mount + auto-select wiring to all four HTML files**

For each of the four pages, add this block AFTER the page's lead paragraph and BEFORE its `<form>`:

```html
  <div id="profile-mount" class="profile-mount">
    <div id="profile-tutor-strip"></div>
  </div>
  <p id="profile-country-caption" class="small" hidden></p>
```

Mark the existing `<select id="country">` with a `data-profile-country-bound` attribute so the page script knows it's the bound select:

```html
    <select id="country" name="country" data-profile-country-bound required></select>
```

(If the select already has additional attributes, just add the new attribute.)

- [ ] **Step 2: Add the binding helper to each `page-*.js`**

For each of the four `page-*.js` files, append (or insert near the top, before the existing `init` IIFE) this helper. The helper runs at startup, decides whether to bind the country to the tutor profile, and re-runs `render()` whenever the profile changes. Reuse the existing `render()` function — do not rewrite it.

```js
// Phase E: bind country select to tutor profile if set.
function applyTutorCountryBinding() {
  const sel = document.querySelector('select[data-profile-country-bound]');
  if (!sel) return;
  if (!SW || !SW.Profile) return;
  const tutor = SW.Profile.getTutor();
  const caption = document.getElementById('profile-country-caption');
  const formLabel = document.querySelector('label[for="country"]');
  if (tutor && tutor.country) {
    sel.value = tutor.country;
    sel.disabled = true;
    sel.parentElement.hidden = true;
    if (caption) {
      caption.hidden = false;
      caption.innerHTML = '';
      const txt = document.createTextNode('Showing ' + (document.title.split('—')[0] || 'data') + 'for ');
      const strong = document.createElement('strong');
      strong.textContent = countryName(tutor.country);
      const change = document.createElement('button');
      change.type = 'button';
      change.className = 'btn-link';
      change.textContent = ' Change';
      change.addEventListener('click', () => {
        if (SW.ProfileUI && SW.ProfileUI.openTutorEditor) {
          SW.ProfileUI.openTutorEditor({onSaved: () => location.reload()});
        }
      });
      caption.appendChild(txt);
      caption.appendChild(strong);
      caption.appendChild(change);
    }
  } else {
    sel.disabled = false;
    if (sel.parentElement) sel.parentElement.hidden = false;
    if (caption) caption.hidden = true;
  }
}

function countryName(code) {
  const list = SW.listCountries();
  const m = list.find(c => c.code === code);
  return m ? m.name : code;
}

// Mount tutor strip + bind on init
(function mountTutorStrip() {
  if (!SW.ProfileUI) return;
  SW.ProfileUI.mountTutorStrip({
    container: document.getElementById('profile-tutor-strip'),
    onChange: () => { applyTutorCountryBinding(); render(); }
  });
})();
```

After the existing `init` IIFE finishes (the one that populates the country dropdown and calls `render()`), call `applyTutorCountryBinding()`. The simplest patch: change the existing `await render()` line at the bottom of `init` to:

```js
  applyTutorCountryBinding();
  await render();
```

- [ ] **Step 3: Smoke-test**

For each of the four pages:
1. Open the page with no profile set — confirm the country dropdown shows + behaves exactly as today.
2. Set a tutor country via console: `Slatework.Profile.setTutor({country: 'GB'}); location.reload();` — confirm the country dropdown is hidden and the page renders for GB. Confirm "Showing tax info for United Kingdom Change" caption (or similar) appears under the lead.
3. Click Change — confirm the tutor editor opens. Save with a different country (e.g. AU) and confirm the page reloads with AU data.

- [ ] **Step 4: Commit**

```bash
git add tax.html setup.html insurance.html payments.html src/lib/page-tax.js src/lib/page-setup.js src/lib/page-insurance.js src/lib/page-payments.js
git commit -m "feat(country-tools): bind country select to tutor profile when set"
```

### Task E2: Rates page — country binding + language pair pre-fill

**Files:**
- Modify: `rates.html`
- Modify: `src/lib/page-rates.js`

Rates needs the same country binding as Task E1, PLUS pre-filling the language pair from the current student's `target+source`.

- [ ] **Step 1: Add tutor-strip mount and bind attribute to `rates.html`**

Add the same `<div id="profile-mount">` + `<p id="profile-country-caption">` block after the lead paragraph.

Add `data-profile-country-bound` to the existing `<select id="country">`.

- [ ] **Step 2: Modify `src/lib/page-rates.js`**

Insert the same `applyTutorCountryBinding()` and `countryName()` helpers from Task E1.

Inside the existing `init` IIFE, AFTER the language-pair dropdown is populated, add this pre-fill block:

```js
  // Phase E: pre-fill language pair from current student if available.
  if (SW.Profile) {
    const cur = SW.Profile.getCurrentStudent();
    if (cur && cur.target && cur.source) {
      const candidate = inferPairCode(cur.source, cur.target);
      if (candidate && pairSel.querySelector(`option[value="${candidate}"]`)) {
        pairSel.value = candidate;
      }
    }
  }
```

Add the helper at module scope:

```js
function inferPairCode(source, target) {
  // Simple two-letter pair codes used by data/countries/*.json:
  //   en-es = English -> Spanish, etc.
  const ABBR = {
    English: 'en', Spanish: 'es', French: 'fr', German: 'de', Italian: 'it',
    Portuguese: 'pt', Russian: 'ru', Mandarin: 'zh', Cantonese: 'yue',
    Japanese: 'ja', Korean: 'ko', Arabic: 'ar', Irish: 'ga'
  };
  const s = ABBR[source]; const t = ABBR[target];
  if (!s || !t) return null;
  return `${s}-${t}`;
}
```

Mount the tutor strip + call `applyTutorCountryBinding()` before `render()` (use the same patch as E1, except the function is `recalc()` here, not `render()`).

- [ ] **Step 3: Smoke-test**

Open `/rates.html` with no profile — confirm unchanged behaviour. Set:
```js
Slatework.Profile.setTutor({country: 'AU'});
Slatework.Profile.addStudent({nickname: 'X', target: 'Spanish', source: 'English', level: 'B1', mode: 'one_to_one'});
location.reload();
```
Confirm the country dropdown is hidden, the AU pack loads, the language pair selector defaults to `en-es`.

- [ ] **Step 4: Commit**

```bash
git add rates.html src/lib/page-rates.js
git commit -m "feat(rates): bind country to tutor profile + pre-fill language pair from student"
```

---

## Phase D — Contract progressive disclosure (independent, can ship anywhere)

### Task D1: Reorganise `contract.html` field order — 7 visible + 4 in More options expander

**Files:**
- Modify: `contract.html`
- Modify: `src/lib/page-contract.js`

- [ ] **Step 1: Replace the form structure in `contract.html`**

Find the existing `<form id="form">` block (lines ~118–166) and replace with:

```html
    <form id="form">
      <h2>Always visible</h2>

      <div class="field" id="field-tutor-name">
        <label for="tutor_name">Tutor name</label>
        <input id="tutor_name" type="text" placeholder="e.g., Sarah Chen" autocomplete="name" />
        <span class="help" id="tutor-name-from-profile" hidden></span>
      </div>

      <div class="field" id="field-contact-email">
        <label for="contact_email">Contact email</label>
        <input id="contact_email" type="email" placeholder="hello@yourdomain.com" autocomplete="email" />
        <span class="help" id="contact-email-from-profile" hidden></span>
      </div>

      <div class="field"><label for="subject">Subject / language</label><input id="subject" type="text" placeholder="e.g., GCSE Spanish, Mandarin conversation, IB English" /></div>
      <div class="field"><label for="rate">Rate per lesson</label><input id="rate" type="text" placeholder="e.g., $50 per 60-minute lesson, or whatever your local currency uses" /></div>
      <div class="field"><label for="duration">Lesson duration</label><input id="duration" type="text" placeholder="e.g., 60 minutes" value="60 minutes" /></div>
      <div class="field"><label for="location">Location</label><input id="location" type="text" placeholder="e.g., online via Zoom, or in-person at the student's home" value="online via Zoom" /></div>
      <div class="field"><label for="cancel_hours">Cancellation notice (hours)</label><input id="cancel_hours" type="number" min="0" max="168" step="1" value="24" /></div>
      <div class="field"><label for="payment_terms">Payment terms</label><input id="payment_terms" type="text" placeholder="e.g., paid weekly in advance via Faster Payments" value="paid weekly in advance" /></div>

      <details class="contract-more">
        <summary>More options (4 fields)</summary>

        <div class="field"><label for="business_name">Business name (optional)</label><input id="business_name" type="text" placeholder="leave blank to use your name" autocomplete="organization" /></div>

        <div class="field">
          <label for="years_teaching">Years teaching (optional)</label>
          <input id="years_teaching" type="number" min="0" max="60" step="1" placeholder="e.g. 5" />
          <span class="help">Used in the warm/formal welcome paragraphs. Leave blank to skip.</span>
        </div>

        <div class="field">
          <label for="cancel_fee">Late-cancel fee</label>
          <select id="cancel_fee">
            <option value="full">Full lesson fee</option>
            <option value="half" selected>Half lesson fee</option>
            <option value="none">No fee (rebook only)</option>
          </select>
        </div>

        <div class="field">
          <label for="welcome_tone">Welcome paragraph tone</label>
          <select id="welcome_tone">
            <option value="warm">Warm</option>
            <option value="formal">Formal</option>
            <option value="brief" selected>Brief and practical</option>
            <option value="custom">Custom (write your own)</option>
          </select>
        </div>

        <div class="field" id="welcome_custom_field" hidden>
          <label for="welcome_custom">Custom welcome paragraph</label>
          <textarea id="welcome_custom" placeholder="Type your own welcome paragraph here."></textarea>
          <span class="help">Tip: keep it under 80 words. The contract preview updates as you type.</span>
        </div>
      </details>

      <div class="field mt-15">
        <button type="button" id="print-btn" class="btn btn-primary">Print or save as PDF</button>
      </div>
    </form>
```

(Note: this drops the `<h2>Lesson details</h2>` / `<h2>Policy</h2>` / `<h2>Parent welcome paragraph</h2>` section headers in favour of one always-visible block + the More-options expander, per spec §5.6.)

- [ ] **Step 2: Add CSS for the contract-more details**

Append to `src/lib/styles.css`:

```css
details.contract-more {
  margin: 1.5rem 0;
  border: 1px dashed var(--line-strong);
  border-radius: var(--radius-sm);
  padding: 0.5rem 0.75rem;
}
details.contract-more > summary {
  cursor: pointer;
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--ink-2);
  padding: 0.25rem 0;
}
details.contract-more[open] > summary {
  margin-bottom: 0.5rem;
  color: var(--ink);
}
```

- [ ] **Step 3: Modify `src/lib/page-contract.js` to source name/email from tutor profile**

Insert this block at the TOP of `page-contract.js` (before the existing `const $`):

```js
// Phase D: hydrate tutor name + email from profile if set.
(function hydrateFromTutorProfile() {
  const SW = window.Slatework;
  if (!SW || !SW.Profile) return;
  const tutor = SW.Profile.getTutor();
  const nameInput = document.getElementById('tutor_name');
  const emailInput = document.getElementById('contact_email');
  if (tutor && tutor.name && nameInput && !nameInput.value) {
    nameInput.value = tutor.name;
    const note = document.getElementById('tutor-name-from-profile');
    if (note) {
      note.hidden = false;
      note.innerHTML = '';
      note.appendChild(document.createTextNode('Pulled from your saved tutor profile. '));
      const link = document.createElement('button');
      link.type = 'button';
      link.className = 'btn-link';
      link.textContent = 'Change';
      link.addEventListener('click', () => {
        if (SW.ProfileUI && SW.ProfileUI.openTutorEditor) {
          SW.ProfileUI.openTutorEditor({onSaved: () => location.reload()});
        }
      });
      note.appendChild(link);
    }
  }
  if (tutor && tutor.email && emailInput && !emailInput.value) {
    emailInput.value = tutor.email;
    const note = document.getElementById('contact-email-from-profile');
    if (note) {
      note.hidden = false;
      note.textContent = 'Pulled from your saved tutor profile.';
    }
  }
  // Pre-fill subject from current student target language
  const subjectInput = document.getElementById('subject');
  const cur = SW.Profile.getCurrentStudent();
  if (cur && cur.target && subjectInput && !subjectInput.value) {
    subjectInput.value = cur.target;
  }
})();
```

The rest of `page-contract.js` stays as today — `render()` reads from the DOM regardless of whether the values were typed by the user or pulled from the profile. The existing `localizeRatePlaceholder()` function continues to provide the rate placeholder.

Persist tutor email back to the profile when the user types it (so a second contract use already has it):

Insert this AFTER the existing form `input` listener (`form.addEventListener('input', render);`):

```js
const emailInput = document.getElementById('contact_email');
if (emailInput) {
  emailInput.addEventListener('blur', () => {
    const SW = window.Slatework;
    if (!SW || !SW.Profile) return;
    const v = emailInput.value.trim();
    if (!v) return;
    const t = SW.Profile.getTutor();
    if (!t) return;
    if (t.email !== v) SW.Profile.setTutor({country: t.country, email: v, name: t.name, business_name: t.business_name});
  });
}
```

- [ ] **Step 4: Smoke-test**

Open `/contract.html` with no profile — confirm 7 fields visible + 1 expander labelled "More options (4 fields)" containing exactly: Business name, Years teaching, Late-cancel fee, Welcome tone (and the conditional Custom welcome textarea). Confirm preview renders.

Set a tutor profile via console: `Slatework.Profile.setTutor({country: 'GB', name: 'Sarah Chen', email: 's@s.com'}); location.reload();`. Confirm Tutor name + Contact email pre-populate with the "Pulled from your saved tutor profile" caption.

Set a current student: `Slatework.Profile.addStudent({nickname: 'L', target: 'Spanish', source: 'English', level: 'B1', mode: 'one_to_one'}); location.reload();`. Confirm Subject pre-fills with "Spanish".

Confirm Print/Save still produces a PDF preview when clicked.

- [ ] **Step 5: Commit**

```bash
git add contract.html src/lib/page-contract.js src/lib/styles.css
git commit -m "feat(contract): progressive disclosure (7+4) + tutor-profile name/email/subject hydration"
```

---

## Phase F2 — Final cache-buster bump and deploy

### Task FF1: Bump cache-buster across all pages and deploy preview

**Files:**
- Modify: any HTML page that still has `?v=15` after Phase B/C/D/E

By the end of Phase E most pages are at `?v=16`. After Phase D's contract refactor lands, bump everything to `?v=17` so users get a fresh load on first visit post-deploy.

- [ ] **Step 1: Run a sweep**

Run: `Grep` (the actual tool, not a Bash grep) for `?v=15` across all `.html` files. Replace each with `?v=17`. Then sweep for `?v=16` and replace with `?v=17`. (Two-step so we can confirm no orphan v=14 hangs around.)

```powershell
# This is a manual replacement using Edit; do not script it via PowerShell.
```

Use the `Edit` tool with `replace_all: true` per file:
- `?v=15` → `?v=17`
- `?v=16` → `?v=17`

- [ ] **Step 2: Manual sanity sweep**

Open each of the 12 modified pages in a browser. In console:
```js
[...document.querySelectorAll('script[src*="/src/lib/"], link[href*="/src/lib/"]')].map(n => n.src || n.href)
```
Expected: every URL ends in `?v=17`. None ends in `?v=14`, `?v=15`, or `?v=16`.

- [ ] **Step 3: Commit**

```bash
git add lesson-plan.html worksheet.html marking.html cefr.html rates.html contract.html tax.html setup.html insurance.html payments.html privacy.html index.html
git commit -m "chore(deploy): bump cache-buster to v=17 across all pages"
```

- [ ] **Step 4: Deploy preview to Cloudflare Pages**

Manual step (Darren). Push to a preview branch, eyeball the deployed URL, run all of the smoke tests once on the live preview before merging to `main`.

---

## Phase B/C/D/E end-to-end smoke test (run as the final gate before merging)

This is a single browser-driven test sequence that exercises every changed surface. Run it AFTER the cache-buster bump in Task FF1 and before merging the branch.

- [ ] **Step 1: Empty-state walkthrough**

Open the deployed preview URL. Don't set any profile.
- `/` — confirm new FAQ entry "Do I have to make an account or save anything?" appears in the FAQ block.
- `/lesson-plan.html` — confirm strips hidden, "+ Save my setup" link visible, level dropdown shows glosses, Don't-know expander present, Adjust-for-today present below goal field. Generate a plan, confirm extension buttons appear (slideshow stub clicks log to console).
- `/worksheet.html?topic=irregular+verbs&from=lesson-plan` — confirm topic pre-filled.
- `/marking.html` — confirm strips hidden + Save link visible.
- `/cefr.html` — run a Can-Do assessment, confirm Save-to-profile button appears.
- `/contract.html` — confirm 7 fields visible + More options (4 fields) expander.
- `/rates.html`, `/tax.html`, `/setup.html`, `/insurance.html`, `/payments.html` — confirm each shows the country dropdown.
- `/privacy.html` — confirm Profile section + Clear/Export/Import buttons.

- [ ] **Step 2: Profile-state walkthrough**

In console on any tool page:
```js
Slatework.Profile.setTutor({country: 'GB', name: 'Sarah Chen', email: 's@s.com'});
Slatework.Profile.addStudent({nickname: 'Lily', target: 'Spanish', source: 'English', level: 'A2', mode: 'one_to_one'});
```
Reload and visit each page in turn. Confirm:
- Lesson-plan / worksheet / marking — student strip shows Lily, form pre-fills.
- Cefr — only tutor strip shows.
- Tax / setup / insurance / payments — country dropdown hidden, "Showing X for United Kingdom Change" caption visible.
- Rates — country hidden + language pair `en-es` selected.
- Contract — Tutor name + email pre-filled with "Pulled from saved tutor profile" caption + Subject pre-fills "Spanish".

- [ ] **Step 3: Quick-lesson exit**

On `/lesson-plan.html` with profile set, click Quick lesson →. Change form values (e.g. switch to French). Submit. Confirm the request body contains French, not Spanish.

- [ ] **Step 4: Privacy export/import round-trip**

On `/privacy.html`, click Export. Save the JSON file. Click Clear all profiles. Confirm Lily disappears from `/lesson-plan.html`. Click Import on `/privacy.html`, select the saved file. Reload `/lesson-plan.html`, confirm Lily reappears.

- [ ] **Step 5: Lighthouse gate**

Run Lighthouse against `/lesson-plan.html` on the preview URL. Confirm:
- Accessibility: 9.4 or higher (the spec's pre-baseline)
- Performance: 9.0 or higher
- Best Practices: no new violations
- SEO: 100

If any score regresses, do not merge — investigate. Likely culprits: missing `aria-labelledby` on the dialog, an overlooked inline style.

- [ ] **Step 6: Strict CSP gate**

Open the preview URL. In DevTools Console, with the filter set to "All", confirm zero `Content Security Policy` violation warnings. The `<dialog>` element does NOT trigger a CSP issue because all its event listeners are added programmatically via `addEventListener`, not via `onclick=` attributes.

- [ ] **Step 7: Merge**

If all 6 gates pass, merge the branch.

---

## Self-review (rubric from `superpowers:writing-plans`)

### 1. Spec coverage

| Spec section | Requirement | Covered by |
|---|---|---|
| §3.1 | localStorage key `slatework.profiles.v1` | A1 (constant `STORAGE_KEY`) |
| §3.2 | Schema versioned with `schema: 1` | A1 (`SCHEMA_VERSION = 1`, written into `emptyShape()`) |
| §3.3 | Field reference (tutor.country in 7-country allowlist, `level_set_via`, etc.) | A1 (`COUNTRY_ALLOWLIST`, `level_set_via` parameter on `addStudent`) |
| §3.4 | Public CRUD API surface | A1 (every named method present + frozen namespace) |
| §3.5 | Audience derivation rules | A1 (`deriveAudience` function) + A1 smoke tests 8 |
| §4.1 | Tutor strip markup + behavior | B1 (`mountTutorStrip`) |
| §4.2 | Student strip markup + behavior, including Quick-lesson | B1 (`mountStudentStrip` with `onChange('quick')` handler) |
| §4.3 | Profile editor `<dialog>` modal | B1 (`openStudentEditor` / `openTutorEditor`) |
| §4.4 | Don't-know inline 3-question quick-check + rule mapping | B1 (`buildQuickCheckEl` + `quickCheckMap`) |
| §4.5 | "Adjust for today" expander | B1 (`mountAdjustForToday`) |
| §5.1 | Lesson-plan refactor (strip + glosses + Don't-know + Adjust-for-today + result extension placeholder) | C1 |
| §5.2 | Worksheet refactor (strip + glosses + Don't-know + Adjust-for-today + URL params) | C2 |
| §5.3 | Marking refactor | C3 |
| §5.4 | CEFR Save-this-level-to-profile | C4 |
| §5.5 | Rates country binding + language pair pre-fill | E2 |
| §5.6 | Contract 7+4 progressive disclosure + tutor profile name/email | D1 |
| §5.7 | Tax/setup/insurance/payments country binding | E1 |
| §5.8 | Homepage FAQ entry | F2 |
| §6 | Slideshow integration | Out of scope (Phase G plan) |
| §7.1 | `/privacy` profile section + Clear/Export/Import | F1 |
| §7.2 | "This stays in your browser" caption on every editor | B1 (`profile-editor-privacy` element in `openStudentEditor` and `openTutorEditor`) |
| §8.1 | First-visit experience: no banner, no modal | All Phase C tasks: strips render hidden when no profile |
| §8.2 | URL parameters continue to work | C1 (URL-param block + override after profile pre-fill); C2 mirrors |
| §8.3 | Schema migration anchor (`schema: 1`) | A1 (`if (parsed.schema !== SCHEMA_VERSION) return emptyShape()`) |
| §12 | Acceptance criteria | Final smoke test exercises every line |

No gaps detected.

### 2. Placeholder scan

Searched the plan for: `TBD`, `TODO`, `FIXME`, `[FULL`, `[INSERT`, `placeholder for`, `similar to`, `implement later`, `like before`, `as above`. None found. Every code block is paste-ready.

### 3. Type consistency

- `Slatework.Profile.setTutor`: defined in A1, called by B1 (`openTutorEditor`), F1 (privacy buttons via internal `setTutor` on import), D1 (contract email persistence). Same signature `({country, name?, email?, business_name?})`.
- `Slatework.Profile.addStudent`: defined in A1, called by B1 (`openStudentEditor`), C4 (cefr.html save). Same signature.
- `Slatework.Profile.getCurrentStudent`: defined in A1, called by B1 (`mountStudentStrip`), C1/C2/C3 (page pre-fill), D1 (contract subject), E2 (rates language pair). All call with no args, all expect `{id, nickname, target, source, level, mode, exam, audience_profile, ...}`.
- `Slatework.Profile.deriveAudience({level, mode, exam})`: defined in A1, called internally by `addStudent` and `updateStudent`, exposed for slideshow plan. Pure function.
- `Slatework.ProfileUI.mountTutorStrip / mountStudentStrip / mountSavePrompt`: all return `{refresh()}` per B1; pages call `refresh()` in C1/C2/C3.
- `Slatework.ProfileUI.openTutorEditor / openStudentEditor`: both accept `{existing?, onSaved?}` and call `onSaved(result)` — used in B1, C1, C4, D1, E1.
- CSS class names — `.tutor-strip`, `.student-strip`, `.profile-editor`, `.cefr-quick-check`, `.adjust-for-today`, `.profile-empty-link`, `.profile-actions`, `.contract-more`, `.extensions`, `.visually-hidden` — all defined in B2/D1 and used in B1/D1/F1.

No naming drift detected.

### 4. Dependency check

- A1 (replace profile.js) → A2 (add script tag) → A3 (docs)
- A1 → B1 (uses `Slatework.Profile`) → B2 (CSS for atoms) → B3 (script tags)
- A1 + B1 + B3 → F1 (privacy uses Profile.clearAll / exportAsJson / importFromJson) → F2 (homepage FAQ)
- A1 + B1 + B3 → C1 (lesson-plan), C2 (worksheet), C3 (marking), C4 (cefr) — all four C tasks are siblings, runnable in parallel after B finishes
- A1 + B1 + B3 → E1 (data viewers) → E2 (rates uses same pattern + extra)
- A1 + B1 + B3 (or A1 alone if `ProfileUI` is degraded) → D1 (contract uses Profile + ProfileUI.openTutorEditor)
- All phases → FF1 (cache-buster bump + deploy)

Each task's prereqs are earlier in the plan. No forward references.

---

## Conventional-commits map

| Phase | Commits |
|---|---|
| A | `feat(profile): add Slatework.Profile namespace + smoke tests` · `chore(profile): wire profile.js + bump cache-buster to v15` · `docs(profile): add public API reference` |
| B | `feat(profile): add ProfileUI atoms (strips, dialog, quick-check, adjust-for-today)` · `feat(profile): add styles for tutor/student strip, editor dialog, quick-check, adjust-for-today` · `chore(profile): wire profile-ui.js across consumer pages, v=16` |
| F | `feat(privacy): add profile section with Clear/Export/Import controls` · `feat(index): add 'Do I have to make an account?' FAQ + JSON-LD` |
| C | `feat(lesson-plan): integrate profile system + glosses + adjust-for-today + extension placeholders` · `feat(worksheet): integrate profile system + glosses + adjust-for-today + URL params` · `feat(marking): integrate profile system + glosses + adjust-for-today` · `feat(cefr): add Save-this-level-to-profile widget on result panel` |
| E | `feat(country-tools): bind country select to tutor profile when set` · `feat(rates): bind country to tutor profile + pre-fill language pair from student` |
| D | `feat(contract): progressive disclosure (7+4) + tutor-profile name/email/subject hydration` |
| FF | `chore(deploy): bump cache-buster to v=17 across all pages` |

---

**End of plan.** After Phase A–F lands and is deployed, Phase G (slideshow) at `docs/superpowers/plans/2026-05-09-slideshow-feature.md` becomes unblocked.
