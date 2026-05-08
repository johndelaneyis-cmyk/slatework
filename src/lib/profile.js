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
