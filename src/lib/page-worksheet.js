// Extracted from worksheet.html during CSP-nonce refactor (2026-05-07).
// Loaded via <script src="/src/lib/page-worksheet.js" defer> from worksheet.html.
const $ = (id) => document.getElementById(id);
const SW = window.Slatework;

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
      otherInput.style.display = '';
      otherInput.required = true;
    } else {
      otherInput.style.display = 'none';
      otherInput.required = false;
    }
  });
})();

function resolveTargetLang() {
  const sel = $('target');
  if (sel.value === 'Other') return $('target_other').value.trim();
  return sel.value;
}

$('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('go');
  btn.disabled = true;
  $('result').style.display = 'block';
  $('worksheet').innerHTML = '<div class="slate-loading"><p class="mono-caption"><span class="dot"></span>DRAFTING THE WORKSHEET</p><div class="chalk-dots" aria-hidden="true"><span class="chalk-dot"></span><span class="chalk-dot"></span><span class="chalk-dot"></span></div><p class="slate-loading-sub">Roughly 15–40 seconds. Worksheet first, answer key after.</p></div>';
  $('answer-key').style.display = 'none';
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
      const e = await r.json().catch(() => ({}));
      $('worksheet').innerHTML = '<p>' + escapeHtml(e.error || 'Could not generate.') + '</p>';
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

$('print-ws').addEventListener('click', () => {
  $('answer-key').style.display = 'none';
  $('worksheet').style.display = '';
  window.print();
});
$('print-ak').addEventListener('click', () => {
  $('worksheet').style.display = 'none';
  $('answer-key').style.display = '';
  window.print();
  setTimeout(() => { $('worksheet').style.display = ''; }, 500);
});

function renderMarkdown(md) {
  const lines = md.split('\n');
  let html = '';
  let inList = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (inList) { html += '</ol>'; inList = false; }
      html += '\n';
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      if (!inList) { html += '<ol>'; inList = true; }
      html += '<li>' + escapeHtml(line.replace(/^\d+\.\s/, '')) + '</li>';
    } else if (line.startsWith('## ')) { if (inList) { html += '</ol>'; inList = false; } html += '<h2>' + escapeHtml(line.slice(3)) + '</h2>'; }
    else if (line.startsWith('### ')) { if (inList) { html += '</ol>'; inList = false; } html += '<h3>' + escapeHtml(line.slice(4)) + '</h3>'; }
    else if (line.startsWith('**') && line.endsWith('**')) { if (inList) { html += '</ol>'; inList = false; } html += '<p><strong>' + escapeHtml(line.slice(2, -2)) + '</strong></p>'; }
    else { if (inList) { html += '</ol>'; inList = false; } html += '<p>' + escapeHtml(line) + '</p>'; }
  }
  if (inList) html += '</ol>';
  return html;
}

function escapeHtml(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
