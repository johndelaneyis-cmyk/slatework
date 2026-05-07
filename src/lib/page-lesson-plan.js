// Extracted from lesson-plan.html during CSP-nonce refactor (2026-05-07).
// Loaded via <script src="/src/lib/page-lesson-plan.js" defer> from lesson-plan.html.
const $ = (id) => document.getElementById(id);
const SW = window.Slatework;
const renderMarkdown = SW.renderMarkdown;
const escapeHtml = SW.escapeHtml;

// Build target dropdown from Slatework.targetLanguageList() — curated, deduped.
// Build source dropdown from a hard-coded short list of likely instruction languages.
(function buildLangDropdowns() {
  const targetSel = $('target');
  const sourceSel = $('source');

  // --- Target (what the student is learning)
  const targets = SW.targetLanguageList();
  for (const t of targets) {
    const opt = document.createElement('option');
    opt.value = t.value;
    opt.textContent = t.label;
    targetSel.appendChild(opt);
  }
  // Default to Spanish (most common case).
  targetSel.value = 'Spanish';

  // --- Source (what the student already speaks; defaults to English)
  const sources = [
    'English',
    'Spanish',
    'French',
    'German',
    'Italian',
    'Portuguese',
    'Mandarin',
    'Cantonese',
    'Japanese',
    'Korean',
    'Arabic',
    'Russian',
    'Irish'
  ];
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

  // --- Wire the "Other" reveal for both
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

$('form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const btn = $('go');
  const result = $('result');
  // Clear any previous aria-invalid state.
  ['target_other', 'source_other', 'goal'].forEach((id) => {
    const el = $(id); if (el) el.removeAttribute('aria-invalid');
  });
  btn.disabled = true;
  result.hidden = false;
  result.innerHTML = '<div class="slate-loading"><p class="mono-caption"><span class="dot"></span>COMPOSING ON THE SLATE</p><div class="chalk-dots" aria-hidden="true"><span class="chalk-dot"></span><span class="chalk-dot"></span><span class="chalk-dot"></span></div><p class="slate-loading-sub">Roughly 10&ndash;40 seconds. Don\'t refresh &mdash; the model is writing, not stuck.</p></div>';

  try {
    const r = await fetch('/api/lesson-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_language: resolveLang('target', 'target_other'),
        source_language: resolveLang('source', 'source_other'),
        level: $('level').value,
        mode: $('mode').value,
        goal: $('goal').value,
        exam: $('exam').value
      })
    });
    if (!r.ok) {
      const errBody = await r.json().catch(() => ({}));
      const goalEl = $('goal');
      if (goalEl && r.status === 400) goalEl.setAttribute('aria-invalid', 'true');
      result.innerHTML = '<p>' + escapeHtml(errBody.error || 'Could not generate plan. Try again.') + '</p>';
      return;
    }
    const data = await r.json();
    result.innerHTML = '<div id="md">' + renderMarkdown(data.markdown || '') + '</div><p class="small mt-1">Tip: select all and paste into your notes; the formatting comes through.</p>';
  } catch {
    result.innerHTML = '<p>Network error. Try again in a moment.</p>';
  } finally {
    btn.disabled = false;
  }
});
