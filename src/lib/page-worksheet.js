// Extracted from worksheet.html during CSP-nonce refactor (2026-05-07).
// Loaded via <script src="/src/lib/page-worksheet.js" defer> from worksheet.html.
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
  sel.value = 'Spanish';
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

$('form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const btn = $('go');
  const topicEl = $('topic');
  topicEl.removeAttribute('aria-invalid');
  btn.disabled = true;
  $('result').hidden = false;
  $('worksheet').innerHTML = '<div class="slate-loading"><p class="mono-caption"><span class="dot"></span>DRAFTING THE WORKSHEET</p><div class="chalk-dots" aria-hidden="true"><span class="chalk-dot"></span><span class="chalk-dot"></span><span class="chalk-dot"></span></div><p class="slate-loading-sub">Roughly 15&ndash;40 seconds. Worksheet first, answer key after.</p></div>';
  $('answer-key').hidden = true;
  try {
    const r = await fetch('/api/worksheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_language: resolveTargetLang(),
        level: $('level').value,
        topic: $('topic').value,
        exam: $('exam').value,
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

// Print handlers — use afterprint to reliably restore visibility instead of
// a fixed-delay setTimeout (audit Section E #17).
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
