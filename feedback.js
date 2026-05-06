// Slatework site-wide feedback widget + Cloudflare Web Analytics beacon.
// Auto-mounts on every page that includes <script src="/feedback.js" defer></script>.

(() => {
  // --- Cloudflare Web Analytics beacon ---------------------------------------
  // Replace this token after creating a site at:
  //   dash.cloudflare.com -> Analytics & Logs -> Web Analytics -> Add a site
  const BEACON_TOKEN = "REPLACE_WITH_CF_BEACON_TOKEN";
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

  const slug = path.replace(/^\//, '').replace(/\.html$/, '') || 'home';

  function mount() {
    const main = document.querySelector('main');
    if (!main) return;
    if (main.querySelector('.feedback-widget')) return;

    const wrap = document.createElement('section');
    wrap.className = 'feedback-widget';
    wrap.style.cssText = 'margin: 3rem 0 1rem; padding: 1rem; background: var(--surface, #fff); border: 1px solid var(--line, #e2e8f0); border-radius: 8px;';
    wrap.innerHTML = `
      <p style="margin: 0 0 0.5rem; font-size: 0.95rem;"><strong>Was this useful?</strong></p>
      <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;">
        <button type="button" data-fb="up" style="font: inherit; padding: 0.4rem 0.8rem; background: transparent; border: 1px solid var(--line, #e2e8f0); border-radius: 6px; cursor: pointer;">\u{1F44D} Yes</button>
        <button type="button" data-fb="down" style="font: inherit; padding: 0.4rem 0.8rem; background: transparent; border: 1px solid var(--line, #e2e8f0); border-radius: 6px; cursor: pointer;">\u{1F44E} Could be better</button>
        <span class="fb-status" style="font-size: 0.85rem; color: var(--ink-muted, #475569); margin-left: 0.5rem;"></span>
      </div>
      <textarea data-fb="note" placeholder="(optional) one-sentence note — what went well or didn't" style="display:none; margin-top: 0.7rem; width: 100%; min-height: 4rem; font: inherit; padding: 0.5rem; border: 1px solid var(--line, #e2e8f0); border-radius: 6px;"></textarea>
      <button type="button" data-fb="send" style="display:none; margin-top: 0.5rem; font: inherit; padding: 0.4rem 0.8rem; background: var(--slate, #475569); color: #fff; border: none; border-radius: 6px; cursor: pointer;">Send</button>
    `;
    main.appendChild(wrap);

    let chosen = null;
    const status = wrap.querySelector('.fb-status');
    const note = wrap.querySelector('[data-fb="note"]');
    const sendBtn = wrap.querySelector('[data-fb="send"]');

    wrap.querySelectorAll('[data-fb="up"], [data-fb="down"]').forEach(btn => {
      btn.addEventListener('click', () => {
        chosen = btn.getAttribute('data-fb');
        status.textContent = 'Thanks. Want to add a note?';
        note.style.display = 'block';
        sendBtn.style.display = 'inline-block';
        // Send the bare yes/no immediately so we capture even silent thumbs.
        send(chosen, '');
      });
    });

    sendBtn.addEventListener('click', () => {
      send(chosen, note.value.trim());
      status.textContent = 'Sent. Thanks.';
      note.disabled = true;
      sendBtn.disabled = true;
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
