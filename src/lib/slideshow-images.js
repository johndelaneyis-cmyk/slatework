// src/lib/slideshow-images.js
// Slatework.SlideshowImages.resolve({keyword, audience}) — return an image
// URL (or null) for a slide keyword based on audience profile.
//
//   - young_learner: lookup in /assets/illustrations/young-learner/manifest.json
//   - teen / adult:  call /api/pexels with the keyword (server-side proxy)
//   - exam_prep:     return null (caller already gates by density)
//
// Returns { href, alt, attribution } or null. Never throws — a missing
// image must never break the deck.

(() => {
  'use strict';

  const SW = (window.Slatework = window.Slatework || {});
  const Images = (SW.SlideshowImages = SW.SlideshowImages || {});

  let manifestPromise = null;
  function loadManifest() {
    if (!manifestPromise) {
      manifestPromise = fetch('/assets/illustrations/young-learner/manifest.json', {
        cache: 'force-cache'
      })
        .then((r) => (r.ok ? r.json() : { illustrations: [] }))
        .catch(() => ({ illustrations: [] }));
    }
    return manifestPromise;
  }

  // Cache Pexels lookups within the page so re-rendering the same audience
  // doesn't burn the per-IP daily quota.
  const pexelsCache = new Map();

  async function lookupPexels(keyword) {
    if (pexelsCache.has(keyword)) return pexelsCache.get(keyword);
    const p = (async () => {
      try {
        const r = await fetch('/api/pexels?q=' + encodeURIComponent(keyword) + '&per_page=1');
        if (!r.ok) return null;
        const data = await r.json().catch(() => null);
        const photo = data && data.photos && data.photos[0];
        if (!photo || !photo.src) return null;
        return {
          href: photo.src,
          alt: photo.alt || keyword,
          attribution: photo.photographer
            ? 'Photo by ' + photo.photographer + ' on Pexels'
            : 'Photo by Pexels'
        };
      } catch {
        return null;
      }
    })();
    pexelsCache.set(keyword, p);
    return p;
  }

  function matchManifest(manifest, keyword) {
    const k = String(keyword || '').toLowerCase().trim();
    if (!k) return null;
    const list = (manifest && manifest.illustrations) || [];
    // Prefer exact keyword match, then substring match.
    let hit = list.find((e) => e.keywords && e.keywords.includes(k));
    if (!hit) {
      hit = list.find((e) => e.keywords && e.keywords.some((x) => x.includes(k) || k.includes(x)));
    }
    return hit || null;
  }

  Images.resolve = async function resolve({ keyword, audience }) {
    if (!keyword) return null;
    if (audience === 'young_learner') {
      const manifest = await loadManifest();
      const hit = matchManifest(manifest, keyword);
      if (!hit) return null;
      return {
        href: '/assets/illustrations/young-learner/' + hit.file,
        alt: (hit.keywords && hit.keywords[0]) || keyword,
        attribution: 'Illustrations by Storyset'
      };
    }
    if (audience === 'teen' || audience === 'adult') {
      return lookupPexels(keyword);
    }
    // exam_prep: caller already gates by density, but defend anyway.
    return null;
  };

  // Tutor swap-out: lets the renderer hand off to the file-extract drop UI.
  // Reuses the existing pattern from src/lib/file-extract.js. Image blobs
  // are converted to object URLs and revoked on the next swap.
  Images.swapHandler = function swapHandler(slideEl, onPicked) {
    const drop = document.createElement('div');
    drop.className = 'slideshow-swap-drop';
    drop.tabIndex = 0;
    drop.textContent = 'Drop an image here, or click to pick a file.';
    const media = slideEl.querySelector('.slideshow-slide-media');
    if (media) media.appendChild(drop);
    if (typeof SW.attachFileDrop === 'function') {
      SW.attachFileDrop({
        zone: drop,
        accept: 'image/*',
        imageHandler: ({ blob }) => {
          const url = URL.createObjectURL(blob);
          if (typeof onPicked === 'function') {
            onPicked({ href: url, alt: 'tutor-supplied image', attribution: '' });
          }
        }
      });
    }
  };
})();
