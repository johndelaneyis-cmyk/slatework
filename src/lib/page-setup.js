// Extracted from setup.html during CSP-nonce refactor (2026-05-07).
// Loaded via <script src="/src/lib/page-setup.js" defer> from setup.html.
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
      const txt = document.createTextNode('Showing setup steps for ');
      const strong = document.createElement('strong');
      strong.textContent = countryName(tutor.country);
      const change = document.createElement('button');
      change.type = 'button';
      change.className = 'btn-link';
      change.textContent = ' · Change';
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

  $('country-title').textContent = pack.name;

  const reg = $('reg-steps');
  reg.innerHTML = '';
  for (const step of pack.tax.registration_steps) {
    const li = document.createElement('li');
    li.textContent = step;
    reg.appendChild(li);
  }

  const bgc = pack.background_check;
  const bgcBlock = $('bgc-block');
  bgcBlock.innerHTML = `
    <div class="row"><span><strong>Name</strong></span><strong>${escapeHtml(bgc.name)}</strong></div>
    <div class="row"><span><strong>Cost</strong></span><strong>${bgc.cost_amount != null ? formatCost(bgc.cost_amount, pack) : '–'}</strong></div>
    <div class="row"><span><strong>Where</strong></span><strong><a href="${escapeAttr(bgc.url)}" target="_blank" rel="noopener">Apply →</a></strong></div>
    ${bgc.notes ? `<p class="small" class="mt-06">${escapeHtml(bgc.notes)}</p>` : ''}
  `;

  $('last-verified').textContent = `This information was last verified ${pack.data_source_last_verified}. Confirm with your country's authority before relying on any single step.`;
  $('result').hidden = false;
}

function formatCost(amount, pack) {
  if (amount === 0) return 'Free';
  return new Intl.NumberFormat(pack.locale_default, { style: 'currency', currency: pack.currency, maximumFractionDigits: 0 }).format(amount);
}
function escapeHtml(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function escapeAttr(s) { return escapeHtml(s); }
