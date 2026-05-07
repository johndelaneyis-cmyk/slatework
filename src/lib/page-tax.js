// Extracted from tax.html during CSP-nonce refactor (2026-05-07).
// Loaded via <script src="/src/lib/page-tax.js" defer> from tax.html.
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
  const t = pack.tax;

  $('country-title').textContent = pack.name;
  $('form-name').textContent = t.self_employment_form;
  $('form-link').href = t.self_employment_url;
  $('threshold').textContent = t.trading_allowance_amount
    ? `${formatAmount(t.trading_allowance_amount, pack)} (covered without filing)`
    : 'No general allowance — file from your first paid lesson.';
  $('vat-threshold').textContent = t.vat_threshold_amount
    ? `${formatAmount(t.vat_threshold_amount, pack)} turnover/year`
    : 'No VAT/GST in this country (or not applicable to tutoring services).';

  // Top callout: emphasise the threshold (the loudest part of the page)
  const captionEl = $('threshold-caption');
  const amountEl = $('threshold-amount');
  const subnoteEl = $('threshold-subnote');
  if (code === 'HK') {
    captionEl.textContent = "// NO VAT/GST IN HONG KONG · BUT BUSINESS REGISTRATION IS REQUIRED FROM DAY ONE";
    amountEl.textContent = 'Register from day one';
    subnoteEl.textContent = 'Hong Kong has no general trading allowance and no VAT/GST. The Business Registration Certificate is required as soon as you start tutoring for fees — but the upside is a flat, simple regime once you are in.';
  } else if (t.trading_allowance_amount) {
    captionEl.textContent = "// THIS IS THE THRESHOLD — UNDER IT, MOST DON'T NEED TO REGISTER";
    amountEl.textContent = `${formatAmount(t.trading_allowance_amount, pack)} / year`;
    subnoteEl.textContent = `Earn under ${formatAmount(t.trading_allowance_amount, pack)} from tutoring in a tax year and you usually don't need to register as self-employed. Cross it and you do — that's when the form below matters.`;
  } else {
    captionEl.textContent = "// NO GENERAL ALLOWANCE — REGISTER FROM YOUR FIRST PAID LESSON";
    amountEl.textContent = 'Register from your first paid lesson';
    subnoteEl.textContent = 'This country has no general trading allowance, so registration is expected as soon as you have any net self-employment income. Use the form below to start.';
  }

  const reg = $('reg-steps');
  reg.innerHTML = '';
  for (const step of t.registration_steps) {
    const li = document.createElement('li');
    li.textContent = step;
    reg.appendChild(li);
  }

  $('notes').textContent = t.notes || '';
  $('last-verified').textContent = `Verified ${pack.data_source_last_verified}. Tax rules change; confirm before filing.`;
  $('result').style.display = 'block';
}

function formatAmount(n, pack) {
  return new Intl.NumberFormat(pack.locale_default, { style: 'currency', currency: pack.currency, maximumFractionDigits: 0 }).format(n);
}
