// Slatework site-wide feedback widget + Cloudflare Web Analytics beacon.
// Auto-mounts on every page that includes <script src="/feedback.js" defer></script>.

(() => {
  // --- Cloudflare Web Analytics beacon ---------------------------------------
  // Public site identifier (visible to every visitor in the rendered HTML).
  // Bound to slatework.tools at dash.cloudflare.com -> Web Analytics.
  const BEACON_TOKEN = "0a7c100b0b8e44ee9cc547af8f844385";
  if (BEACON_TOKEN && BEACON_TOKEN !== "REPLACE_WITH_CF_BEACON_TOKEN") {
    const s = document.createElement('script');
    s.defer = true;
    s.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    s.setAttribute('data-cf-beacon', JSON.stringify({ token: BEACON_TOKEN }));
    document.head.appendChild(s);
  }

  // --- Feedback widget --------------------------------------------------------
  const SKIP_PATHS = ['/privacy.html', '/terms.html', '/about.html', '/404.html', '/tests/'];
  const path = location.pathname;
  if (SKIP_PATHS.some(p => path.startsWith(p))) return;
  if (path === '/' || path === '/index.html') return; // Homepage has its own newsletter form.

  // Map raw URL slug to server-side whitelisted tool name (functions/api/feedback.js).
  // Hyphenated routes (e.g. "lesson-plan") become snake_case ("lesson_plan").
  const rawSlug = path.replace(/^\//, '').replace(/\.html$/, '') || 'home';
  const slug = rawSlug === 'home' ? 'index' : rawSlug.replace(/-/g, '_');

  function mount() {
    const main = document.querySelector('main');
    if (!main) return;
    if (main.querySelector('.feedback-widget')) return;

    const wrap = document.createElement('section');
    wrap.className = 'feedback-widget';
    wrap.innerHTML = `
      <p class="fb-prompt"><strong>Was this useful?</strong></p>
      <div class="fb-row">
        <button type="button" class="fb-btn" data-fb="up" aria-label="Yes, this was useful">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M7 11v8a2 2 0 0 0 2 2h7.5a2 2 0 0 0 1.95-1.59l1.55-7A2 2 0 0 0 18 10H14V5a2 2 0 0 0-2-2l-3 7v1H7Z"/>
          </svg>
          Yes
        </button>
        <button type="button" class="fb-btn" data-fb="down" aria-label="Could be better">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M17 13V5a2 2 0 0 0-2-2H7.5a2 2 0 0 0-1.95 1.59l-1.55 7A2 2 0 0 0 6 14h4v5a2 2 0 0 0 2 2l3-7v-1h2Z"/>
          </svg>
          Could be better
        </button>
        <span class="fb-status"></span>
      </div>
      <textarea class="fb-note" data-fb="note" aria-label="Optional feedback note" placeholder="(optional) one-sentence note — what went well or didn't" hidden></textarea>
      <div class="fb-actions" data-fb="actions" hidden>
        <button type="button" class="fb-btn-send" data-fb="send">Send</button>
        <button type="button" class="fb-btn-skip" data-fb="skip">Skip note</button>
      </div>
    `;
    main.appendChild(wrap);

    let chosen = null;
    let submitted = false;
    const status = wrap.querySelector('.fb-status');
    const note = wrap.querySelector('[data-fb="note"]');
    const actions = wrap.querySelector('[data-fb="actions"]');
    const sendBtn = wrap.querySelector('[data-fb="send"]');
    const skipBtn = wrap.querySelector('[data-fb="skip"]');

    wrap.querySelectorAll('[data-fb="up"], [data-fb="down"]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (submitted) return;
        chosen = btn.getAttribute('data-fb');
        status.textContent = 'Thanks. Want to add a note?';
        note.hidden = false;
        actions.hidden = false;
      });
    });

    function finalize() {
      submitted = true;
      status.textContent = 'Sent. Thanks.';
      note.disabled = true;
      sendBtn.disabled = true;
      skipBtn.disabled = true;
    }

    sendBtn.addEventListener('click', () => {
      if (submitted || !chosen) return;
      send(chosen, note.value.trim());
      finalize();
    });

    skipBtn.addEventListener('click', () => {
      if (submitted || !chosen) return;
      send(chosen, '');
      finalize();
    });
  }

  async function send(verdict, comment) {
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: slug, verdict, comment: comment.slice(0, 500) })
      });
    } catch {
      // Silent - feedback failure should never disrupt the user.
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
