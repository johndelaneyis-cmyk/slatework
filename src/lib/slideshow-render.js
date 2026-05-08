// Self-installing slideshow render module. Loads via <script> tag from
// lesson-plan.html (added in Task 8). Exposes:
//   Slatework.Slideshow.render(container, response, opts)
//   Slatework.Slideshow.generate(payload)  (calls /api/slideshow)
//   Slatework.Slideshow.generateAndRender(input)  (used by the
//     #ext-slideshow click handler — does generate + render in one call)
//
// `opts` accepted: { tutorName?, mode?, attributionText?, onAudienceChange? }
//
// Audience switching uses the cached `alt_audiences` overrides from the
// response — no second API call. Classroom mode is recognised via opts.mode
// or response.metadata.mode and applies a CSS hook for font scaling.
//
// Image source delegated to slideshow-images.js (Task 6).

(() => {
  const SW = (window.Slatework = window.Slatework || {});
  const Slideshow = (SW.Slideshow = SW.Slideshow || {});

  const AUDIENCE_LABELS = {
    young_learner: 'Young learner',
    teen: 'Teen',
    adult: 'Adult',
    exam_prep: 'Exam prep'
  };

  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function bodyToHtml(body) {
    // Simple newline → <br/> + bullet detection. Markdown is intentionally
    // not full-fat here — slide bodies are short and the model emits plain
    // strings.
    const lines = String(body || '').split('\n');
    const parts = [];
    let inList = false;
    for (const line of lines) {
      const m = line.match(/^\s*[•\-\*]\s+(.+)$/);
      if (m) {
        if (!inList) { parts.push('<ul>'); inList = true; }
        parts.push('<li>' + escHtml(m[1]) + '</li>');
      } else {
        if (inList) { parts.push('</ul>'); inList = false; }
        if (line.trim()) parts.push('<p>' + escHtml(line) + '</p>');
      }
    }
    if (inList) parts.push('</ul>');
    return parts.join('');
  }

  function applyOverride(slide, override) {
    if (!override) return slide;
    return Object.assign({}, slide, override);
  }

  // Decide how many image keywords to actually render based on density.
  function keywordsForDensity(slide, density) {
    if (!Array.isArray(slide.image_keywords)) return [];
    const all = slide.image_keywords;
    switch (density) {
      case 'high':    return all.slice(0, 3);
      case 'medium':  return all.slice(0, 2);
      case 'low':     return all.slice(0, 1);
      case 'minimal': return slide.id === 'warmup' ? all.slice(0, 1) : [];
      default:        return all.slice(0, 1);
    }
  }

  async function renderSlideMedia(slideEl, slide, audience, density) {
    const kw = keywordsForDensity(slide, density);
    if (!kw.length || !SW.SlideshowImages) return;
    const media = slideEl.querySelector('.slideshow-slide-media');
    media.innerHTML = '';
    for (const k of kw) {
      try {
        const url = await SW.SlideshowImages.resolve({ keyword: k, audience });
        if (!url) continue;
        const img = document.createElement('img');
        img.src = url.href;
        img.alt = url.alt || k;
        img.loading = 'lazy';
        img.decoding = 'async';
        if (url.attribution) img.dataset.attribution = url.attribution;
        media.appendChild(img);
      } catch (e) {
        // Silent: a missing image must never break the deck.
        console.warn('[slideshow] image resolve failed', k, e);
      }
    }
  }

  function buildShellHtml(audience, audiences, attributionText) {
    const opts = audiences.map(a =>
      `<option value="${a}"${a === audience ? ' selected' : ''}>${AUDIENCE_LABELS[a]}</option>`
    ).join('');
    return `
      <div class="slideshow" tabindex="0" role="region" aria-roledescription="slideshow" aria-label="Lesson slideshow preview">
        <header class="slideshow-controls">
          <label class="slideshow-audience">
            <span>Audience</span>
            <select aria-label="Audience profile">${opts}</select>
          </label>
          <span class="slideshow-counter" aria-live="polite">1 / 8</span>
          <div class="slideshow-actions">
            <button type="button" class="slideshow-prev btn btn-link" aria-label="Previous slide">&larr;</button>
            <button type="button" class="slideshow-next btn btn-link" aria-label="Next slide">&rarr;</button>
            <button type="button" class="slideshow-export btn btn-primary">Download .pptx</button>
          </div>
        </header>
        <div class="slideshow-stage" aria-live="polite"></div>
        <footer class="slideshow-attribution">
          <small class="slideshow-credit">${escHtml(attributionText || 'Illustrations by Twemoji · CC-BY 4.0')}</small>
        </footer>
      </div>`;
  }

  function buildSlideHtml(slide, idx) {
    const dur = slide.duration_min ? `<span class="slideshow-slide-duration">${slide.duration_min} min</span>` : '';
    const sub = slide.subtitle ? `<p class="slideshow-slide-sub">${escHtml(slide.subtitle)}</p>` : '';
    return `
      <article class="slideshow-slide${idx === 0 ? ' is-active' : ''}" data-idx="${idx}" data-id="${escHtml(slide.id)}" aria-hidden="${idx === 0 ? 'false' : 'true'}">
        <div class="slideshow-slide-text">
          <h3 class="slideshow-slide-title">${escHtml(slide.title)}${dur}</h3>
          ${sub}
          <div class="slideshow-slide-body">${bodyToHtml(slide.body)}</div>
        </div>
        <div class="slideshow-slide-media" aria-hidden="true"></div>
      </article>`;
  }

  Slideshow.render = async function render(container, response, opts) {
    opts = opts || {};
    if (!container || !response || !Array.isArray(response.slides)) {
      throw new Error('Slatework.Slideshow.render: bad arguments');
    }
    const audiences = ['young_learner','teen','adult','exam_prep'];
    const meta = response.metadata || {};
    let audience = meta.inferred_audience || 'adult';
    // Classroom-mode marker — opts.mode wins over server-echoed metadata.mode.
    const explicitMode = (opts.mode && String(opts.mode)) || meta.mode || '';
    const isClassroom = explicitMode === 'classroom' || meta.deck_style === 'classroom';
    container.innerHTML = buildShellHtml(audience, audiences, opts.attributionText);
    const stage = container.querySelector('.slideshow-stage');
    const counter = container.querySelector('.slideshow-counter');
    const root = container.querySelector('.slideshow');
    if (isClassroom) root.classList.add('slideshow--classroom');

    function densityFor(a) {
      const m = response.metadata || {};
      if (a === m.inferred_audience) return m.inferred_image_density;
      return (response.alt_audiences && response.alt_audiences[a] && response.alt_audiences[a].image_density) || 'low';
    }

    async function renderForAudience(a) {
      audience = a;
      stage.innerHTML = response.slides.map((s, i) => {
        const override = response.alt_audiences && response.alt_audiences[a] &&
                         response.alt_audiences[a].tone_overrides &&
                         response.alt_audiences[a].tone_overrides[s.id];
        const slide = applyOverride(s, override);
        return buildSlideHtml(slide, i);
      }).join('');
      const slideEls = stage.querySelectorAll('.slideshow-slide');
      const density = densityFor(a);
      // Resolve images in parallel, but don't block the main render — slides
      // appear immediately, images fade in as they resolve.
      response.slides.forEach((s, i) => {
        const override = response.alt_audiences && response.alt_audiences[a] &&
                         response.alt_audiences[a].tone_overrides &&
                         response.alt_audiences[a].tone_overrides[s.id];
        const slide = applyOverride(s, override);
        renderSlideMedia(slideEls[i], slide, a, density);
      });
      idx = 0;
      updateActive();
      if (typeof opts.onAudienceChange === 'function') opts.onAudienceChange(a);
    }

    let idx = 0;
    function updateActive() {
      stage.querySelectorAll('.slideshow-slide').forEach((el, i) => {
        const active = (i === idx);
        el.classList.toggle('is-active', active);
        el.setAttribute('aria-hidden', active ? 'false' : 'true');
      });
      counter.textContent = `${idx + 1} / ${response.slides.length}`;
    }
    function move(delta) {
      idx = Math.min(response.slides.length - 1, Math.max(0, idx + delta));
      updateActive();
    }

    container.querySelector('.slideshow-prev').addEventListener('click', () => move(-1));
    container.querySelector('.slideshow-next').addEventListener('click', () => move(+1));
    container.querySelector('.slideshow-audience select').addEventListener('change', (e) => {
      renderForAudience(e.target.value);
    });
    container.querySelector('.slideshow-export').addEventListener('click', async () => {
      if (SW.SlideshowExport && typeof SW.SlideshowExport.exportPptx === 'function') {
        try {
          await SW.SlideshowExport.exportPptx({
            response, audience,
            mode: explicitMode || meta.mode || 'one_to_one',
            tutorName: opts.tutorName || '',
            attributionText: opts.attributionText || 'Illustrations by Twemoji (https://github.com/jdecked/twemoji) — CC-BY 4.0'
          });
        } catch (e) {
          alert('Could not generate the .pptx file. ' + (e && e.message ? e.message : ''));
        }
      } else {
        alert('Export module not loaded.');
      }
    });

    root.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter' || e.key === 'PageDown') { e.preventDefault(); move(+1); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Home') { e.preventDefault(); idx = 0; updateActive(); }
      else if (e.key === 'End') { e.preventDefault(); idx = response.slides.length - 1; updateActive(); }
    });

    await renderForAudience(audience);
    return { setAudience: renderForAudience };
  };

  Slideshow.generate = async function generate(payload) {
    const r = await fetch('/api/slideshow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.error || `Slideshow API ${r.status}`);
    }
    return r.json();
  };

  // ---- generateAndRender (called by the lesson-plan.html stub) ----------
  //
  // page-lesson-plan.js's #ext-slideshow click handler calls:
  //   Slatework.Slideshow.generateAndRender({
  //     lesson_plan_markdown,
  //     currentStudent,
  //     formValues: { target_language, source_language, level, mode, exam }
  //   })
  //
  // We resolve the audience from currentStudent (or via deriveAudience),
  // append a render slot inside #extensions, show a loading state, call
  // /api/slideshow, then hand off to Slideshow.render.

  Slideshow.generateAndRender = async function generateAndRender(input) {
    input = input || {};
    const md = String(input.lesson_plan_markdown || '').trim();
    if (md.length < 50) {
      throw new Error('No lesson-plan markdown to convert. Generate a plan first.');
    }
    const formValues = input.formValues || {};
    const student = input.currentStudent || null;

    let audience = student && student.audience_profile ? student.audience_profile : null;
    if (!audience && SW.Profile && typeof SW.Profile.deriveAudience === 'function') {
      audience = SW.Profile.deriveAudience({
        level: formValues.level || (student && student.level) || '',
        mode: formValues.mode || (student && student.mode) || '',
        exam: formValues.exam || (student && student.exam) || ''
      });
    }
    const validAudiences = ['young_learner','teen','adult','exam_prep'];
    if (!validAudiences.includes(audience)) audience = 'adult';

    const tutorName = (SW.Profile && typeof SW.Profile.getTutor === 'function')
      ? ((SW.Profile.getTutor() || {}).name || '')
      : '';

    // Locate or create the render host. The Plan-1 lesson-plan.html ships an
    // #extensions <section> that contains the trigger button; the slideshow
    // host is appended inside that section.
    const extensions = document.getElementById('extensions');
    if (!extensions) throw new Error('Extensions section missing from page.');
    let host = document.getElementById('slideshow-host');
    if (!host) {
      host = document.createElement('section');
      host.id = 'slideshow-host';
      host.className = 'slideshow-host';
      extensions.appendChild(host);
    }
    host.hidden = false;
    host.innerHTML = '<div class="slate-loading"><p class="mono-caption"><span class="dot"></span>BUILDING DECK</p><p class="slate-loading-sub">10–30 seconds. Don’t refresh.</p></div>';

    const payload = {
      lesson_plan_markdown: md,
      audience_profile: audience,
      target_language: formValues.target_language || (student && student.target) || '',
      source_language: formValues.source_language || (student && student.source) || 'English',
      level: formValues.level || (student && student.level) || 'B1',
      mode: formValues.mode || (student && student.mode) || 'one_to_one',
      exam: formValues.exam || (student && student.exam) || ''
    };

    let response;
    try {
      response = await Slideshow.generate(payload);
    } catch (err) {
      host.innerHTML = '<p class="error">' + escHtml((err && err.message) || 'Slideshow failed.') + '</p>';
      throw err;
    }

    return Slideshow.render(host, response, {
      tutorName,
      mode: payload.mode,
      attributionText: 'Illustrations by Twemoji · CC-BY 4.0 · Photos by Pexels'
    });
  };
})();
