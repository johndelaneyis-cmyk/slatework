// Extracted from index.html during CSP-nonce refactor (2026-05-07).
// Loaded via <script src="/src/lib/page-index.js" defer> from index.html.
console.log("%cFor the teachers", "color:#475569;font-size:14px;font-style:italic");

/* Headline letter-by-letter chalk reveal — first paint only, respects reduced-motion */
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
})();

/* Newsletter submit */
(() => {
  const form = document.getElementById('newsletter');
  const status = document.getElementById('newsletter-status');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    if (!email) return;
    status.textContent = 'Joining...';
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
        status.textContent = 'Too many tries - wait a minute.';
      } else {
        status.textContent = 'Could not join right now. Try again in a moment.';
      }
    } catch {
      status.textContent = 'Network error. Try again in a moment.';
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
