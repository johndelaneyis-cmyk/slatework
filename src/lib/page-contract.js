// Extracted from contract.html during CSP-nonce refactor (2026-05-07).
// Loaded via <script src="/src/lib/page-contract.js" defer> from contract.html.
const $ = (id) => document.getElementById(id);
const form = $('form');
form.addEventListener('input', render);
$('print-btn').addEventListener('click', () => window.print());

function render() {
  const tutor = $('tutor_name').value.trim() || '[Your name]';
  const biz = $('business_name').value.trim() || tutor;
  const email = $('contact_email').value.trim() || '[your email]';
  const subject = $('subject').value.trim() || 'language tutoring';
  const rate = $('rate').value.trim() || '[rate per lesson]';
  const duration = $('duration').value.trim() || '[duration]';
  const location = $('location').value.trim() || '[location]';
  const cancelHours = $('cancel_hours').value || '24';
  const cancelFee = $('cancel_fee').value;
  const cancelText = cancelFee === 'full' ? 'the full lesson fee' : cancelFee === 'half' ? 'half the lesson fee' : 'no fee, but a rebook is required';
  const paymentTerms = $('payment_terms').value.trim() || '[payment terms]';
  const welcomeTone = $('welcome_tone').value;
  const yearsRaw = $('years_teaching') ? $('years_teaching').value : '';
  const years = yearsRaw === '' ? null : parseInt(yearsRaw, 10);
  const customField = $('welcome_custom_field');
  if (customField) customField.hidden = welcomeTone !== 'custom';
  const customText = $('welcome_custom') ? $('welcome_custom').value : '';

  const welcome = welcomePara(welcomeTone, tutor, subject, years, customText);

  const today = (() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  })();

  $('preview').innerHTML = `
    <h2 class="text-center">${escapeHtml(subject)} — Lesson Agreement</h2>
    <p class="text-center">between <strong>${escapeHtml(biz)}</strong> ("the Tutor") and the Parent or Guardian named below ("the Parent")</p>

    <h3>1. Welcome</h3>
    <p class="preserve-newlines">${escapeHtml(welcome)}</p>

    <h3>2. Lessons</h3>
    <p>The Tutor will provide <strong>${escapeHtml(subject)}</strong> lessons of <strong>${escapeHtml(duration)}</strong> at the agreed rate of <strong>${escapeHtml(rate)}</strong>, delivered <strong>${escapeHtml(location)}</strong>. Lessons are scheduled by mutual agreement.</p>

    <h3>3. Trial lesson</h3>
    <p>The first lesson is offered at the standard rate. If the Parent decides not to continue after the first lesson, no further commitment applies.</p>

    <h3>4. Payment</h3>
    <p>Lessons are <strong>${escapeHtml(paymentTerms)}</strong>. The Tutor will issue a written invoice or receipt on request.</p>

    <h3>5. Cancellation policy</h3>
    <p>Lessons cancelled with at least <strong>${escapeHtml(cancelHours)}</strong> hours' notice incur no fee and may be rescheduled. Lessons cancelled with less notice incur <strong>${escapeHtml(cancelText)}</strong>. The Tutor will give the same notice in the rare event a session must be rescheduled from the Tutor's side.</p>

    <h3>6. Communication</h3>
    <p>Lesson-related messaging happens via <strong>${escapeHtml(email)}</strong>. The Tutor responds during reasonable hours; a same-day reply is not guaranteed.</p>

    <h3>7. Safeguarding (where the student is a minor)</h3>
    <p>Lessons with students under 18 are conducted with a parent or guardian on-record. The Tutor maintains current background-check certification and will share documentation on request.</p>

    <h3>8. Privacy</h3>
    <p>The Tutor keeps lesson records (date, duration, topic, work assigned) and shares them with the Parent on request. The Tutor does not share student information with third parties.</p>

    <h3>9. Term</h3>
    <p>This agreement runs lesson by lesson. Either side may end it with one full week's notice.</p>

    <p class="mt-3">Date: <strong>${today}</strong></p>
    <p class="mt-15">Tutor signature: ___________________________</p>
    <p class="mt-1">Parent signature: ___________________________</p>
    <p class="mt-1">Parent name: ___________________________</p>
    <p class="mt-1">Student name: ___________________________</p>
  `;
}

function welcomePara(tone, name, subject, years, custom) {
  const briefText = `I teach ${subject} clearly and consistently. You'll get a brief written note after each lesson summarising what we did and what's been set as practice. If something isn't working, please tell me — I'd rather adjust early than at the end of the term.`;
  if (tone === 'custom') {
    const trimmed = (custom || '').trim();
    if (trimmed) return trimmed;
    return briefText;
  }
  const hasYears = typeof years === 'number' && !Number.isNaN(years) && years >= 1;
  if (tone === 'warm') {
    if (hasYears) return `Thank you for choosing me to support your child's ${subject} progress. With ${years}+ years teaching ${subject}, I'll be straightforward, structured, and kind, and I'll keep you informed at each step. The goal of every lesson is real, visible progress — not just hours logged.`;
    return `Thank you for choosing me to support your child's ${subject} progress. I'll be straightforward, structured, and kind, and I'll keep you informed at each step. The goal of every lesson is real, visible progress — not just hours logged.`;
  }
  if (tone === 'formal') {
    if (hasYears) return `With ${years}+ years teaching ${subject}, this agreement governs the provision of ${subject} tutoring services by ${name}. Lessons follow a structured plan agreed with the Parent and reviewed monthly.`;
    return `This agreement governs the provision of ${subject} tutoring services by ${name}. Lessons follow a structured plan agreed with the Parent and reviewed monthly.`;
  }
  return briefText;
}

function escapeHtml(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

// Country-aware rate placeholder. Reads navigator.language as a heuristic
// for the user's likely market and updates the rate input placeholder so
// US/HK/IN/etc tutors don't see a UK example as the first thing.
(function localizeRatePlaceholder() {
  const rateInput = $('rate');
  if (!rateInput) return;
  const lang = (navigator.language || 'en-US').toLowerCase();
  const region = lang.split('-')[1] || '';
  const examples = {
    us: '$50 per 60-minute lesson',
    gb: '£40 per 60-minute lesson',
    ca: 'C$45 per 60-minute lesson',
    au: 'A$55 per 60-minute lesson',
    nz: 'NZ$50 per 60-minute lesson',
    ie: '€40 per 60-minute lesson',
    hk: 'HK$400 per 60-minute lesson',
    in: '₹800 per 60-minute lesson',
    sg: 'S$60 per 60-minute lesson',
    ph: '₱500 per 60-minute lesson'
  };
  const example = examples[region] || examples.us;
  rateInput.placeholder = `e.g., ${example}`;
})();

render();
