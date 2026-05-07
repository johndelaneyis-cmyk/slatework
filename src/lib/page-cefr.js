// Extracted from cefr.html during CSP-nonce refactor (2026-05-07).
// Loaded via <script src="/src/lib/page-cefr.js" defer> from cefr.html.
const SW = window.Slatework;
const $ = (id) => document.getElementById(id);

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
      otherInput.style.display = '';
      otherInput.required = true;
    } else {
      otherInput.style.display = 'none';
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
      $('image-data').value = base64;
      $('image-mime').value = mime;
      dropStatus.textContent = 'Image attached. Click Assess when ready.';
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
    <div style="display:flex; gap:1rem;">
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
    r.innerHTML = `<p class="small" style="margin:0;">${escapeHtml(out.notes)}</p>`;
    r.style.display = 'block';
    return;
  }
  r.innerHTML = `
    <div class="row"><span>Placement</span><strong>${out.level}</strong></div>
    <div class="row"><span>Confidence</span><strong>${out.confidence}</strong></div>
    <p class="small" style="margin-top:0.6rem;">${escapeHtml(out.notes)}</p>
  `;
  r.style.display = 'block';
});

// --- AI mode (wired in Phase 2 — endpoint exists in Phase 2)
$('ai-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const result = $('ai-result');
  const btn = $('ai-go');
  const lang = resolveLangVal();
  if (!lang) { result.style.display = 'block'; result.innerHTML = '<p>Pick a target language.</p>'; return; }
  const sampleVal = $('sample').value.trim();
  const imageData = $('image-data').value;
  const imageMime = $('image-mime').value;
  if (!sampleVal && !imageData) { result.style.display = 'block'; result.innerHTML = '<p>Paste writing or attach a file/photo first.</p>'; return; }
  btn.disabled = true;
  result.style.display = 'block';
  result.innerHTML = '<div class="slate-loading"><p class="mono-caption"><span class="dot"></span>PLACING THE STUDENT</p><div class="chalk-dots" aria-hidden="true"><span class="chalk-dot"></span><span class="chalk-dot"></span><span class="chalk-dot"></span></div><p class="slate-loading-sub">Roughly 10–25 seconds. Reading the sample, mapping the level.</p></div>';
  try {
    const r = await fetch('/api/cefr-assess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_language: lang,
        sample: $('sample').value,
        image_data: imageData,
        image_mime: imageMime
      })
    });
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      result.innerHTML = '<p>' + escapeHtml(e.error || 'Could not assess. Try again in a moment.') + '</p>';
      return;
    }
    const data = await r.json();
    const extractedHtml = data.extracted_text
      ? '<div class="extracted-text"><h3>Extracted text</h3><p class="small">Review this for accuracy — vision can misread cursive, children\'s writing, or faded photocopies.</p><blockquote>' + escapeHtml(data.extracted_text) + '</blockquote></div>'
      : '';
    result.innerHTML = extractedHtml + `
      <div class="row"><span>Placement</span><strong>${escapeHtml(data.level || '—')}</strong></div>
      <div class="row"><span>Confidence</span><strong>${escapeHtml(data.confidence || '—')}</strong></div>
      <h3 style="margin-top:0.6rem;">Reasoning</h3>
      <p>${escapeHtml(data.reasoning || '').replace(/\n/g, '<br>')}</p>
    `;
    $('image-data').value = '';
    $('image-mime').value = '';
  } catch {
    result.innerHTML = '<p>Network error. Try again in a moment.</p>';
  } finally {
    btn.disabled = false;
  }
});

function escapeHtml(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
