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
  targetSel.value = 'English';

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
  sourceSel.value = 'Spanish';

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
  body.innerHTML = '<div class="slate-loading"><p class="mono-caption"><span class="dot"></span>COMPOSING ON THE SLATE</p><div class="chalk-dots" aria-hidden="true"><span class="chalk-dot"></span><span class="chalk-dot"></span><span class="chalk-dot"></span></div><p class="slate-loading-sub">Roughly 10–40 seconds. Don\'t refresh — the model is writing, not stuck.</p></div>';

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
    // Wire the worksheet + marking extension links with the lesson context so
    // the downstream forms open pre-filled instead of empty.
    populateExtensionLinks();
    $('extensions').hidden = false;
  } catch {
    body.innerHTML = '<p>Network error. Try again in a moment.</p>';
  } finally {
    btn.disabled = false;
  }
});

// Populate the extension anchor hrefs with the current form context so the
// worksheet + marking pages open pre-filled instead of empty when the tutor
// clicks "Generate worksheet for this plan" / "Mark a student response to this plan".
function populateExtensionLinks() {
  const target = resolveLang('target', 'target_other');
  const source = resolveLang('source', 'source_other');
  const level = $('level').value;
  const mode = $('mode').value;
  const exam = $('exam').value;
  const goal = ($('goal').value || '').trim();

  // Worksheet pre-fill: target + level + mode + exam + topic seeded from goal.
  // The worksheet's own AI call generates exercises that match the lesson topic.
  const wsParams = new URLSearchParams();
  wsParams.set('from', 'lesson-plan');
  if (target) wsParams.set('target', target);
  if (level) wsParams.set('level', level);
  if (mode) wsParams.set('mode', mode);
  if (exam) wsParams.set('exam', exam);
  if (goal) wsParams.set('topic', goal.slice(0, 200));
  const wsLink = $('ext-worksheet');
  if (wsLink) wsLink.href = '/worksheet.html?' + wsParams.toString();

  // Marking pre-fill: target + level only (marking has no mode/exam/topic fields).
  const mkParams = new URLSearchParams();
  mkParams.set('from', 'lesson-plan');
  if (target) mkParams.set('target', target);
  if (level) mkParams.set('level', level);
  const mkLink = $('ext-marking');
  if (mkLink) mkLink.href = '/marking.html?' + mkParams.toString();
}

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

// --- Char counter wiring on the goal textarea.
(function wireCharCounter() {
  const ta = document.getElementById('goal');
  const cc = document.getElementById('goal-cc');
  if (!ta || !cc) return;
  const max = parseInt(ta.getAttribute('maxlength') || '0', 10);
  if (!max) return;
  const update = () => {
    const n = ta.value.length;
    cc.textContent = n + ' / ' + max;
    cc.classList.toggle('is-warning', n >= max * 0.85 && n < max);
    cc.classList.toggle('is-over', n >= max);
  };
  ta.addEventListener('input', update);
  update();
})();
