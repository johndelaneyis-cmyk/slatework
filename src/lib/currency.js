// Currency formatting + FX utilities.
// FX rates fetched from /api/fx (cached daily in KV).
// Falls back to a static rate table if the API is unreachable, with a warning.

(() => {
  // Last-known fallback rates (USD = 1.0). Refreshed manually with each
  // significant FX shift; live rates take precedence at runtime.
  const FALLBACK_USD = {
    USD: 1.0, GBP: 0.79, EUR: 0.92, CAD: 1.37, AUD: 1.52,
    NZD: 1.66, HKD: 7.78
  };

  let livePromise = null;

  function loadLive() {
    if (livePromise) return livePromise;
    livePromise = fetch('/api/fx', { cache: 'force-cache' })
      .then(r => r.ok ? r.json() : null)
      .catch(() => null);
    return livePromise;
  }

  async function rates() {
    const live = await loadLive();
    if (live && live.rates) return { rates: live.rates, asOf: live.asOf, source: 'live' };
    return { rates: FALLBACK_USD, asOf: 'fallback', source: 'fallback' };
  }

  async function convert(amount, fromCcy, toCcy) {
    const r = await rates();
    const from = r.rates[fromCcy];
    const to = r.rates[toCcy];
    if (!from || !to) return null;
    return amount * (to / from);
  }

  function format(amount, ccy, locale) {
    if (amount == null || isNaN(amount)) return '';
    try {
      return new Intl.NumberFormat(locale || 'en-US', {
        style: 'currency', currency: ccy, maximumFractionDigits: 0
      }).format(amount);
    } catch {
      return ccy + ' ' + Math.round(amount).toLocaleString();
    }
  }

  window.Slatework = window.Slatework || {};
  window.Slatework.rates = rates;
  window.Slatework.convert = convert;
  window.Slatework.formatCurrency = format;
})();