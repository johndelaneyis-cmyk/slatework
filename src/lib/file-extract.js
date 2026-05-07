// Self-installing file-drop module. Wires drag/drop, click-to-pick, and
// client-side text extraction for .txt/.md/.docx/.pdf. Images are forwarded
// to the optional imageHandler — never extracted in the browser.
//
// Exposes window.Slatework.attachFileDrop(options).

(() => {
  let mammothPromise, pdfjsPromise;

  function loadMammoth() {
    if (!mammothPromise) {
      mammothPromise = new Promise((resolve, reject) => {
        if (window.mammoth) return resolve(window.mammoth);
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.7.2/mammoth.browser.min.js';
        s.onload = () => resolve(window.mammoth);
        s.onerror = () => reject(new Error('Could not load .docx parser'));
        document.head.appendChild(s);
      });
    }
    return mammothPromise;
  }

  function loadPdfJs() {
    if (!pdfjsPromise) {
      pdfjsPromise = import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs').then(m => {
        m.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs';
        return m;
      });
    }
    return pdfjsPromise;
  }

  const IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif']);
  const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'gif']);

  function getExt(name) {
    const i = name.lastIndexOf('.');
    return i < 0 ? '' : name.slice(i + 1).toLowerCase();
  }

  async function readAsText(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ''));
      r.onerror = () => reject(new Error('Could not read file'));
      r.readAsText(file);
    });
  }

  async function readAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(new Error('Could not read file'));
      r.readAsArrayBuffer(file);
    });
  }

  async function readAsBase64(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => {
        const result = String(r.result || '');
        const idx = result.indexOf(',');
        resolve(idx >= 0 ? result.slice(idx + 1) : result);
      };
      r.onerror = () => reject(new Error('Could not read file'));
      r.readAsDataURL(file);
    });
  }

  async function extractDocx(file) {
    const m = await loadMammoth();
    const ab = await readAsArrayBuffer(file);
    const result = await m.extractRawText({ arrayBuffer: ab });
    return result.value || '';
  }

  async function extractPdf(file) {
    const pdfjs = await loadPdfJs();
    const ab = await readAsArrayBuffer(file);
    const doc = await pdfjs.getDocument({ data: ab }).promise;
    const out = [];
    try {
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        try {
          const content = await page.getTextContent();
          const pageText = content.items.map(it => (it.str || '')).join(' ');
          out.push(pageText);
        } finally {
          page.cleanup();
        }
      }
      return out.join('\n\n');
    } finally {
      try { await doc.destroy(); } catch {}
    }
  }

  function attachFileDrop(options) {
    const opts = options || {};
    const dropZone = opts.dropZone;
    const textarea = opts.textarea;
    const imageHandler = opts.imageHandler;
    const onStatus = typeof opts.onStatus === 'function' ? opts.onStatus : () => {};
    const maxBytes = opts.maxBytes || 10 * 1024 * 1024;
    if (!dropZone || !textarea) return;

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.txt,.md,.docx,.pdf,image/*';
    fileInput.style.display = 'none';
    dropZone.appendChild(fileInput);

    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fileInput.click();
      }
    });
    fileInput.addEventListener('change', () => {
      const f = fileInput.files && fileInput.files[0];
      if (f) handleFile(f);
      fileInput.value = '';
    });

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('drag-over');
    });
    dropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('drag-over');
    });
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('drag-over');
      const dt = e.dataTransfer;
      if (!dt || !dt.files || !dt.files.length) return;
      if (dt.files.length > 1) {
        onStatus(`Multi-file drops aren't supported — using "${dt.files[0].name}", ignoring ${dt.files.length - 1} other file${dt.files.length - 1 === 1 ? '' : 's'}.`);
      }
      handleFile(dt.files[0]);
    });

    function applyTextToTextarea(text, fileName) {
      // Respect textarea.maxLength (set by each tool to match its API cap).
      // Fallback to 8000 chars if no maxlength on the element.
      const cap = (textarea.maxLength && textarea.maxLength > 0) ? textarea.maxLength : 8000;
      if (text.length > cap) {
        textarea.value = text.slice(0, cap);
        onStatus(`Loaded ${fileName} — extracted text was ${text.length.toLocaleString()} characters; trimmed to the ${cap.toLocaleString()}-char limit. Edit if needed.`);
      } else {
        textarea.value = text;
        onStatus('Loaded ' + fileName);
      }
    }

    async function handleFile(file) {
      if (file.size > maxBytes) {
        onStatus('File too big — max 10 MB');
        return;
      }
      const ext = getExt(file.name);
      const isImageMime = file.type && file.type.indexOf('image/') === 0;
      const isImage = isImageMime || IMAGE_EXTS.has(ext);
      try {
        if (isImage) {
          if (typeof imageHandler !== 'function') {
            onStatus('Image upload not supported here.');
            return;
          }
          onStatus('Reading image…');
          const mime = (file.type && IMAGE_MIMES.has(file.type)) ? file.type : (
            ext === 'png' ? 'image/png' :
            ext === 'webp' ? 'image/webp' :
            ext === 'heic' ? 'image/heic' :
            ext === 'heif' ? 'image/heif' :
            ext === 'gif' ? 'image/gif' :
            'image/jpeg'
          );
          const b64 = await readAsBase64(file);
          await imageHandler(b64, mime);
          return;
        }
        if (ext === 'txt' || ext === 'md' || file.type === 'text/plain' || file.type === 'text/markdown') {
          onStatus('Reading text…');
          const text = await readAsText(file);
          applyTextToTextarea(text, file.name);
          return;
        }
        if (ext === 'docx' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          onStatus('Extracting from .docx…');
          const text = await extractDocx(file);
          applyTextToTextarea(text, file.name);
          return;
        }
        if (ext === 'pdf' || file.type === 'application/pdf') {
          onStatus('Extracting from PDF…');
          const text = await extractPdf(file);
          applyTextToTextarea(text, file.name);
          return;
        }
        onStatus('Unsupported file type. Use .txt, .md, .docx, .pdf, or an image.');
      } catch (err) {
        onStatus('Could not read file. ' + (err && err.message ? err.message : ''));
      }
    }
  }

  window.Slatework = window.Slatework || {};
  window.Slatework.attachFileDrop = attachFileDrop;
})();
