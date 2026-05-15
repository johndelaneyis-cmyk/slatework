// Country pack loader. Used by every country-aware tool page.
// Exposes window.Slatework.loadCountry(code) returning the parsed pack.
// Caches per-code in memory for the lifetime of the page.

(() => {
  const SUPPORTED = ['us', 'gb', 'ca', 'au', 'nz', 'ie', 'hk'];
  const cache = new Map();

  async function loadCountry(code) {
    const lower = String(code || '').toLowerCase();
    if (!SUPPORTED.includes(lower)) {
      throw new Error('Unsupported country code: ' + code);
    }
    if (cache.has(lower)) return cache.get(lower);
    // Bust browser cache when platform-fee data changes (2026-05-15 update).
    // force-cache is fine within a deploy; the ?v= query string makes the URL
    // unique per data revision so we don't serve stale fees from CDN/browser.
    const r = await fetch('/data/countries/' + lower + '.json?v=2026-05-15-5', { cache: 'force-cache' });
    if (!r.ok) throw new Error('Country pack fetch failed: ' + r.status);
    const pack = await r.json();
    cache.set(lower, pack);
    return pack;
  }

  function listCountries() {
    return [
      { code: 'US', name: 'United States' },
      { code: 'GB', name: 'United Kingdom' },
      { code: 'CA', name: 'Canada' },
      { code: 'AU', name: 'Australia' },
      { code: 'NZ', name: 'New Zealand' },
      { code: 'IE', name: 'Ireland' },
      { code: 'HK', name: 'Hong Kong' }
    ];
  }

  function languagePairs() {
    return [
      { code: 'en-en', label: 'English only (test prep, writing, ESL advanced)' },
      { code: 'en-es', label: 'English — Spanish' },
      { code: 'en-fr', label: 'English — French' },
      { code: 'en-de', label: 'English — German' },
      { code: 'en-it', label: 'English — Italian' },
      { code: 'en-pt', label: 'English — Portuguese' },
      { code: 'en-ru', label: 'English — Russian' },
      { code: 'en-zh', label: 'English — Mandarin' },
      { code: 'en-yue', label: 'English — Cantonese' },
      { code: 'en-ja', label: 'English — Japanese' },
      { code: 'en-ko', label: 'English — Korean' },
      { code: 'en-ar', label: 'English — Arabic' },
      { code: 'es-en', label: 'Spanish — English' },
      { code: 'fr-en', label: 'French — English' },
      { code: 'ga-en', label: 'Irish — English' },
      { code: 'yue-zh', label: 'Cantonese — Mandarin' },
      { code: 'zh-yue', label: 'Mandarin — Cantonese' }
    ];
  }

  function targetLanguageList() {
    // Curated list of student-facing target languages, deduped from languagePairs.
    // Used by all "what language is the student learning?" dropdowns.
    return [
      { value: 'English',                 label: 'English' },
      { value: 'Spanish',                 label: 'Spanish' },
      { value: 'French',                  label: 'French' },
      { value: 'German',                  label: 'German' },
      { value: 'Italian',                 label: 'Italian' },
      { value: 'Portuguese',              label: 'Portuguese' },
      { value: 'Russian',                 label: 'Russian' },
      { value: 'Mandarin',                label: 'Mandarin (Chinese)' },
      { value: 'Cantonese',               label: 'Cantonese (Chinese)' },
      { value: 'Japanese',                label: 'Japanese' },
      { value: 'Korean',                  label: 'Korean' },
      { value: 'Arabic',                  label: 'Arabic' },
      { value: 'Irish',                   label: 'Irish (Gaeilge)' },
      { value: 'Latin',                   label: 'Latin' },
      { value: 'Te Reo Māori',            label: 'Te Reo Māori' },
      { value: 'Other',                   label: "Other — I'll type it" }
    ];
  }

  window.Slatework = window.Slatework || {};
  window.Slatework.loadCountry = loadCountry;
  window.Slatework.listCountries = listCountries;
  window.Slatework.languagePairs = languagePairs;
  window.Slatework.targetLanguageList = targetLanguageList;
})();