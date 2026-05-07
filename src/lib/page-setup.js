// Extracted from setup.html during CSP-nonce refactor (2026-05-07).
// Loaded via <script src="/src/lib/page-setup.js" defer> from setup.html.
const SW = window.Slatework;
const $ = (id) => document.getElementById(id);

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
    ${bgc.notes ? `<p class="small" style="margin-top:0.6rem;">${escapeHtml(bgc.notes)}</p>` : ''}
  `;

  $('last-verified').textContent = `This information was last verified ${pack.data_source_last_verified}. Confirm with your country's authority before relying on any single step.`;
  $('result').style.display = 'block';
}

function formatCost(amount, pack) {
  if (amount === 0) return 'Free';
  return new Intl.NumberFormat(pack.locale_default, { style: 'currency', currency: pack.currency, maximumFractionDigits: 0 }).format(amount);
}
function escapeHtml(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function escapeAttr(s) { return escapeHtml(s); }
