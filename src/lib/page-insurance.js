// Extracted from insurance.html during CSP-nonce refactor (2026-05-07).
// Loaded via <script src="/src/lib/page-insurance.js" defer> from insurance.html.
const SW = window.Slatework;
const $ = (id) => document.getElementById(id);

// Phase E: bind country select to tutor profile if set.
function applyTutorCountryBinding() {
  const sel = document.querySelector('select[data-profile-country-bound]');
  if (!sel) return;
  if (!SW || !SW.Profile) return;
  const tutor = SW.Profile.getTutor();
  const caption = document.getElementById('profile-country-caption');
  if (tutor && tutor.country) {
    sel.value = tutor.country;
    sel.disabled = true;
    if (sel.parentElement) sel.parentElement.hidden = true;
    if (caption) {
      caption.hidden = false;
      caption.innerHTML = '';
      const txt = document.createTextNode('Showing ' + (document.title.split('—')[0] || 'data ').trim() + ' for ');
      const strong = document.createElement('strong');
      strong.textContent = countryName(tutor.country);
      const change = document.createElement('button');
      change.type = 'button';
      change.className = 'btn-link';
      change.textContent = ' Change';
      change.addEventListener('click', () => {
        if (SW.ProfileUI && SW.ProfileUI.openTutorEditor) {
          SW.ProfileUI.openTutorEditor({onSaved: () => location.reload()});
        }
      });
      caption.appendChild(txt);
      caption.appendChild(strong);
      caption.appendChild(change);
    }
  } else {
    sel.disabled = false;
    if (sel.parentElement) sel.parentElement.hidden = false;
    if (caption) caption.hidden = true;
  }
}

function countryName(code) {
  const list = SW.listCountries();
  const m = list.find(c => c.code === code);
  return m ? m.name : code;
}

// Mount tutor strip + bind on init
(function mountTutorStrip() {
  if (!SW.ProfileUI) return;
  SW.ProfileUI.mountTutorStrip({
    container: document.getElementById('profile-tutor-strip'),
    onChange: () => { applyTutorCountryBinding(); if (typeof render === 'function') render(); }
  });
})();

(async function init() {
  const sel = $('country');
  for (const c of SW.listCountries()) {
    const o = document.createElement('option');
    o.value = c.code;
    o.textContent = c.name;
    sel.appendChild(o);
  }
  sel.value = 'GB';
  sel.addEventListener('change', render);
  applyTutorCountryBinding();
  await render();
})();

async function render() {
  const code = $('country').value;
  const pack = await SW.loadCountry(code);
  const ins = pack.insurance || {};
  const bgc = pack.background_check || {};

  $('country-title').textContent = pack.name;

  $('pl-block').innerHTML = `
    <div class="row"><span>Typical public-liability cover</span><strong>${ins.public_liability_typical_amount ? formatAmount(ins.public_liability_typical_amount, pack) : '—'}</strong></div>
    ${ins.notes ? `<p class="small helper-margin">${escapeHtml(ins.notes)}</p>` : ''}
  `;

  const ul = $('provider-list');
  ul.innerHTML = '';
  for (const p of (ins.providers || [])) {
    const li = document.createElement('li');
    li.innerHTML = `<a href="${escapeAttr(p.url)}" target="_blank" rel="noopener">${escapeHtml(p.name)}</a>`;
    ul.appendChild(li);
  }

  $('bgc-name').textContent = bgc.name || '—';
  $('bgc-cost').textContent = bgc.cost_amount === 0 ? 'Free' : (bgc.cost_amount != null ? formatAmount(bgc.cost_amount, pack) : '—');
  $('bgc-url').href = bgc.url || '#';
  $('bgc-notes').textContent = bgc.notes || '';

  $('last-verified').textContent = `Verified ${pack.data_source_last_verified}.`;
  $('result').hidden = false;
}

function formatAmount(n, pack) {
  return new Intl.NumberFormat(pack.locale_default, { style: 'currency', currency: pack.currency, maximumFractionDigits: 0 }).format(n);
}
function escapeHtml(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function escapeAttr(s) { return escapeHtml(s); }
