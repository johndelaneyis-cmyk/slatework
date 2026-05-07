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
        level: $('level').value,
        rubric: $('rubric').value,
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
    result.innerHTML = renderMarkdown(data.markdown || '');
  } catch {
    result.innerHTML = '<p>Network error. Try again.</p>';
  } finally {
    btn.disabled = false;
  }
});

// renderMarkdown / escapeHtml provided by /src/lib/markdown.js
