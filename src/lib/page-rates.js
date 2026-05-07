// Extracted from rates.html during CSP-nonce refactor (2026-05-07).
// Loaded via <script src="/src/lib/page-rates.js" defer> from rates.html.
const SW = window.Slatework;

const EXPERIENCE_MULTIPLIER = {
  new: 0.85,
  early: 1.0,
  mid: 1.2,
  senior: 1.5
};

const $ = (id) => document.getElementById(id);

(async function init() {
  // Populate countries
  const countrySel = $('country');
  for (const c of SW.listCountries()) {
    const o = document.createElement('option');
    o.value = c.code;
    o.textContent = c.name;
    countrySel.appendChild(o);
  }
  countrySel.value = 'US';

  // Populate language pairs
  const pairSel = $('pair');
  for (const p of SW.languagePairs()) {
    const o = document.createElement('option');
    o.value = p.code;
    o.textContent = p.label;
    pairSel.appendChild(o);
  }
  pairSel.value = 'en-es';

  // Recalc on any change
  const form = $('form');
  form.addEventListener('input', recalc);
  await recalc();
})();

async function recalc() {
  const code = $('country').value;
  const pairKey = $('pair').value;
  const exp = $('experience').value;
  const hours = parseInt($('hours').value, 10) || 0;
  const userRate = parseFloat($('rate').value);

  let pack;
  try {
    pack = await SW.loadCountry(code);
  } catch (e) {
    $('suggestion-block').innerHTML = '<p class="small">Could not load country data. Refresh the page or pick a different country.</p>';
    $('platforms-block').innerHTML = '';
    $('annual-block').innerHTML = '';
    $('result').style.display = 'block';
    return;
  }
  const pairData = pack.rates_by_language_pair[pairKey];

  if (!pairData) {
    renderUnavailablePair(pack, pairKey);
    return;
  }

  const mult = EXPERIENCE_MULTIPLIER[exp] || 1.0;
  const low = pairData.low * mult;
  const median = pairData.median * mult;
  const high = pairData.high * mult;
  const grossRate = (!isNaN(userRate) && userRate > 0) ? userRate : median;
  const ccy = pack.currency;
  const locale = pack.locale_default;

  // Suggestion block
  const suggestion = document.createElement('div');
  suggestion.innerHTML = `
    <div class="row"><span>Suggested low</span><strong>${SW.formatCurrency(low, ccy, locale)}/hr</strong></div>
    <div class="row"><span>Suggested median</span><strong>${SW.formatCurrency(median, ccy, locale)}/hr</strong></div>
    <div class="row"><span>Suggested high</span><strong>${SW.formatCurrency(high, ccy, locale)}/hr</strong></div>
    <div class="row"><span>Your gross rate (used below)</span><strong>${SW.formatCurrency(grossRate, ccy, locale)}/hr</strong></div>
  `;
  const sb = $('suggestion-block');
  sb.innerHTML = '';
  sb.appendChild(suggestion);

  // Platforms block
  const platforms = pack.platforms.filter(p => (p.available_in || []).includes(code));
  const pb = $('platforms-block');
  pb.innerHTML = '';
  for (const p of platforms) {
    const fee = pickFee(p, hours);
    const net = p.fee_pct === 0 && p.notes
      ? null
      : grossRate * (1 - fee / 100);
    const row = document.createElement('div');
    row.className = 'row';
    if (net == null) {
      row.innerHTML = `<span>${escapeHtml(p.name)}</span><strong class="small">${escapeHtml(p.notes || 'Different pricing model')}</strong>`;
    } else {
      const feeLabel = p.fee_curve ? `${fee}% (after ${hoursTier(p, hours)} hrs taught)` : `${fee}%`;
      row.innerHTML = `<span>${escapeHtml(p.name)} <span class="small">— ${feeLabel}</span></span><strong>${SW.formatCurrency(net, ccy, locale)}/hr</strong>`;
    }
    pb.appendChild(row);
  }
  if (platforms.length === 0) {
    pb.innerHTML = '<p class="small">No platforms in our list operate here. Private rates apply directly.</p>';
  }

  // Annual block
  const weeklyHours = hours;
  const grossYear = grossRate * weeklyHours * 50; // 50 working weeks
  const ab = $('annual-block');
  ab.innerHTML = `
    <div class="row"><span>Hours / week</span><strong>${weeklyHours}</strong></div>
    <div class="row"><span>Gross / year (50 weeks)</span><strong>${SW.formatCurrency(grossYear, ccy, locale)}</strong></div>
    <div class="row"><span>Tax-relevant threshold</span><strong>${taxThresholdNote(pack, ccy, locale)}</strong></div>
  `;

  // FX note
  const r = await SW.rates();
  $('fx-note').textContent = `Rates and platform fees verified ${pack.data_source_last_verified}. FX rates ${r.source === 'fallback' ? 'using fallback table' : 'live'}.`;

  $('result').style.display = 'block';
}

function renderUnavailablePair(pack, pairKey) {
  $('platforms-block').innerHTML = '';
  $('annual-block').innerHTML = '';
  $('suggestion-block').innerHTML = `<p class="small">No published median for ${escapeHtml(pairKey)} in ${escapeHtml(pack.name)} yet. Pick another pair, or use the closest neighbor as a starting point.</p>`;
  $('result').style.display = 'block';
}

function sortedCurve(p) {
  // Defensive sort: country packs MAY arrive with fee_curve out of order.
  // Sorted ascending by after_hours so the tier walk below is correct.
  return [...p.fee_curve].sort((a, b) => (a.after_hours || 0) - (b.after_hours || 0));
}

function pickFee(p, hoursTaught) {
  if (!p.fee_curve || !p.fee_curve.length) return p.fee_pct;
  const curve = sortedCurve(p);
  let fee = curve[0].fee_pct;
  for (const t of curve) {
    if (hoursTaught >= t.after_hours) fee = t.fee_pct;
  }
  return fee;
}

function hoursTier(p, hoursTaught) {
  if (!p.fee_curve || !p.fee_curve.length) return '';
  const curve = sortedCurve(p);
  let last = 0;
  for (const t of curve) {
    if (hoursTaught >= t.after_hours) last = t.after_hours;
  }
  return last;
}

function taxThresholdNote(pack, ccy, locale) {
  const t = pack.tax;
  const lines = [];
  if (t.trading_allowance_amount) lines.push(`Trading allowance: ${SW.formatCurrency(t.trading_allowance_amount, ccy, locale)}`);
  if (t.vat_threshold_amount) lines.push(`VAT/GST threshold: ${SW.formatCurrency(t.vat_threshold_amount, ccy, locale)}`);
  return lines.length ? lines.join(' · ') : 'See ' + (t.self_employment_form || 'local tax form');
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
