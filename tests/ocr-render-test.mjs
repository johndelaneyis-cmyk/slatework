// DOM-mock test for renderOcrReviewNotice — verifies the HTML output
// the function produces for various OCR-result scenarios without needing
// a real browser.
//
// Run: node tests/ocr-render-test.mjs

// ───────────────────────────────────────────────────────────────────────────
// Minimal DOM mock: just what renderOcrReviewNotice touches.
// ───────────────────────────────────────────────────────────────────────────
function makeMockContainer() {
  return {
    _innerHTML: '',
    hidden: true,
    set innerHTML(v) { this._innerHTML = v; },
    get innerHTML() { return this._innerHTML; },
    scrollIntoView: () => {},
  };
}
function makeMockTextarea() {
  const listeners = [];
  return {
    listeners,
    addEventListener: (evt, fn, opts) => listeners.push({ evt, fn, opts }),
    removeEventListener: (evt, fn) => {
      const i = listeners.findIndex(l => l.evt === evt && l.fn === fn);
      if (i >= 0) listeners.splice(i, 1);
    },
    triggerInput: () => {
      for (const l of [...listeners]) {
        if (l.evt === 'input') l.fn();
      }
    },
  };
}

// ───────────────────────────────────────────────────────────────────────────
// renderOcrReviewNotice + hideReviewNotice + escapeText — VERBATIM from
// src/lib/page-marking.js. Update both sides if you change the function.
// ───────────────────────────────────────────────────────────────────────────
function renderOcrReviewNotice(container, { avg, min, wordCount, suspects, textarea, actionLabel }) {
  if (!container) return;
  const hasSuspects = suspects && suspects.length > 0;
  const lowAvg = typeof avg === 'number' && avg < 0.85;
  const lowMin = typeof min === 'number' && min < 0.5;
  if (!hasSuspects && !lowAvg && !lowMin) {
    hideReviewNotice(container);
    return;
  }
  let confidenceLine = '';
  if (typeof avg === 'number' && wordCount) {
    const pct = Math.round(avg * 100);
    if (lowAvg) {
      confidenceLine = `<p class="ocr-review-confidence">OCR confidence: <strong>${pct}%</strong> across ${wordCount} words. Handwriting and low-contrast photos read variably — please scan the text below before clicking ${escapeText(actionLabel)}.</p>`;
    } else {
      confidenceLine = `<p class="ocr-review-confidence">OCR confidence: <strong>${pct}%</strong> across ${wordCount} words.</p>`;
    }
  }
  let suspectsBlock = '';
  if (hasSuspects) {
    const chips = suspects.map(t => `<code class="ocr-suspect-chip">${escapeText(t)}</code>`).join(' ');
    suspectsBlock = `<p class="ocr-review-suspects"><strong>Possible misreads to check:</strong> ${chips}</p>`;
  }
  container.innerHTML = `
    <p class="ocr-review-heading"><span class="mono-caption">// REVIEW BEFORE MARKING</span></p>
    ${confidenceLine}
    ${suspectsBlock}
    <p class="ocr-review-help">Edit the text below to fix any misreads. This notice clears once you start editing.</p>
  `;
  container.hidden = false;
  container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  const clear = () => {
    hideReviewNotice(container);
    textarea.removeEventListener('input', clear);
  };
  textarea.addEventListener('input', clear, { once: true });
}

function hideReviewNotice(container) {
  if (!container) return;
  container.hidden = true;
  container.innerHTML = '';
}

function escapeText(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ───────────────────────────────────────────────────────────────────────────
// Test runner
// ───────────────────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
const fails = [];
function expect(label, cond, detail = '') {
  if (cond) { pass++; return; }
  fail++;
  fails.push({ label, detail });
}

// ───────────────────────────────────────────────────────────────────────────
// Scenarios
// ───────────────────────────────────────────────────────────────────────────

// 1. Clean OCR — high confidence, no suspects → notice STAYS HIDDEN
{
  const c = makeMockContainer();
  const t = makeMockTextarea();
  renderOcrReviewNotice(c, { avg: 0.96, min: 0.91, wordCount: 25, suspects: [], textarea: t, actionLabel: 'Mark' });
  expect('clean OCR → hidden', c.hidden === true);
  expect('clean OCR → empty innerHTML', c.innerHTML === '');
}

// 2. Suspects only (high confidence) → SHOWS, no confidence line
{
  const c = makeMockContainer();
  const t = makeMockTextarea();
  renderOcrReviewNotice(c, { avg: 0.93, min: 0.85, wordCount: 25, suspects: ['ar', 'hav', 'ing'], textarea: t, actionLabel: 'Mark' });
  expect('suspects only → visible', c.hidden === false);
  expect('suspects only → contains suspect chips', c.innerHTML.includes('ar') && c.innerHTML.includes('hav') && c.innerHTML.includes('ing'));
  expect('suspects only → no low-conf banner', !c.innerHTML.includes('read variably'));
  expect('suspects only → registered input listener', t.listeners.length === 1 && t.listeners[0].evt === 'input');
}

// 3. Low confidence only → SHOWS confidence banner, no suspect chips
{
  const c = makeMockContainer();
  const t = makeMockTextarea();
  renderOcrReviewNotice(c, { avg: 0.72, min: 0.5, wordCount: 18, suspects: [], textarea: t, actionLabel: 'Mark' });
  expect('low-conf only → visible', c.hidden === false);
  expect('low-conf only → shows 72%', c.innerHTML.includes('72%'));
  expect('low-conf only → shows read-variably text', c.innerHTML.includes('read variably'));
  expect('low-conf only → no suspect chips', !c.innerHTML.includes('ocr-suspect-chip'));
}

// 4. Both low-conf AND suspects → SHOWS both
{
  const c = makeMockContainer();
  const t = makeMockTextarea();
  renderOcrReviewNotice(c, { avg: 0.68, min: 0.42, wordCount: 30, suspects: ['ar', 'hav'], textarea: t, actionLabel: 'Mark' });
  expect('both → visible', c.hidden === false);
  expect('both → shows 68%', c.innerHTML.includes('68%'));
  expect('both → shows chips', c.innerHTML.includes('ar') && c.innerHTML.includes('hav'));
  expect('both → shows read-variably', c.innerHTML.includes('read variably'));
}

// 5. Auto-clear on textarea input
{
  const c = makeMockContainer();
  const t = makeMockTextarea();
  renderOcrReviewNotice(c, { avg: 0.72, suspects: ['ar'], wordCount: 5, textarea: t, actionLabel: 'Mark' });
  expect('pre-input: visible', c.hidden === false);
  t.triggerInput();
  expect('post-input: hidden', c.hidden === true);
  expect('post-input: empty', c.innerHTML === '');
  expect('post-input: listener removed', t.listeners.length === 0);
}

// 6. Min < 0.5 triggers visible even with average 0.9
{
  const c = makeMockContainer();
  const t = makeMockTextarea();
  renderOcrReviewNotice(c, { avg: 0.92, min: 0.35, wordCount: 20, suspects: [], textarea: t, actionLabel: 'Mark' });
  expect('low min only → visible', c.hidden === false);
}

// 7. HTML escaping in suspect tokens — defends against XSS
{
  const c = makeMockContainer();
  const t = makeMockTextarea();
  renderOcrReviewNotice(c, { avg: 0.5, suspects: ['<script>alert(1)</script>', '"onerror=x"'], wordCount: 10, textarea: t, actionLabel: 'Mark' });
  expect('XSS attempt → escaped <',  c.innerHTML.includes('&lt;script&gt;'));
  expect('XSS attempt → escaped "',  c.innerHTML.includes('&quot;onerror'));
  expect('XSS attempt → no raw <script>', !c.innerHTML.includes('<script>alert'));
}

// 8. actionLabel "Assess" surfaces correctly (CEFR page)
{
  const c = makeMockContainer();
  const t = makeMockTextarea();
  renderOcrReviewNotice(c, { avg: 0.7, suspects: [], wordCount: 10, textarea: t, actionLabel: 'Assess' });
  expect('Assess label appears in low-conf text', c.innerHTML.includes('clicking Assess'));
}

// 9. Hides re-show: hideReviewNotice clears innerHTML
{
  const c = makeMockContainer();
  c.innerHTML = '<p>old content</p>';
  c.hidden = false;
  hideReviewNotice(c);
  expect('hideReviewNotice → hidden', c.hidden === true);
  expect('hideReviewNotice → empty', c.innerHTML === '');
}

// 10. Missing container → graceful (returns early)
{
  // Should not throw
  let threw = false;
  try { renderOcrReviewNotice(null, { avg: 0.5, suspects: ['x'], wordCount: 5, textarea: makeMockTextarea(), actionLabel: 'Mark' }); }
  catch (e) { threw = true; }
  expect('null container → no throw', !threw);
}

// 11. Confidence missing entirely (no Vision word data) — only suspects matter
{
  const c = makeMockContainer();
  const t = makeMockTextarea();
  renderOcrReviewNotice(c, { avg: null, min: null, wordCount: 0, suspects: ['ar'], textarea: t, actionLabel: 'Mark' });
  expect('null confidence + suspects → visible', c.hidden === false);
  expect('null confidence → no percentage shown', !c.innerHTML.match(/\d+%/));
}

// 12. Confidence boundary exactly 0.85 → NOT triggered (lowAvg is strict <)
{
  const c = makeMockContainer();
  const t = makeMockTextarea();
  renderOcrReviewNotice(c, { avg: 0.85, min: 0.7, wordCount: 20, suspects: [], textarea: t, actionLabel: 'Mark' });
  expect('avg exactly 0.85 → hidden (strict <)', c.hidden === true);
}

// ───────────────────────────────────────────────────────────────────────────
// Report
// ───────────────────────────────────────────────────────────────────────────
console.log(`── renderOcrReviewNotice DOM-mock tests ──`);
console.log(`PASS: ${pass}`);
console.log(`FAIL: ${fail}`);
if (fail) {
  console.log(`\nFAILURES:`);
  for (const f of fails) console.log(`  ${f.label}`);
  process.exit(1);
}
process.exit(0);
