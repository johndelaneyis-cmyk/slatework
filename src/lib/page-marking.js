// Extracted from marking.html during CSP-nonce refactor (2026-05-07).
// Loaded via <script src="/src/lib/page-marking.js" defer> from marking.html.
const $ = (id) => document.getElementById(id);
const SW = window.Slatework;
const renderMarkdown = SW.renderMarkdown;
const escapeHtml = SW.escapeHtml;

// Build target language dropdown from Slatework.targetLanguageList() — curated, deduped.
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

// RTL languages where feedback cards (especially quoted student writing) need
// right-to-left rendering. Detected at render time off the resolved target.
const RTL_TARGETS = new Set([
  'Arabic', 'Urdu', 'Hebrew', 'Persian/Farsi', 'Persian', 'Farsi', 'Pashto'
]);
function isRtlTarget(lang) {
  if (!lang) return false;
  // Match exact value or case-insensitive substring (handles "Arabic (MSA)" etc.)
  const lower = String(lang).toLowerCase();
  for (const t of RTL_TARGETS) {
    if (lower === t.toLowerCase() || lower.includes(t.toLowerCase())) return true;
  }
  return false;
}

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
      if (tutorMount && tutorMount.refresh) tutorMount.refresh();
      if (studentMount && studentMount.refresh) studentMount.refresh();
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

// Wire the file-drop zone
(function wireDrop() {
  const dropZone = $('drop-zone');
  const textarea = $('sample');
  const dropStatus = $('drop-status');
  if (!dropZone || !SW.attachFileDrop) return;
  SW.attachFileDrop({
    dropZone,
    textarea,
    onStatus: (msg) => { dropStatus.textContent = msg; },
    imageHandler: async (base64, mime) => {
      // Decoupled architecture: image goes to /api/ocr (Google Vision) for
      // text extraction, then the user reviews/edits before submitting
      // text-only to /api/marking. Anthropic never sees the image, so its
      // content classifier can't refuse student-writing photos.
      dropStatus.textContent = 'Extracting text from photo (OCR)…';
      try {
        const r = await fetch('/api/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_data: base64, image_mime: mime })
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          dropStatus.textContent = data.error || 'OCR failed. Type the writing in the box below instead.';
          return;
        }
        if (data.ocr_empty || !data.text) {
          dropStatus.textContent = data.error || "OCR ran but didn't find readable text. Try a clearer photo or type the writing.";
          return;
        }
        const cap = textarea.maxLength && textarea.maxLength > 0 ? textarea.maxLength : 4000;
        if (data.text.length > cap) {
          textarea.value = data.text.slice(0, cap);
          dropStatus.textContent = `OCR extracted ${data.text.length.toLocaleString()} chars; trimmed to ${cap.toLocaleString()}. Review and edit, then click Mark.`;
        } else {
          textarea.value = data.text;
          dropStatus.textContent = `OCR extracted ${data.text.length} chars. Review and edit, then click Mark.`;
        }
        // Pull focus to textarea so user can correct OCR mistakes immediately
        textarea.focus();
      } catch (e) {
        dropStatus.textContent = 'Network error during OCR. Type the writing in the box below instead.';
      }
    },
    clearImageHandler: () => {
      // No hidden image fields anymore — OCR runs on drop, textarea holds the text
    }
  });
})();

$('form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const btn = $('go');
  const result = $('result');
  const targetEl = $('target');
  const sampleEl = $('sample');
  // Clear any previous aria-invalid state.
  targetEl.removeAttribute('aria-invalid');
  sampleEl.removeAttribute('aria-invalid');

  const lang = resolveTargetLang();
  if (!lang) {
    targetEl.setAttribute('aria-invalid', 'true');
    result.hidden = false;
    result.innerHTML = '<p>Pick a target language.</p>';
    targetEl.focus();
    return;
  }
  const sampleVal = sampleEl.value.trim();
  if (!sampleVal) {
    sampleEl.setAttribute('aria-invalid', 'true');
    result.hidden = false;
    result.innerHTML = '<p>Paste writing or attach a file/photo first (the photo will be auto-extracted to text).</p>';
    sampleEl.focus();
    return;
  }
  btn.disabled = true;
  result.hidden = false;
  result.innerHTML = '<div class="slate-loading"><p class="mono-caption"><span class="dot"></span>CHALKING UP THE FEEDBACK</p><div class="chalk-dots" aria-hidden="true"><span class="chalk-dot"></span><span class="chalk-dot"></span><span class="chalk-dot"></span></div><p class="slate-loading-sub">Roughly 15&ndash;45 seconds. Vision OCR adds a few seconds for photo uploads.</p></div>';

  try {
    const r = await fetch('/api/marking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_language: lang,
        level: (__mkAdjustHandle && __mkAdjustHandle.readOverrides().level) || $('level').value,
        rubric: $('rubric').value,
        feedback_language: ($('feedback_lang') && $('feedback_lang').value) || 'english',
        sample: $('sample').value
      })
    });
    if (!r.ok) {
      const errBody = await r.json().catch(() => ({}));
      const msg = errBody.error || 'Could not mark. Try again.';
      // Render with line breaks preserved (the new content_blocked message
      // has bullet points across multiple lines).
      result.innerHTML = '<div class="error-block"><p>' + escapeHtml(msg).replace(/\n/g, '<br>') + '</p></div>';
      // If the upstream content classifier blocked the image, give the
      // user an immediate path forward: clear the image and put focus on
      // the textarea so they can type instead.
      if (errBody.content_blocked) {
        // Tell file-extract.js to clear its preview state too
        const dropZone = $('drop-zone');
        if (dropZone) {
          dropZone.classList.remove('has-file');
          const previewEl = dropZone.querySelector('.drop-preview');
          if (previewEl) previewEl.hidden = true;
        }
        if (sampleEl) {
          sampleEl.focus();
          sampleEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      return;
    }
    const data = await r.json();
    // Apply RTL rendering when the target language is RTL — Arabic/Urdu/
    // Hebrew/Persian/Pashto. The quoted student writing inside the feedback
    // cards needs right-to-left direction; English explanatory text inside
    // these blocks stays naturally LTR via embedded BiDi handling.
    if (isRtlTarget(lang)) {
      result.classList.add('is-rtl-target');
      result.setAttribute('dir', 'rtl');
    } else {
      result.classList.remove('is-rtl-target');
      result.removeAttribute('dir');
    }
    result.innerHTML = renderMarkdown(data.markdown || '');
  } catch {
    result.innerHTML = '<p>Network error. Try again.</p>';
  } finally {
    btn.disabled = false;
  }
});

// --- Char counter wiring with min-awareness.
(function wireCharCounter() {
  const ta = document.getElementById('sample');
  const cc = document.getElementById('sample-cc');
  if (!ta || !cc) return;
  const max = parseInt(ta.getAttribute('maxlength') || '0', 10);
  const min = parseInt(ta.getAttribute('minlength') || '0', 10);
  if (!max) return;
  const update = () => {
    const n = ta.value.length;
    let label;
    if (min && n < min) {
      const togo = min - n;
      label = n + ' / ' + min + ' min — ' + togo + ' more to go';
    } else {
      label = n + ' / ' + max;
    }
    cc.textContent = label;
    cc.classList.toggle('is-below-min', !!(min && n > 0 && n < min));
    cc.classList.toggle('is-warning', n >= max * 0.85 && n < max);
    cc.classList.toggle('is-over', n >= max);
  };
  ta.addEventListener('input', update);
  update();
})();

// renderMarkdown / escapeHtml provided by /src/lib/markdown.js
