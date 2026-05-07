// Extracted from marking.html during CSP-nonce refactor (2026-05-07).
// Loaded via <script src="/src/lib/page-marking.js" defer> from marking.html.
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
      dropStatus.textContent = 'Image attached. Click Mark when ready.';
    }
  });
})();

$('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('go');
  const result = $('result');
  const lang = resolveTargetLang();
  if (!lang) { result.style.display = 'block'; result.innerHTML = '<p>Pick a target language.</p>'; return; }
  const sampleVal = $('sample').value.trim();
  const imageData = $('image-data').value;
  const imageMime = $('image-mime').value;
  if (!sampleVal && !imageData) { result.style.display = 'block'; result.innerHTML = '<p>Paste writing or attach a file/photo first.</p>'; return; }
  btn.disabled = true;
  result.style.display = 'block';
  result.innerHTML = '<div class="slate-loading"><p class="mono-caption"><span class="dot"></span>CHALKING UP THE FEEDBACK</p><div class="chalk-dots" aria-hidden="true"><span class="chalk-dot"></span><span class="chalk-dot"></span><span class="chalk-dot"></span></div><p class="slate-loading-sub">Roughly 15–45 seconds. Vision OCR adds a few seconds for photo uploads.</p></div>';

  try {
    const r = await fetch('/api/marking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_language: lang,
        level: $('level').value,
        rubric: $('rubric').value,
        sample: $('sample').value,
        image_data: imageData,
        image_mime: imageMime
      })
    });
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      result.innerHTML = '<p>' + escapeHtml(e.error || 'Could not mark. Try again.') + '</p>';
      return;
    }
    const data = await r.json();
    result.innerHTML = renderMarkdown(data.markdown || '');
    // Clear the hidden image fields after a successful submit so a re-run uses fresh state
    $('image-data').value = '';
    $('image-mime').value = '';
  } catch {
    result.innerHTML = '<p>Network error. Try again.</p>';
  } finally {
    btn.disabled = false;
  }
});

function renderMarkdown(md) {
  const lines = md.split('\n');
  let html = '';
  let listType = null; // 'ul' | 'ol' | null
  const closeList = () => { if (listType) { html += `</${listType}>`; listType = null; } };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { closeList(); html += '\n'; continue; }
    if (line.startsWith('###### ')) { closeList(); html += '<h6>' + inlineMd(line.slice(7)) + '</h6>'; }
    else if (line.startsWith('##### ')) { closeList(); html += '<h5>' + inlineMd(line.slice(6)) + '</h5>'; }
    else if (line.startsWith('#### ')) { closeList(); html += '<h4>' + inlineMd(line.slice(5)) + '</h4>'; }
    else if (line.startsWith('### ')) { closeList(); html += '<h3>' + inlineMd(line.slice(4)) + '</h3>'; }
    else if (line.startsWith('## ')) { closeList(); html += '<h2>' + inlineMd(line.slice(3)) + '</h2>'; }
    else if (line.startsWith('- ')) {
      if (listType !== 'ul') { closeList(); html += '<ul>'; listType = 'ul'; }
      html += '<li>' + inlineMd(line.slice(2)) + '</li>';
    }
    else if (/^\d+\.\s/.test(line)) {
      if (listType !== 'ol') { closeList(); html += '<ol>'; listType = 'ol'; }
      html += '<li>' + inlineMd(line.replace(/^\d+\.\s/, '')) + '</li>';
    }
    else { closeList(); html += '<p>' + inlineMd(line) + '</p>'; }
  }
  closeList();
  return html;
}

function inlineMd(s) {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

function escapeHtml(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
