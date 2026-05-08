// Extracted from cefr.html during CSP-nonce refactor (2026-05-07).
// Loaded via <script src="/src/lib/page-cefr.js" defer> from cefr.html.
const SW = window.Slatework;
const $ = (id) => document.getElementById(id);
const escapeHtml = SW.escapeHtml;

// Phase C: mount tutor strip + save-prompt link (this tool CREATES students, no student strip).
(function mountTutor() {
  if (!SW.ProfileUI) return;
  SW.ProfileUI.mountTutorStrip({container: document.getElementById('profile-tutor-strip')});
  SW.ProfileUI.mountSavePrompt({
    container: document.getElementById('profile-save-link'),
    prefill: () => ({}),
    onClick: () => location.reload()
  });
})();

// Phase C: Save-this-level-to-profile widget. Called from both Can-Do and AI paths
// after a level is determined. Idempotent — safe to call multiple times.
function showSaveBlock(determinedLevel) {
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
        SW.Profile.updateStudent(s.id, {level_set_via: 'cefr_tool'});
        block.innerHTML = '';
        const ok = document.createElement('p');
        ok.className = 'small';
        ok.textContent = 'Saved as "' + s.nickname + '". You\'ll see this student on every AI tool.';
        block.appendChild(ok);
      }
    });
  });
  block.appendChild(btn);
}

// Build language dropdown from Slatework.targetLanguageList() — curated, deduped.
(function buildLangDropdown() {
  const sel = $('lang');
  const targets = SW.targetLanguageList();
  for (const t of targets) {
    const opt = document.createElement('option');
    opt.value = t.value;
    opt.textContent = t.label;
    sel.appendChild(opt);
  }
  sel.value = 'Spanish';
  sel.addEventListener('change', () => {
    const otherInput = $('lang_other');
    if (sel.value === 'Other') {
      otherInput.hidden = false;
      otherInput.required = true;
    } else {
      otherInput.hidden = true;
      otherInput.required = false;
    }
  });
})();

function resolveLangVal() {
  const sel = $('lang');
  if (sel.value === 'Other') return $('lang_other').value.trim();
  return sel.value;
}

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
      // Decoupled OCR: photo → /api/ocr (Google Vision) → textarea → submit text-only.
      // Anthropic never sees the image, avoiding their content-classifier rejection.
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
        const cap = textarea.maxLength && textarea.maxLength > 0 ? textarea.maxLength : 3000;
        if (data.text.length > cap) {
          textarea.value = data.text.slice(0, cap);
          dropStatus.textContent = `OCR extracted ${data.text.length.toLocaleString()} chars; trimmed to ${cap.toLocaleString()}. Review and edit, then click Assess.`;
        } else {
          textarea.value = data.text;
          dropStatus.textContent = `OCR extracted ${data.text.length} chars. Review and edit, then click Assess.`;
        }
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

// --- Tab switching
const rulesMode = $('rules-mode');
const aiMode = $('ai-mode');
const tabRules = $('tab-rules');
const tabAi = $('tab-ai');

const TABS = [
  { tab: tabRules, panel: rulesMode, secondaryWhenInactive: true },
  { tab: tabAi, panel: aiMode, secondaryWhenInactive: true }
];

function activateTab(idx, { focus = false } = {}) {
  TABS.forEach((t, i) => {
    const active = i === idx;
    t.panel.hidden = !active;
    t.tab.setAttribute('aria-selected', String(active));
    t.tab.setAttribute('tabindex', active ? '0' : '-1');
    if (active) t.tab.classList.remove('secondary');
    else t.tab.classList.add('secondary');
  });
  if (focus) TABS[idx].tab.focus();
}

TABS.forEach((t, i) => {
  t.tab.addEventListener('click', () => activateTab(i));
  t.tab.addEventListener('keydown', (e) => {
    let next = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % TABS.length;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + TABS.length) % TABS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = TABS.length - 1;
    if (next !== null) {
      e.preventDefault();
      activateTab(next, { focus: true });
    }
  });
});

// --- Rule-based mode
const statementsBox = $('statements');
const stmts = SW.cefrStatements();
for (const s of stmts) {
  const div = document.createElement('div');
  div.className = 'field';
  div.innerHTML = `
    <label>${escapeHtml(s.q)}</label>
    <div class="cefr-radio-group">
      <label><input type="radio" name="${s.id}" value="yes" /> Yes</label>
      <label><input type="radio" name="${s.id}" value="partial" /> Partial</label>
      <label><input type="radio" name="${s.id}" value="no" /> No</label>
    </div>
  `;
  statementsBox.appendChild(div);
}

$('rules-go').addEventListener('click', () => {
  const answers = {};
  for (const s of stmts) {
    const sel = document.querySelector(`input[name="${s.id}"]:checked`);
    if (sel) answers[s.id] = sel.value;
  }
  const out = SW.cefrPlace(answers);
  const r = $('rules-result');
  if (out.insufficient) {
    r.innerHTML = `<p class="small m-0">${escapeHtml(out.notes)}</p>`;
    r.hidden = false;
    return;
  }
  r.innerHTML = `
    <div class="row"><span>Placement</span><strong>${out.level}</strong></div>
    <div class="row"><span>Confidence</span><strong>${out.confidence}</strong></div>
    <p class="small mt-06">${escapeHtml(out.notes)}</p>
  `;
  r.hidden = false;
  window.__cefrLastLevel = out.level;
  showSaveBlock(out.level);
});

// --- AI mode
$('ai-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const result = $('ai-result');
  const btn = $('ai-go');
  const langEl = $('lang');
  const sampleEl = $('sample');
  langEl.removeAttribute('aria-invalid');
  sampleEl.removeAttribute('aria-invalid');
  const lang = resolveLangVal();
  if (!lang) {
    langEl.setAttribute('aria-invalid', 'true');
    result.hidden = false;
    result.innerHTML = '<p>Pick a target language.</p>';
    langEl.focus();
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
  result.innerHTML = '<div class="slate-loading"><p class="mono-caption"><span class="dot"></span>PLACING THE STUDENT</p><div class="chalk-dots" aria-hidden="true"><span class="chalk-dot"></span><span class="chalk-dot"></span><span class="chalk-dot"></span></div><p class="slate-loading-sub">Roughly 10&ndash;25 seconds. Reading the sample, mapping the level.</p></div>';
  try {
    const r = await fetch('/api/cefr-assess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_language: lang,
        sample: sampleEl.value
      })
    });
    if (!r.ok) {
      const errBody = await r.json().catch(() => ({}));
      const msg = errBody.error || 'Could not assess. Try again in a moment.';
      result.innerHTML = '<div class="error-block"><p>' + escapeHtml(msg).replace(/\n/g, '<br>') + '</p></div>';
      return;
    }
    const data = await r.json();
    result.innerHTML =
      '<div class="row"><span>Placement</span><strong>' + escapeHtml(data.level || '—') + '</strong></div>' +
      '<div class="row"><span>Confidence</span><strong>' + escapeHtml(data.confidence || '—') + '</strong></div>' +
      '<h3 class="mt-06">Reasoning</h3>' +
      '<p>' + escapeHtml(data.reasoning || '').replace(/\n/g, '<br>') + '</p>';
    if (data.level) {
      window.__cefrLastLevel = data.level;
      showSaveBlock(data.level);
    }
  } catch {
    result.innerHTML = '<p>Network error. Try again in a moment.</p>';
  } finally {
    btn.disabled = false;
  }
});
