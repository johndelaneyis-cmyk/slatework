// Extracted from worksheet.html during CSP-nonce refactor (2026-05-07).
// Phase C (2026-05-09): profile-aware. Loaded via <script src="/src/lib/page-worksheet.js" defer> from worksheet.html.
const $ = (id) => document.getElementById(id);
const SW = window.Slatework;
const renderMarkdown = SW.renderMarkdown;
const escapeHtml = SW.escapeHtml;

// ---- 1. Build target language dropdown ----
(function buildTargetDropdown() {
  const sel = $('target');
  const targets = SW.targetLanguageList();
  for (const t of targets) {
    const opt = document.createElement('option');
    opt.value = t.value;
    opt.textContent = t.label;
    sel.appendChild(opt);
  }
  sel.value = 'English';
  sel.addEventListener('change', () => {
    const otherInput = $('target_other');
    if (sel.value === 'Other') {
      otherInput.hidden = false;
      otherInput.required = true;
    } else {
      otherInput.hidden = true;
      otherInput.required = false;
    }
  });
})();

function resolveTargetLang() {
  const sel = $('target');
  if (sel.value === 'Other') return $('target_other').value.trim();
  return sel.value;
}

// ---- 2. URL params (backwards compat + lesson-plan cross-tool flow) ----
(function applyUrlParams() {
  const params = new URLSearchParams(location.search);
  const map = {
    target: 'target',
    level: 'level',
    topic: 'topic',
    exam: 'exam',
    format: 'format',
    count: 'count'
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
  if ($('level') && student.level) $('level').value = student.level;
  // URL params still take precedence � re-apply
  const params = new URLSearchParams(location.search);
  for (const k of ['target','level','topic','exam','format','count']) {
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
  let saveMount;
  const studentMount = SW.ProfileUI.mountStudentStrip({
    container: studentContainer,
    onChange: (action) => {
      if (action === 'quick') {
        quickLessonModeActive = true;
      } else {
        quickLessonModeActive = false;
        applyProfilePrefill(SW.Profile.getCurrentStudent());
      }
      if (saveMount && saveMount.refresh) saveMount.refresh();
    }
  });
  saveMount = SW.ProfileUI.mountSavePrompt({
    container: saveContainer,
    prefill: () => ({
      target: $('target') ? $('target').value : '',
      level: $('level') ? $('level').value : 'A2'
    }),
    onClick: (created) => {
      if (tutorMount && tutorMount.refresh) tutorMount.refresh();
      if (studentMount && studentMount.refresh) studentMount.refresh();
      applyProfilePrefill(created);
    }
  });

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
  const topicEl = $('topic');
  topicEl.removeAttribute('aria-invalid');
  btn.disabled = true;
  $('result').hidden = false;
  $('worksheet').innerHTML = '<div class="slate-loading"><p class="mono-caption"><span class="dot"></span>DRAFTING THE WORKSHEET</p><div class="chalk-dots" aria-hidden="true"><span class="chalk-dot"></span><span class="chalk-dot"></span><span class="chalk-dot"></span></div><p class="slate-loading-sub">Roughly 15�40 seconds. Worksheet first, answer key after.</p></div>';
  $('answer-key').hidden = true;

  // Apply Adjust-for-today overrides if set
  const overrides = adjustHandle ? adjustHandle.readOverrides() : {level: null, mode: null, exam: null};

  try {
    const r = await fetch('/api/worksheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_language: resolveTargetLang(),
        level: overrides.level || $('level').value,
        topic: $('topic').value,
        exam: overrides.exam || $('exam').value,
        format: $('format').value,
        count: parseInt($('count').value, 10)
      })
    });
    if (!r.ok) {
      const errBody = await r.json().catch(() => ({}));
      if (r.status === 400 && (errBody.error || '').toLowerCase().includes('topic')) {
        topicEl.setAttribute('aria-invalid', 'true');
      }
      $('worksheet').innerHTML = '<p>' + escapeHtml(errBody.error || 'Could not generate.') + '</p>';
      return;
    }
    const data = await r.json();
    $('worksheet').innerHTML = renderMarkdown(data.worksheet || '');
    if (data.answer_key) {
      $('answer-key').innerHTML = renderMarkdown(data.answer_key);
    }
  } catch {
    $('worksheet').innerHTML = '<p>Network error. Try again.</p>';
  } finally {
    btn.disabled = false;
  }
});

// ---- 8. Print handlers � use afterprint to reliably restore visibility ----
$('print-ws').addEventListener('click', () => {
  $('answer-key').hidden = true;
  $('worksheet').hidden = false;
  window.print();
});
$('print-ak').addEventListener('click', () => {
  $('worksheet').hidden = true;
  $('answer-key').hidden = false;
  const restore = () => {
    $('worksheet').hidden = false;
    window.removeEventListener('afterprint', restore);
  };
  window.addEventListener('afterprint', restore, { once: true });
  window.print();
});
