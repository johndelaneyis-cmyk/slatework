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
  if (SW.ProfileUI) return; // idempotent: ignore double-load
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
      ['Spanish','French','German','English','Mandarin','Japanese','Korean','Italian','Portuguese','Arabic','Other'].forEach(v => targetSel.appendChild(buildOption(v, v, v === ex.target)));
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
