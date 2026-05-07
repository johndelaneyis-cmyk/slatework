// Extracted from payments.html during CSP-nonce refactor (2026-05-07).
// Loaded via <script src="/src/lib/page-payments.js" defer> from payments.html.
// Note: the original inline block had backticks stripped by a prior transform
// (renderRow was syntactically invalid JS) — that bug is fixed here.
const SW = window.Slatework;
const $ = (id) => document.getElementById(id);

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

  $('result').style.display = 'block';
}

function renderRow(m) {
  const link = m.url
    ? `<a href="${escapeAttr(m.url)}" target="_blank" rel="noopener">${escapeHtml(m.name)}</a>`
    : escapeHtml(m.name);
  const note = m.notes ? ` <span class="small">— ${escapeHtml(m.notes)}</span>` : '';
  return `<div class="row"><span>${link}${note}</span><strong></strong></div>`;
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
function escapeAttr(s) { return escapeHtml(s); }
