// src/lib/slideshow-export.js
// Slatework.SlideshowExport.exportPptx({ response, audience, mode?,
//                                       tutorName?, attributionText? })
//
// Lazy-loads PptxGenJS via <script> tag with SRI hash, then converts the
// slide JSON into a .pptx and triggers a download.
//
// Version-pinning convention (mirrors mammoth.js@1.7.2 in
// src/lib/file-extract.js:14-19, commit 3c8ffc0):
// Update both the URL and the `integrity` attribute together when bumping.
//
//   PptxGenJS: 4.0.1
//   Source:    https://unpkg.com/pptxgenjs@4.0.1/dist/pptxgen.bundle.js
//   SRI:       sha384-qb0Xhi7LLYpvW1HCK6oMrmDLSY9sy7vwm6ZlV6KjtrlL9yg30+YN4neTwnmX+Kp8
//
// unpkg.com is already on the script-src allow-list (see _headers).
// The bundle.js variant inlines JSZip — once loaded, `window.PptxGenJS`
// and `window.JSZip` are both available.

(() => {
  'use strict';

  const SW = (window.Slatework = window.Slatework || {});
  const Export = (SW.SlideshowExport = SW.SlideshowExport || {});

  const PPTX_VERSION = '4.0.1';
  const PPTX_URL = 'https://unpkg.com/pptxgenjs@' + PPTX_VERSION + '/dist/pptxgen.bundle.js';
  const PPTX_SRI = 'sha384-qb0Xhi7LLYpvW1HCK6oMrmDLSY9sy7vwm6ZlV6KjtrlL9yg30+YN4neTwnmX+Kp8';

  let pptxPromise;
  function loadPptx() {
    if (!pptxPromise) {
      pptxPromise = new Promise((resolve, reject) => {
        if (window.PptxGenJS) return resolve(window.PptxGenJS);
        const s = document.createElement('script');
        s.src = PPTX_URL;
        s.integrity = PPTX_SRI;
        s.crossOrigin = 'anonymous';
        s.referrerPolicy = 'no-referrer';
        s.onload = () => {
          if (window.PptxGenJS) resolve(window.PptxGenJS);
          else reject(new Error('PptxGenJS loaded but window.PptxGenJS missing.'));
        };
        s.onerror = () => reject(new Error('Could not load PptxGenJS — check CDN/SRI.'));
        document.head.appendChild(s);
      });
    }
    return pptxPromise;
  }

  // Convert "Bullet line\n• item\n• item" into PptxGenJS bullet text array.
  function bodyToPptxText(body, scale) {
    scale = scale || 1.0;
    const lines = String(body || '').split('\n').filter((l) => l.trim());
    const out = [];
    for (const line of lines) {
      const m = line.match(/^\s*[•\-\*]\s+(.+)$/);
      if (m) {
        out.push({ text: m[1], options: { bullet: true, fontSize: Math.round(18 * scale) } });
      } else {
        out.push({ text: line, options: { fontSize: Math.round(20 * scale), breakLine: true } });
      }
    }
    return out.length ? out : [{ text: '', options: { fontSize: Math.round(18 * scale) } }];
  }

  // Slide layout numbers tuned for 10×5.625 in widescreen (LAYOUT_WIDE).
  function addSlide(pres, slide, audience, opts) {
    const scale = (opts && opts.mode === 'classroom') ? 1.2 : 1.0;
    const s = pres.addSlide();
    s.background = { color: 'FFFFFF' };
    // Header strip
    s.addShape('rect', { x: 0, y: 0, w: '100%', h: 0.55, fill: { color: '0F172A' } });
    s.addText(slide.title || '', {
      x: 0.4, y: 0.05, w: 9.0, h: 0.45,
      fontSize: Math.round(22 * scale),
      fontFace: 'Calibri', color: 'F8FAFC', bold: true
    });
    if (slide.duration_min) {
      s.addText(slide.duration_min + ' min', {
        x: 8.4, y: 0.1, w: 1.4, h: 0.35,
        fontSize: Math.round(14 * scale),
        fontFace: 'Calibri', color: 'FDE68A', align: 'right'
      });
    }
    // Subtitle
    if (slide.subtitle) {
      s.addText(slide.subtitle, {
        x: 0.4, y: 0.7, w: 9.0, h: 0.4,
        fontSize: Math.round(16 * scale),
        fontFace: 'Calibri', color: '475569'
      });
    }
    // Body — 60% width when an image is present, 100% otherwise.
    const hasImage = !!slide._imageDataUrl;
    const bodyW = hasImage ? 5.6 : 9.2;
    s.addText(bodyToPptxText(slide.body, scale), {
      x: 0.4, y: 1.2, w: bodyW, h: 3.8,
      fontFace: 'Calibri', color: '020617', valign: 'top'
    });
    if (hasImage) {
      s.addImage({
        data: slide._imageDataUrl,
        x: 6.2, y: 1.2, w: 3.4, h: 3.4
      });
    }
    // Tutor name + Slatework footer
    const footerParts = [];
    if (opts && opts.tutorName) footerParts.push('Prepared by ' + opts.tutorName);
    footerParts.push('Made with Slatework');
    s.addText(footerParts.join(' · '), {
      x: 0.4, y: 5.1, w: 9.2, h: 0.3,
      fontSize: 10, fontFace: 'Calibri', color: '94A3B8', align: 'left'
    });
    // Notes — attribution + slide id for tutor reference
    s.addNotes('Slide id: ' + (slide.id || '') +
               '\nAudience: ' + (audience || '') +
               '\n' + ((opts && opts.attributionText) || ''));
  }

  // Fetch a same-origin or HTTPS image and return a data: URL. PptxGenJS
  // accepts data: URLs directly. Failures are silent — we ship the slide
  // text-only.
  async function imgUrlToDataUrl(url) {
    try {
      const r = await fetch(url, { credentials: 'omit' });
      if (!r.ok) return null;
      const blob = await r.blob();
      return await new Promise((resolve) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.onerror = () => resolve(null);
        fr.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  Export.exportPptx = async function exportPptx({ response, audience, mode, tutorName, attributionText, _testReturnBlob }) {
    const PptxGenJS = await loadPptx();
    if (!PptxGenJS) throw new Error('PptxGenJS not available.');
    const pres = new PptxGenJS();
    pres.title = (response.slides[0] && response.slides[0].title) || 'Slatework lesson';
    pres.author = tutorName || 'Tutor';
    pres.layout = 'LAYOUT_WIDE';

    const meta = response.metadata || {};
    const overrides = (response.alt_audiences && response.alt_audiences[audience] && response.alt_audiences[audience].tone_overrides) || {};
    const density = (audience === meta.inferred_audience)
      ? meta.inferred_image_density
      : (response.alt_audiences && response.alt_audiences[audience] && response.alt_audiences[audience].image_density);

    for (const baseSlide of response.slides) {
      const slide = Object.assign({}, baseSlide, overrides[baseSlide.id] || {});
      // Decide whether to attach an image based on density.
      const want = (density === 'high') ? 1
                 : (density === 'medium') ? 1
                 : (density === 'low') ? (slide.image_keywords && slide.image_keywords.length ? 1 : 0)
                 : (slide.id === 'warmup' && slide.image_keywords && slide.image_keywords.length ? 1 : 0);
      if (want && SW.SlideshowImages) {
        try {
          const url = await SW.SlideshowImages.resolve({ keyword: slide.image_keywords[0], audience });
          if (url && url.href) {
            slide._imageDataUrl = await imgUrlToDataUrl(url.href);
          }
        } catch {
          /* silent */
        }
      }
      addSlide(pres, slide, audience, { tutorName, attributionText, mode });
    }

    const fileName = 'slatework-lesson-' + audience + '-' + new Date().toISOString().slice(0, 10) + '.pptx';

    if (_testReturnBlob) {
      return pres.write({ outputType: 'blob' });
    }
    return pres.writeFile({ fileName });
  };
})();
