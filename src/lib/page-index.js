// Extracted from index.html during CSP-nonce refactor (2026-05-07).
// Loaded via <script src="/src/lib/page-index.js" defer> from index.html.
console.log("%cFor the teachers", "color:#475569;font-size:14px;font-style:italic");

/* Tile entrance — IntersectionObserver-triggered (2026-05-09).
   Below-fold tiles stay opacity:0 until they scroll into view, so the GPU
   doesn't burn cycles animating offscreen elements on cheap Android.
   `data-js="ready"` flag flips the no-JS fallback off; styles.css holds
   the matching `body:not([data-js="ready"]) .tile-grid .tile { opacity: 1 }`
   rule so users with JS disabled still see all tiles. */
(() => {
  if (!('IntersectionObserver' in window)) {
    document.body.setAttribute('data-js', 'ready');
    return;
  }
  document.body.setAttribute('data-js', 'ready');
  const tiles = document.querySelectorAll('.tile-grid .tile');
  if (!tiles.length) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  tiles.forEach((t) => observer.observe(t));
})();

/* Pause hero atmospheric loop when tab is backgrounded (2026-05-09).
   The .hero-slate::before chalk-dust animation is a 12s infinite loop
   with radial-gradient + transform; backgrounded tabs were still running
   it at full rate. Page Visibility API toggles animationPlayState so the
   compositor pauses entirely when document.hidden flips true. */
(() => {
  const hero = document.querySelector('.hero-slate');
  if (!hero) return;
  const apply = (state) => {
    hero.style.animationPlayState = state;
    hero.querySelectorAll('*').forEach((el) => {
      el.style.animationPlayState = state;
    });
  };
  document.addEventListener('visibilitychange', () => {
    apply(document.hidden ? 'paused' : 'running');
  });
})();

/* Headline letter-by-letter chalk reveal — first paint only, respects reduced-motion.
   Counts characters and sets --chalk-mark-delay on each .chalk-mark so the
   underline animation fires AFTER the last character finishes drawing
   (Section A Important — was hardcoded 1.25s). */
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const el = document.getElementById('hero-display');
  if (!el || reduce) return;
  let i = 0;
  const wrapText = (text, target) => {
    for (const token of text.split(/(\s+)/)) {
      if (!token) continue;
      if (/^\s+$/.test(token)) {
        target.appendChild(document.createTextNode(token));
        continue;
      }
      const word = document.createElement('span');
      word.className = 'reveal-word';
      for (const ch of token) {
        const span = document.createElement('span');
        span.className = 'reveal';
        span.style.animationDelay = (i * 20) + 'ms';
        span.textContent = ch;
        word.appendChild(span);
        i++;
      }
      target.appendChild(word);
    }
  };
  const walk = (parent) => {
    for (const node of [...parent.childNodes]) {
      if (node.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        wrapText(node.textContent, frag);
        node.replaceWith(frag);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        walk(node);
      }
    }
  };
  walk(el);

  // After wrapping, calculate when the last character finishes drawing
  // (i*20ms reveal delay + 600ms reveal duration = full reveal end), and
  // set --chalk-mark-delay on every .chalk-mark inside the hero so its
  // underline draws after the headline completes regardless of length.
  const totalRevealMs = (i * 20) + 600;
  const chalkMarks = el.querySelectorAll('.chalk-mark');
  chalkMarks.forEach((m) => m.style.setProperty('--chalk-mark-delay', totalRevealMs + 'ms'));
})();

/* Newsletter submit — disables button during in-flight fetch, sets
   aria-invalid on bad email, restores on completion. */
(() => {
  const form = document.getElementById('newsletter');
  const status = document.getElementById('newsletter-status');
  if (!form) return;
  const btn = form.querySelector('button[type="submit"]');
  const emailEl = form.email;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    emailEl.removeAttribute('aria-invalid');
    const email = emailEl.value.trim();
    if (!email) {
      emailEl.setAttribute('aria-invalid', 'true');
      emailEl.focus();
      return;
    }
    if (btn) btn.disabled = true;
    status.textContent = 'Joining…';
    try {
      const r = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (r.ok) {
        status.textContent = 'Welcome aboard.';
        form.reset();
      } else if (r.status === 429) {
        status.textContent = 'Too many tries — wait a minute.';
      } else if (r.status === 400) {
        emailEl.setAttribute('aria-invalid', 'true');
        status.textContent = 'That email looks off. Check the spelling.';
      } else {
        status.textContent = 'Could not join right now. Try again in a moment.';
      }
    } catch {
      status.textContent = 'Network error. Try again in a moment.';
    } finally {
      if (btn) btn.disabled = false;
    }
  });
})();

/* Live rate preview widget */
(async () => {
  const SW = window.Slatework;
  if (!SW) return;

  const countrySel = document.getElementById('preview-country');
  const pairSel = document.getElementById('preview-pair');
  const expSel = document.getElementById('preview-exp');
  const rateEl = document.getElementById('preview-rate');
  const platEl = document.getElementById('preview-platforms');
  if (!countrySel || !pairSel || !expSel) return;

  for (const c of SW.listCountries()) {
    const o = document.createElement('option');
    o.value = c.code;
    o.textContent = c.name;
    if (c.code === 'GB') o.selected = true;
    countrySel.appendChild(o);
  }

  for (const p of SW.languagePairs()) {
    const o = document.createElement('option');
    o.value = p.code;
    o.textContent = p.label;
    if (p.code === 'en-es') o.selected = true;
    pairSel.appendChild(o);
  }

  const EXP_MULT = { new: 0.85, early: 1.0, mid: 1.2, senior: 1.5 };

  async function update() {
    const code = countrySel.value;
    const pair = pairSel.value;
    const exp = expSel.value;
    try {
      const pack = await SW.loadCountry(code);
      const data = pack.rates_by_language_pair[pair];
      if (!data) {
        rateEl.textContent = '—';
        platEl.textContent = '// no data for this pair yet';
        return;
      }
      const mult = EXP_MULT[exp] || 1;
      const median = data.median * mult;
      const ccy = pack.currency;
      const locale = pack.locale_default;
      rateEl.textContent = SW.formatCurrency(median, ccy, locale) + '/hr';

      const platforms = (pack.platforms || [])
        .filter(p => (p.available_in || []).includes(code) && p.fee_pct > 0)
        .slice(0, 3);
      const parts = platforms.map(p => p.name + ' ' + SW.formatCurrency(median * (1 - p.fee_pct / 100), ccy, locale));
      platEl.textContent = parts.length ? '// ' + parts.join(' · ') + ' net' : '// no platform fees in this market';
    } catch (e) {
      platEl.textContent = '// could not load rates';
    }
  }

  countrySel.addEventListener('change', update);
  pairSel.addEventListener('change', update);
  expSel.addEventListener('change', update);
  await update();
})();
