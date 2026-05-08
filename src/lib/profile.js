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
  if (SW.Profile) return; // idempotent: ignore double-load
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

  // Patch any partially-corrupted state up to a valid emptyShape() match.
  // Used by both read() (post-parse) and importFromJson() (post-schema-check).
  function normalizeShape(parsed) {
    if (!parsed || typeof parsed !== 'object') return emptyShape();
    const empty = emptyShape();
    return {
      schema: SCHEMA_VERSION,
      tutor: parsed.tutor || null,
      students: Array.isArray(parsed.students) ? parsed.students : [],
      current_student_id: typeof parsed.current_student_id === 'undefined' ? null : parsed.current_student_id,
      preferences: parsed.preferences || empty.preferences
    };
  }

  // Trim, fall back, and slice user-provided strings so a pasted multi-MB
  // blob can't blow the 5MB localStorage quota silently.
  function clampStr(value, fallback = '', max = 200) {
    if (typeof value !== 'string') return fallback;
    return value.trim().slice(0, max);
  }

  function read() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyShape();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return emptyShape();
      if (parsed.schema !== SCHEMA_VERSION) return emptyShape(); // future-proof migration anchor
      return normalizeShape(parsed);
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
      name: clampStr(partial.name, existing.name || ''),
      email: clampStr(partial.email, existing.email || ''),
      business_name: clampStr(partial.business_name, existing.business_name || ''),
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
    const nickname = clampStr(p.nickname, '');
    if (!nickname) return null; // rejects missing AND whitespace-only nicknames
    const state = read();
    const id = genId(nickname);
    const level = String(p.level || 'B1').toUpperCase();
    const mode = String(p.mode || 'one_to_one');
    const exam = clampStr(p.exam, '');
    const audience = p.audience_profile || deriveAudience({level, mode, exam});
    const student = {
      id,
      nickname,
      target: clampStr(p.target, ''),
      source: clampStr(p.source, 'English'),
      level,
      level_set_via: p.level_set_via || 'manual',
      mode,
      exam,
      audience_profile: audience,
      audience_set_via: p.audience_profile ? 'manual' : 'auto',
      notes: clampStr(p.notes, '', 1000),
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
    // Normalise incoming partial: coerce level uppercase, clamp strings.
    // Mirrors addStudent so updates can't desync stored level vs derived audience.
    const cleanPartial = { ...partial };
    if (typeof cleanPartial.level === 'string') {
      cleanPartial.level = cleanPartial.level.toUpperCase();
    }
    if (typeof cleanPartial.exam === 'string') {
      cleanPartial.exam = clampStr(cleanPartial.exam, '');
    }
    if (typeof cleanPartial.notes === 'string') {
      cleanPartial.notes = clampStr(cleanPartial.notes, '', 1000);
    }
    if (typeof cleanPartial.nickname === 'string') {
      cleanPartial.nickname = clampStr(cleanPartial.nickname, state.students[idx].nickname);
    }
    if (typeof cleanPartial.target === 'string') {
      cleanPartial.target = clampStr(cleanPartial.target, state.students[idx].target);
    }
    if (typeof cleanPartial.source === 'string') {
      cleanPartial.source = clampStr(cleanPartial.source, state.students[idx].source);
    }
    const merged = { ...state.students[idx], ...cleanPartial, id, last_used_at: nowIso() };
    if (cleanPartial.level || cleanPartial.mode || (typeof cleanPartial.exam === 'string')) {
      merged.audience_profile = cleanPartial.audience_profile
        || deriveAudience({level: merged.level, mode: merged.mode, exam: merged.exam});
      merged.audience_set_via = cleanPartial.audience_profile ? 'manual' : 'auto';
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
      // Run through the same shape-normalization path as read() so a
      // tampered-but-schema-valid file can't write missing students/preferences.
      return write(normalizeShape(parsed));
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
    // Exam target wins — IELTS / GCSE / Leaving Cert / TOEFL / etc. → exam_prep regardless of level/mode
    const trimmedExam = typeof exam === 'string' ? exam.trim() : '';
    if (trimmedExam.length >= 2) return 'exam_prep';
    const lvl = String(level || '').toUpperCase();
    const md = String(mode || 'one_to_one');
    // Mode is a stronger child-vs-adult signal than level alone:
    //   classroom + small_group with A1/A2 → young_learner (kid classes)
    //   classroom + small_group with B1+ → adult (adult ESL classroom, school groups)
    //   1:1 → adult by default (covers Sophie/Marie-Claire/Megan/Beatriz B1+1:1 cases)
    // The 'teen' audience is intentionally never auto-routed; it requires manual
    // override in the profile editor. Real teen tutoring almost always sets
    // exam=GCSE/JuniorCert/etc which captures it via exam_prep.
    if (md === 'classroom' || md === 'small_group') {
      if (lvl === 'A1' || lvl === 'A2') return 'young_learner';
      return 'adult';
    }
    // 1:1 mode (default) — adult unless overridden manually
    return 'adult';
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
