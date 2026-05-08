// Extracted from payments.html during CSP-nonce refactor (2026-05-07).
// Loaded via <script src="/src/lib/page-payments.js" defer> from payments.html.
const SW = window.Slatework;
const $ = (id) => document.getElementById(id);
const escapeHtml = (SW && SW.escapeHtml) || function (s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
};
const escapeAttr = escapeHtml;

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
  const countrySel = $('country');
  for (const c of SW.listCountries()) {
    const o = document.createElement('option');
    o.value = c.code;
    o.textContent = c.name;
    countrySel.appendChild(o);
  }
  countrySel.value = 'GB';
  countrySel.addEventListener('change', render);
  applyTutorCountryBinding();
  await render();
})();

async function render() {
  const code = $('country').value;
  const pack = await SW.loadCountry(code);
  const dom = $('domestic');
  const intl = $('international');

  dom.innerHTML = pack.payment_methods
    .filter(m => m.domestic)
    .map(renderRow)
    .join('') || '<p class="small">No specific domestic recommendations for this country.</p>';

  intl.innerHTML = pack.payment_methods
    .filter(m => m.international)
    .map(renderRow)
    .join('') || '<p class="small">For international clients, default to Wise or Stripe Link.</p>';

  $('result').hidden = false;
}

function renderRow(m) {
  const link = m.url
    ? '<a href="' + escapeAttr(m.url) + '" target="_blank" rel="noopener">' + escapeHtml(m.name) + '</a>'
    : escapeHtml(m.name);
  const note = m.notes ? ' <span class="small">&mdash; ' + escapeHtml(m.notes) + '</span>' : '';
  // No fee column on payment methods (the column was a holdover from an
  // earlier rate-vs-fee table — Section E #12). Just render the name + note.
  return '<div class="payment-row"><span>' + link + note + '</span></div>';
}
