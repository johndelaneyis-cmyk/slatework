# Slatework MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship slatework.tools — a free privacy-first toolkit website for independent language tutors with 10 tools across 7 countries, mirroring the Authorly Cloudflare Pages stack.

**Architecture:** Static HTML pages on Cloudflare Pages, one HTML file per tool. Country-aware tools read from JSON country packs at runtime. Three LLM-backed tools (marketing copy, lesson plan, CEFR AI mode) call Cloudflare Pages Functions that proxy to Anthropic Claude with KV-backed rate limiting. No build step, no framework, no package.json — same pattern as Authorly.

**Tech Stack:**
- **Hosting:** Cloudflare Pages (static + Pages Functions)
- **Frontend:** Vanilla HTML/CSS/JS, embedded styles + scripts
- **API:** Pages Functions in `functions/api/*.js`, plus `functions/_middleware.js`
- **LLM:** Anthropic Claude API (`claude-haiku-4-5` for high-volume, `claude-sonnet-4-6` for quality-sensitive)
- **Rate limiting:** Cloudflare KV namespace `RATE_LIMITS` (per-IP daily + global daily, mirroring Authorly's `bio.js` pattern)
- **Newsletter:** Buttondown REST API (`functions/api/newsletter.js`)
- **FX rates:** ExchangeRate-API free tier, daily-cached in KV namespace `FX_CACHE`
- **Analytics:** Cloudflare Web Analytics
- **Testing:** Playwright Python QA script (mirror `authorly/.claude/qa.py`); browser-runnable JS asserts for utility logic; integration tests for Pages Functions via `wrangler pages dev`
- **Domain:** `slatework.tools` (primary)

**Reference patterns:** This plan mirrors `C:\Users\darre\authorly`. When a step says "match Authorly pattern", read the cited Authorly file first to confirm current convention.

---

## File Structure

```
slatework/
├── README.md                  # exists
├── .gitignore                 # exists
├── .nojekyll                  # Phase 0
├── _headers                   # Phase 0 (Cloudflare HTTP headers + CSP)
├── favicon.svg                # Phase 0
├── og.png                     # Phase 4
├── og.svg                     # Phase 4
├── robots.txt                 # Phase 4
├── sitemap.xml                # Phase 4
├── feedback.js                # Phase 3 (shared widget, mirror Authorly)
│
├── index.html                 # Phase 1 — Homepage
├── privacy.html               # Phase 1
├── terms.html                 # Phase 1
├── 404.html                   # Phase 1
│
├── setup.html                 # Phase 1 — Tool 1: Start tutoring privately
├── tax.html                   # Phase 1 — Tool 2: Tax & self-employment
├── insurance.html             # Phase 1 — Tool 3: Insurance & safeguarding
├── rates.html                 # Phase 1 — Tool 4: Hourly rate calc + multi-platform comparison
├── payments.html              # Phase 1 — Tool 5: Payment methods per country
├── contract.html              # Phase 1 — Tool 6: Parent-tutor contract builder
├── lesson-plan.html           # Phase 2 — Tool 7: Lesson plan generator (LLM)
├── cefr.html                  # Phase 1+2 — Tool 8: CEFR mapper (rule-based + AI mode)
├── worksheet.html             # Phase 2 — Tool 9: Worksheet + answer-key generator (LLM)
├── marking.html               # Phase 2 — Tool 10: Marking accelerator (LLM)
├── about.html                 # Phase 3 — About page (with anonymous dedication)
│
├── data/
│   ├── countries/
│   │   ├── us.json            # Phase 0
│   │   ├── gb.json            # Phase 0
│   │   ├── ca.json            # Phase 0
│   │   ├── au.json            # Phase 0
│   │   ├── nz.json            # Phase 0
│   │   ├── ie.json            # Phase 0
│   │   └── hk.json            # Phase 0
│   └── schema/
│       └── country.schema.json   # Phase 0
│
├── lib/
│   ├── countries.js           # Phase 0 — country pack loader
│   ├── currency.js            # Phase 0 — FX cache + format
│   ├── cefr-rules.js          # Phase 1 — rule-based CEFR placement
│   └── pdf.js                 # Phase 1 — client-side PDF for contract
│
├── functions/
│   ├── _middleware.js         # Phase 2 — rate limiting, CORS, error wrap
│   └── api/
│       ├── lesson-plan.js     # Phase 2 (Tool 7)
│       ├── cefr-assess.js     # Phase 2 (Tool 8 AI mode)
│       ├── worksheet.js       # Phase 2 (Tool 9)
│       ├── marking.js         # Phase 2 (Tool 10)
│       ├── newsletter.js      # Phase 3
│       └── fx.js              # Phase 0 (cron-callable + manual refresh)
│
├── tests/
│   ├── unit.html              # Phase 0 — browser-runnable JS asserts
│   ├── api.test.sh            # Phase 2 — curl-driven Pages Functions tests
│   └── qa.py                  # Phase 4 — Playwright QA, mirror Authorly
│
└── docs/
    └── superpowers/
        ├── specs/2026-05-06-slatework-design.md   # exists
        └── plans/2026-05-06-slatework-mvp.md       # this file
```

---

## Phase 0 — Foundation

Phases run sequentially. Each task's commit message uses the prefix `feat(p0)`, `feat(p1)`, etc.

### Task 0.1: Bootstrap static-site essentials

**Files:**
- Create: `slatework/.nojekyll`
- Create: `slatework/_headers`
- Create: `slatework/favicon.svg`

- [ ] **Step 1: Create `.nojekyll`**

```bash
touch /c/Users/darre/slatework/.nojekyll
```

- [ ] **Step 2: Create `_headers` (mirror Authorly's pattern, swap CSP allow-list as needed)**

Path: `slatework/_headers`

```
/*
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self' https://cloudflareinsights.com https://static.cloudflareinsights.com https://api.exchangerate-api.com; img-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'
  X-Permitted-Cross-Domain-Policies: none
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin

/
  Cache-Control: public, max-age=300, stale-while-revalidate=3600
/*.html
  Cache-Control: public, max-age=300, stale-while-revalidate=3600

/favicon.svg
  Cache-Control: public, max-age=86400, stale-while-revalidate=604800
/og.svg
  Cache-Control: public, max-age=86400, stale-while-revalidate=604800
/og.png
  Cache-Control: public, max-age=86400, stale-while-revalidate=604800
/feedback.js
  Cache-Control: public, max-age=3600, stale-while-revalidate=86400
/data/countries/*
  Cache-Control: public, max-age=3600, stale-while-revalidate=86400
/lib/*
  Cache-Control: public, max-age=86400, stale-while-revalidate=604800
/robots.txt
  Cache-Control: public, max-age=3600
/sitemap.xml
  Cache-Control: public, max-age=3600
```

- [ ] **Step 3: Create `favicon.svg` (slate-frame icon)**

Path: `slatework/favicon.svg`

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect x="6" y="10" width="52" height="44" rx="6" ry="6" fill="#475569" stroke="#334155" stroke-width="2"/>
  <line x1="16" y1="22" x2="48" y2="22" stroke="#cbd5e1" stroke-width="1.6" stroke-linecap="round"/>
  <line x1="16" y1="32" x2="42" y2="32" stroke="#cbd5e1" stroke-width="1.6" stroke-linecap="round"/>
  <line x1="16" y1="42" x2="38" y2="42" stroke="#cbd5e1" stroke-width="1.6" stroke-linecap="round"/>
</svg>
```

- [ ] **Step 4: Verify files exist**

```bash
ls -la /c/Users/darre/slatework/.nojekyll /c/Users/darre/slatework/_headers /c/Users/darre/slatework/favicon.svg
```

Expected: three files listed, non-zero sizes for `_headers` and `favicon.svg`.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/darre/slatework && git add .nojekyll _headers favicon.svg && git commit -m "feat(p0): bootstrap static-site essentials (headers, CSP, favicon)"
```

---

### Task 0.2: Country pack JSON schema

**Files:**
- Create: `slatework/data/schema/country.schema.json`

- [ ] **Step 1: Write the schema**

Path: `slatework/data/schema/country.schema.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Slatework Country Pack",
  "type": "object",
  "required": [
    "code", "name", "currency", "currency_symbol", "locale_default",
    "platforms", "tax", "background_check", "rates_by_language_pair",
    "payment_methods", "insurance", "data_source_last_verified"
  ],
  "properties": {
    "code": { "type": "string", "pattern": "^[A-Z]{2}$" },
    "name": { "type": "string", "minLength": 2 },
    "currency": { "type": "string", "pattern": "^[A-Z]{3}$" },
    "currency_symbol": { "type": "string", "minLength": 1, "maxLength": 4 },
    "locale_default": { "type": "string", "pattern": "^[a-z]{2}-[A-Z]{2}$" },
    "platforms": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["key", "name", "fee_pct", "url", "available_in"],
        "properties": {
          "key": { "type": "string" },
          "name": { "type": "string" },
          "fee_pct": { "type": "number", "minimum": 0, "maximum": 50 },
          "fee_curve": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["after_hours", "fee_pct"],
              "properties": {
                "after_hours": { "type": "integer", "minimum": 0 },
                "fee_pct": { "type": "number", "minimum": 0, "maximum": 50 }
              }
            }
          },
          "url": { "type": "string", "format": "uri" },
          "available_in": { "type": "array", "items": { "type": "string", "pattern": "^[A-Z]{2}$" } }
        }
      }
    },
    "tax": {
      "type": "object",
      "required": ["self_employment_form", "self_employment_url", "registration_steps"],
      "properties": {
        "self_employment_form": { "type": "string" },
        "self_employment_url": { "type": "string", "format": "uri" },
        "trading_allowance_amount": { "type": "number", "minimum": 0 },
        "vat_threshold_amount": { "type": "number", "minimum": 0 },
        "income_tax_brackets": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["upper_bound_amount", "rate"],
            "properties": {
              "upper_bound_amount": { "type": "number" },
              "rate": { "type": "number", "minimum": 0, "maximum": 1 }
            }
          }
        },
        "registration_steps": { "type": "array", "items": { "type": "string" } },
        "notes": { "type": "string" }
      }
    },
    "background_check": {
      "type": "object",
      "required": ["name", "url"],
      "properties": {
        "name": { "type": "string" },
        "cost_amount": { "type": "number", "minimum": 0 },
        "url": { "type": "string", "format": "uri" },
        "notes": { "type": "string" }
      }
    },
    "rates_by_language_pair": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "required": ["low", "median", "high", "unit"],
        "properties": {
          "low": { "type": "number", "minimum": 0 },
          "median": { "type": "number", "minimum": 0 },
          "high": { "type": "number", "minimum": 0 },
          "unit": { "type": "string", "enum": ["per_hour"] }
        }
      }
    },
    "payment_methods": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["key", "name", "domestic", "international"],
        "properties": {
          "key": { "type": "string" },
          "name": { "type": "string" },
          "domestic": { "type": "boolean" },
          "international": { "type": "boolean" },
          "url": { "type": "string", "format": "uri" },
          "notes": { "type": "string" }
        }
      }
    },
    "insurance": {
      "type": "object",
      "properties": {
        "public_liability_typical_amount": { "type": "number", "minimum": 0 },
        "providers": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["name", "url"],
            "properties": {
              "name": { "type": "string" },
              "url": { "type": "string", "format": "uri" }
            }
          }
        },
        "notes": { "type": "string" }
      }
    },
    "data_source_last_verified": {
      "type": "string",
      "format": "date"
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd /c/Users/darre/slatework && git add data/schema/country.schema.json && git commit -m "feat(p0): country pack JSON schema"
```

---

### Task 0.3: Country packs (US + GB as full templates)

The next two countries are written in full as the canonical pattern. Tasks 0.4–0.5 follow the same structure for the remaining five countries; do not skip the per-country verification step.

**Files:**
- Create: `slatework/data/countries/us.json`
- Create: `slatework/data/countries/gb.json`

- [ ] **Step 1: Write `us.json`**

Path: `slatework/data/countries/us.json`

```json
{
  "code": "US",
  "name": "United States",
  "currency": "USD",
  "currency_symbol": "$",
  "locale_default": "en-US",
  "platforms": [
    { "key": "italki",  "name": "italki",  "fee_pct": 15,   "url": "https://www.italki.com",  "available_in": ["US","GB","CA","AU","NZ","IE","HK"] },
    { "key": "preply",  "name": "Preply",  "fee_pct": 33,
      "fee_curve": [
        { "after_hours": 0,    "fee_pct": 33 },
        { "after_hours": 20,   "fee_pct": 28 },
        { "after_hours": 50,   "fee_pct": 25 },
        { "after_hours": 200,  "fee_pct": 18 },
        { "after_hours": 400,  "fee_pct": 15 }
      ],
      "url": "https://preply.com", "available_in": ["US","GB","CA","AU","NZ","IE","HK"] },
    { "key": "wyzant",  "name": "Wyzant",  "fee_pct": 25,   "url": "https://www.wyzant.com",  "available_in": ["US"] },
    { "key": "cambly",  "name": "Cambly",  "fee_pct": 0,    "url": "https://www.cambly.com",  "available_in": ["US","GB","CA","AU","NZ","IE","HK"], "notes": "Pays tutors a fixed per-minute rate; not a commission model. ~$0.17/minute." },
    { "key": "verbling","name": "Verbling","fee_pct": 15,   "url": "https://www.verbling.com","available_in": ["US","GB","CA","AU","NZ","IE","HK"] }
  ],
  "tax": {
    "self_employment_form": "Schedule C (Form 1040) + Schedule SE",
    "self_employment_url": "https://www.irs.gov/forms-pubs/about-schedule-c-form-1040",
    "registration_steps": [
      "No federal registration is required to start as a sole proprietor — your SSN is your tax ID by default.",
      "Apply for a free EIN at irs.gov to use instead of your SSN on client invoices.",
      "Check your state for a sales-tax requirement; tutoring services are exempt in most states but verify with your state revenue department.",
      "If gross income exceeds $400/year, file Schedule SE for self-employment tax (Social Security + Medicare).",
      "Pay estimated federal tax quarterly via Form 1040-ES if you expect to owe $1,000+.",
      "Track every business expense — mileage, materials, home-office %, software, professional development."
    ],
    "notes": "Form 1099-K thresholds dropped to $5,000 for tax year 2026. Platform earnings above that get reported to IRS automatically.",
    "vat_threshold_amount": 0,
    "trading_allowance_amount": 0
  },
  "background_check": {
    "name": "State + national background check (Sterling, Checkr, GoodHire — varies by client)",
    "url": "https://www.fbi.gov/services/cjis/identity-history-summary-checks",
    "cost_amount": 25,
    "notes": "Not legally required for private tutors in most US states, but parents of minors increasingly request one. FBI Identity History Summary is the gold standard at ~$18; commercial services run $25–$70."
  },
  "rates_by_language_pair": {
    "en-es": { "low": 25, "median": 50, "high": 120, "unit": "per_hour" },
    "en-fr": { "low": 30, "median": 55, "high": 130, "unit": "per_hour" },
    "en-de": { "low": 30, "median": 55, "high": 130, "unit": "per_hour" },
    "en-zh": { "low": 35, "median": 65, "high": 150, "unit": "per_hour" },
    "en-ja": { "low": 40, "median": 70, "high": 160, "unit": "per_hour" },
    "en-ko": { "low": 40, "median": 70, "high": 160, "unit": "per_hour" },
    "en-it": { "low": 30, "median": 55, "high": 120, "unit": "per_hour" },
    "en-pt": { "low": 25, "median": 50, "high": 110, "unit": "per_hour" },
    "en-ru": { "low": 30, "median": 50, "high": 110, "unit": "per_hour" },
    "en-ar": { "low": 35, "median": 60, "high": 140, "unit": "per_hour" },
    "es-en": { "low": 25, "median": 45, "high": 100, "unit": "per_hour" },
    "fr-en": { "low": 25, "median": 45, "high": 100, "unit": "per_hour" }
  },
  "payment_methods": [
    { "key": "zelle",       "name": "Zelle",         "domestic": true,  "international": false, "url": "https://www.zellepay.com",       "notes": "Free, instant; bank-to-bank within US. No platform fee." },
    { "key": "venmo",       "name": "Venmo",         "domestic": true,  "international": false, "url": "https://venmo.com",              "notes": "Free for personal; 1.9%+$0.10 for goods/services tag." },
    { "key": "cashapp",     "name": "Cash App",      "domestic": true,  "international": false, "url": "https://cash.app",                "notes": "Free for personal." },
    { "key": "stripe_link", "name": "Stripe Link",   "domestic": true,  "international": true,  "url": "https://link.com",                "notes": "2.9%+$0.30 per transaction; supports cards." },
    { "key": "wise",        "name": "Wise",          "domestic": true,  "international": true,  "url": "https://wise.com",                "notes": "Mid-market FX; ideal for international clients." },
    { "key": "ach",         "name": "ACH bank transfer", "domestic": true, "international": false, "notes": "Manual but free; 1–3 business days." },
    { "key": "cash",        "name": "Cash",          "domestic": true,  "international": false, "notes": "In-person only. Issue a written receipt for record-keeping." }
  ],
  "insurance": {
    "public_liability_typical_amount": 1000000,
    "providers": [
      { "name": "Hiscox",        "url": "https://www.hiscox.com/small-business-insurance/professional-liability-insurance" },
      { "name": "Next Insurance","url": "https://www.nextinsurance.com" },
      { "name": "Thimble",       "url": "https://www.thimble.com" }
    ],
    "notes": "Tutors teaching minors privately should consider $1M general-liability + professional indemnity. ~$25–$60/month."
  },
  "data_source_last_verified": "2026-05-06"
}
```

- [ ] **Step 2: Write `gb.json`**

Path: `slatework/data/countries/gb.json`

```json
{
  "code": "GB",
  "name": "United Kingdom",
  "currency": "GBP",
  "currency_symbol": "£",
  "locale_default": "en-GB",
  "platforms": [
    { "key": "italki",  "name": "italki",  "fee_pct": 15,   "url": "https://www.italki.com",  "available_in": ["US","GB","CA","AU","NZ","IE","HK"] },
    { "key": "preply",  "name": "Preply",  "fee_pct": 33,
      "fee_curve": [
        { "after_hours": 0,    "fee_pct": 33 },
        { "after_hours": 20,   "fee_pct": 28 },
        { "after_hours": 50,   "fee_pct": 25 },
        { "after_hours": 200,  "fee_pct": 18 },
        { "after_hours": 400,  "fee_pct": 15 }
      ],
      "url": "https://preply.com", "available_in": ["US","GB","CA","AU","NZ","IE","HK"] },
    { "key": "tutorful","name": "Tutorful","fee_pct": 12.5, "url": "https://tutorful.co.uk", "available_in": ["GB","IE"] },
    { "key": "mytutor","name": "MyTutor",  "fee_pct": 25,   "url": "https://www.mytutor.co.uk","available_in": ["GB"] },
    { "key": "tutorhouse","name":"Tutor House","fee_pct":20,"url": "https://tutorhouse.co.uk","available_in":["GB"] },
    { "key": "cambly", "name": "Cambly",   "fee_pct": 0,    "url": "https://www.cambly.com",  "available_in": ["US","GB","CA","AU","NZ","IE","HK"], "notes": "Per-minute rate, not commission." }
  ],
  "tax": {
    "self_employment_form": "SA103 (Self Assessment Self-Employment supplementary page)",
    "self_employment_url": "https://www.gov.uk/self-employed-records",
    "trading_allowance_amount": 1000,
    "vat_threshold_amount": 90000,
    "income_tax_brackets": [
      { "upper_bound_amount": 12570,  "rate": 0.0  },
      { "upper_bound_amount": 50270,  "rate": 0.20 },
      { "upper_bound_amount": 125140, "rate": 0.40 },
      { "upper_bound_amount": null,   "rate": 0.45 }
    ],
    "registration_steps": [
      "Register for Self Assessment with HMRC at gov.uk/log-in-file-self-assessment-tax-return — must be done by 5 October following your first tax year of trading.",
      "If turnover is under £1,000/year, the Trading Allowance covers it — no need to file.",
      "Above £1,000, file an SA100 + SA103 by 31 January (online) or 31 October (paper).",
      "Pay Class 2 NI (£3.45/week if profits > £6,725) and Class 4 NI (9% on profits £12,570–£50,270, 2% above).",
      "Register for VAT only if turnover exceeds £90,000 — most tutors stay well below this."
    ],
    "notes": "DBS check required for tutoring minors in some authorities. Keep all records 5 years past the 31 January submission deadline."
  },
  "background_check": {
    "name": "DBS (Disclosure and Barring Service) — Enhanced for working with children",
    "url": "https://www.gov.uk/dbs-check-applicant-criminal-record",
    "cost_amount": 38,
    "notes": "Enhanced DBS is £38 (free for volunteers). Most parents of minors will ask to see one. Update Service costs £13/year for portability."
  },
  "rates_by_language_pair": {
    "en-es": { "low": 18, "median": 32, "high": 60,  "unit": "per_hour" },
    "en-fr": { "low": 20, "median": 35, "high": 65,  "unit": "per_hour" },
    "en-de": { "low": 22, "median": 38, "high": 70,  "unit": "per_hour" },
    "en-zh": { "low": 25, "median": 45, "high": 90,  "unit": "per_hour" },
    "en-ja": { "low": 28, "median": 48, "high": 95,  "unit": "per_hour" },
    "en-ko": { "low": 28, "median": 48, "high": 95,  "unit": "per_hour" },
    "en-it": { "low": 20, "median": 35, "high": 65,  "unit": "per_hour" },
    "en-pt": { "low": 18, "median": 32, "high": 60,  "unit": "per_hour" },
    "en-ru": { "low": 20, "median": 32, "high": 60,  "unit": "per_hour" },
    "en-ar": { "low": 25, "median": 42, "high": 80,  "unit": "per_hour" },
    "es-en": { "low": 18, "median": 30, "high": 55,  "unit": "per_hour" },
    "fr-en": { "low": 18, "median": 30, "high": 55,  "unit": "per_hour" }
  },
  "payment_methods": [
    { "key": "faster_payments","name": "Faster Payments",  "domestic": true,  "international": false, "notes": "Free, near-instant UK bank transfer. Default for most tutors." },
    { "key": "wise",          "name": "Wise",              "domestic": true,  "international": true,  "url": "https://wise.com",          "notes": "Mid-market FX; ideal for non-UK clients." },
    { "key": "stripe_link",   "name": "Stripe Link",       "domestic": true,  "international": true,  "url": "https://link.com",            "notes": "1.5%+£0.20 UK; 2.5%+£0.20 EEA cards." },
    { "key": "paypal",        "name": "PayPal",            "domestic": true,  "international": true,  "url": "https://www.paypal.com",     "notes": "Higher fees but trusted by older parents." },
    { "key": "go_cardless",   "name": "GoCardless",        "domestic": true,  "international": false, "url": "https://gocardless.com",     "notes": "Direct debit for recurring weekly lessons." },
    { "key": "cash",          "name": "Cash",              "domestic": true,  "international": false, "notes": "Issue a written receipt and log in your records." }
  ],
  "insurance": {
    "public_liability_typical_amount": 6000000,
    "providers": [
      { "name": "PolicyBee",  "url": "https://www.policybee.co.uk/private-tutors-insurance" },
      { "name": "Hiscox",     "url": "https://www.hiscox.co.uk/business-insurance/professional-indemnity-insurance" },
      { "name": "Simply Business","url": "https://www.simplybusiness.co.uk/insurance/tutor/" }
    ],
    "notes": "PolicyBee is the most tutor-specific UK provider. £6m public liability + £1m professional indemnity is typical at ~£8–£15/month."
  },
  "data_source_last_verified": "2026-05-06"
}
```

- [ ] **Step 3: Validate both files against the schema**

Run validation locally before commit. Use `ajv-cli` via npx (one-time, no project dependency):

```bash
cd /c/Users/darre/slatework && npx -y ajv-cli@5 validate -s data/schema/country.schema.json -d "data/countries/{us,gb}.json" --strict=false
```

Expected output: `data/countries/us.json valid` and `data/countries/gb.json valid`.

- [ ] **Step 4: Commit**

```bash
cd /c/Users/darre/slatework && git add data/countries/us.json data/countries/gb.json && git commit -m "feat(p0): country packs — US + UK with full schema coverage"
```

---

### Task 0.4: Country packs (CA + AU + NZ)

**Files:**
- Create: `slatework/data/countries/ca.json`
- Create: `slatework/data/countries/au.json`
- Create: `slatework/data/countries/nz.json`

These follow the same schema as US/GB. Each file is written in full — the implementer does not derive them by analogy.

- [ ] **Step 1: Write `ca.json`**

Path: `slatework/data/countries/ca.json`

```json
{
  "code": "CA",
  "name": "Canada",
  "currency": "CAD",
  "currency_symbol": "CA$",
  "locale_default": "en-CA",
  "platforms": [
    { "key": "italki", "name": "italki", "fee_pct": 15, "url": "https://www.italki.com", "available_in": ["US","GB","CA","AU","NZ","IE","HK"] },
    { "key": "preply", "name": "Preply", "fee_pct": 33,
      "fee_curve": [
        { "after_hours": 0, "fee_pct": 33 },
        { "after_hours": 20, "fee_pct": 28 },
        { "after_hours": 50, "fee_pct": 25 },
        { "after_hours": 200, "fee_pct": 18 },
        { "after_hours": 400, "fee_pct": 15 }
      ],
      "url": "https://preply.com", "available_in": ["US","GB","CA","AU","NZ","IE","HK"] },
    { "key": "tutorocean", "name": "TutorOcean", "fee_pct": 18, "url": "https://www.tutorocean.com", "available_in": ["CA","US"] },
    { "key": "verbling", "name": "Verbling", "fee_pct": 15, "url": "https://www.verbling.com", "available_in": ["US","GB","CA","AU","NZ","IE","HK"] },
    { "key": "cambly", "name": "Cambly", "fee_pct": 0, "url": "https://www.cambly.com", "available_in": ["US","GB","CA","AU","NZ","IE","HK"], "notes": "Per-minute rate, not commission." }
  ],
  "tax": {
    "self_employment_form": "T2125 (Statement of Business or Professional Activities)",
    "self_employment_url": "https://www.canada.ca/en/revenue-agency/services/forms-publications/forms/t2125.html",
    "vat_threshold_amount": 30000,
    "trading_allowance_amount": 0,
    "registration_steps": [
      "Register a sole proprietorship with your province (most provinces: $60–$80 one-time fee).",
      "If gross revenue exceeds CA$30,000 in any 12-month period, register for GST/HST with CRA — mandatory.",
      "Get a Business Number (BN) from CRA at canada.ca/business-number.",
      "File T2125 each year with your personal T1 return (deadline 30 April for most; 15 June if self-employed but balance owing still due 30 April).",
      "Pay quarterly tax instalments if net tax owing exceeds CA$3,000 in current or prior year.",
      "Province-level: Quebec runs its own tax system (Revenu Québec); register separately if QC-resident."
    ],
    "notes": "Tutoring is GST/HST-exempt in some provinces when delivered by a teacher to a student in a course leading to a credential — verify with your province before charging tax."
  },
  "background_check": {
    "name": "Vulnerable Sector Check (police-issued, required for tutoring minors in most provinces)",
    "url": "https://www.rcmp-grc.gc.ca/en/criminal-record-check",
    "cost_amount": 50,
    "notes": "Cost varies by police service ($25–$75). Most provinces require this for working with children."
  },
  "rates_by_language_pair": {
    "en-es": { "low": 25, "median": 45, "high": 90, "unit": "per_hour" },
    "en-fr": { "low": 28, "median": 50, "high": 100, "unit": "per_hour" },
    "en-de": { "low": 30, "median": 50, "high": 100, "unit": "per_hour" },
    "en-zh": { "low": 30, "median": 55, "high": 120, "unit": "per_hour" },
    "en-ja": { "low": 35, "median": 60, "high": 130, "unit": "per_hour" },
    "en-ko": { "low": 35, "median": 60, "high": 130, "unit": "per_hour" },
    "en-it": { "low": 28, "median": 48, "high": 95, "unit": "per_hour" },
    "en-pt": { "low": 25, "median": 45, "high": 90, "unit": "per_hour" },
    "en-ru": { "low": 28, "median": 48, "high": 95, "unit": "per_hour" },
    "en-ar": { "low": 32, "median": 55, "high": 110, "unit": "per_hour" },
    "fr-en": { "low": 28, "median": 48, "high": 95, "unit": "per_hour" },
    "es-en": { "low": 25, "median": 45, "high": 90, "unit": "per_hour" }
  },
  "payment_methods": [
    { "key": "interac_etransfer", "name": "Interac e-Transfer", "domestic": true, "international": false, "notes": "Free or low-cost, near-instant Canadian bank-to-bank. Default for most tutors." },
    { "key": "wise", "name": "Wise", "domestic": true, "international": true, "url": "https://wise.com", "notes": "Mid-market FX." },
    { "key": "stripe_link", "name": "Stripe Link", "domestic": true, "international": true, "url": "https://link.com", "notes": "2.9%+CA$0.30 cards." },
    { "key": "paypal", "name": "PayPal", "domestic": true, "international": true, "url": "https://www.paypal.com" },
    { "key": "cash", "name": "Cash", "domestic": true, "international": false }
  ],
  "insurance": {
    "public_liability_typical_amount": 2000000,
    "providers": [
      { "name": "Front Row Insurance", "url": "https://frontrowinsurance.com" },
      { "name": "Zensurance", "url": "https://www.zensurance.com" },
      { "name": "TruShield", "url": "https://www.trushieldinsurance.ca" }
    ],
    "notes": "CA$2M general liability + CA$1M professional liability is typical for private tutors. ~CA$30–$60/month."
  },
  "data_source_last_verified": "2026-05-06"
}
```

- [ ] **Step 2: Write `au.json`**

Path: `slatework/data/countries/au.json`

```json
{
  "code": "AU",
  "name": "Australia",
  "currency": "AUD",
  "currency_symbol": "A$",
  "locale_default": "en-AU",
  "platforms": [
    { "key": "italki", "name": "italki", "fee_pct": 15, "url": "https://www.italki.com", "available_in": ["US","GB","CA","AU","NZ","IE","HK"] },
    { "key": "preply", "name": "Preply", "fee_pct": 33,
      "fee_curve": [
        { "after_hours": 0, "fee_pct": 33 },
        { "after_hours": 20, "fee_pct": 28 },
        { "after_hours": 50, "fee_pct": 25 },
        { "after_hours": 200, "fee_pct": 18 },
        { "after_hours": 400, "fee_pct": 15 }
      ],
      "url": "https://preply.com", "available_in": ["US","GB","CA","AU","NZ","IE","HK"] },
    { "key": "lessonspace", "name": "LessonSpace (was StudyHall)", "fee_pct": 20, "url": "https://www.thelessonspace.com", "available_in": ["AU","NZ"] },
    { "key": "cluey", "name": "Cluey Learning", "fee_pct": 30, "url": "https://clueylearning.com.au", "available_in": ["AU"] },
    { "key": "verbling", "name": "Verbling", "fee_pct": 15, "url": "https://www.verbling.com", "available_in": ["US","GB","CA","AU","NZ","IE","HK"] },
    { "key": "cambly", "name": "Cambly", "fee_pct": 0, "url": "https://www.cambly.com", "available_in": ["US","GB","CA","AU","NZ","IE","HK"], "notes": "Per-minute rate, not commission." }
  ],
  "tax": {
    "self_employment_form": "Individual tax return + Business and Professional Items schedule",
    "self_employment_url": "https://www.ato.gov.au/businesses-and-organisations/income-deductions-and-concessions/income-and-deductions-for-business",
    "vat_threshold_amount": 75000,
    "trading_allowance_amount": 0,
    "registration_steps": [
      "Apply for an Australian Business Number (ABN) at abr.gov.au — free, takes minutes.",
      "If projected gross income exceeds A$75,000/year, register for GST.",
      "Register a business name with ASIC if trading under anything other than your personal name (~A$42 for 1 year).",
      "Lodge an annual income tax return through myTax or via a registered agent — deadline 31 October.",
      "Pay PAYG instalments quarterly if ATO assigns you to instalment scheme.",
      "Each state has Working With Children Check — required before tutoring minors."
    ],
    "notes": "Tutoring services are typically GST-free if you're a recognised education provider; check the ATO ruling for your specific service before charging GST."
  },
  "background_check": {
    "name": "Working with Children Check (state-issued; called WWCC, WWVP, or Blue Card depending on state)",
    "url": "https://www.workingwithchildren.gov.au",
    "cost_amount": 0,
    "notes": "Free in most states for paid workers; free for volunteers everywhere. NSW WWCC is free for tutoring; QLD Blue Card $107.20 for paid; VIC WWC free for volunteer, $134 for employee."
  },
  "rates_by_language_pair": {
    "en-es": { "low": 35, "median": 60, "high": 110, "unit": "per_hour" },
    "en-fr": { "low": 40, "median": 65, "high": 115, "unit": "per_hour" },
    "en-de": { "low": 40, "median": 65, "high": 115, "unit": "per_hour" },
    "en-zh": { "low": 45, "median": 75, "high": 140, "unit": "per_hour" },
    "en-ja": { "low": 50, "median": 80, "high": 150, "unit": "per_hour" },
    "en-ko": { "low": 50, "median": 80, "high": 150, "unit": "per_hour" },
    "en-it": { "low": 40, "median": 65, "high": 115, "unit": "per_hour" },
    "en-pt": { "low": 35, "median": 60, "high": 110, "unit": "per_hour" },
    "en-ru": { "low": 40, "median": 60, "high": 110, "unit": "per_hour" },
    "en-ar": { "low": 45, "median": 70, "high": 130, "unit": "per_hour" },
    "es-en": { "low": 35, "median": 55, "high": 100, "unit": "per_hour" },
    "fr-en": { "low": 35, "median": 55, "high": 100, "unit": "per_hour" }
  },
  "payment_methods": [
    { "key": "payid", "name": "PayID / Osko", "domestic": true, "international": false, "notes": "Free, instant AU bank-to-bank. Default for most tutors." },
    { "key": "bank_transfer", "name": "Bank transfer (BSB+account)", "domestic": true, "international": false, "notes": "Free, 0–1 business day." },
    { "key": "wise", "name": "Wise", "domestic": true, "international": true, "url": "https://wise.com" },
    { "key": "stripe_link", "name": "Stripe Link", "domestic": true, "international": true, "url": "https://link.com", "notes": "1.7%+A$0.30 AU cards." },
    { "key": "paypal", "name": "PayPal", "domestic": true, "international": true, "url": "https://www.paypal.com" },
    { "key": "cash", "name": "Cash", "domestic": true, "international": false }
  ],
  "insurance": {
    "public_liability_typical_amount": 20000000,
    "providers": [
      { "name": "BizCover", "url": "https://www.bizcover.com.au" },
      { "name": "AAMI Business", "url": "https://www.aami.com.au/business-insurance.html" },
      { "name": "Public Liability Australia", "url": "https://www.publicliability.com.au" }
    ],
    "notes": "A$20M public liability is standard in AU for private tutors. ~A$300–$500/year."
  },
  "data_source_last_verified": "2026-05-06"
}
```

- [ ] **Step 3: Write `nz.json`**

Path: `slatework/data/countries/nz.json`

```json
{
  "code": "NZ",
  "name": "New Zealand",
  "currency": "NZD",
  "currency_symbol": "NZ$",
  "locale_default": "en-NZ",
  "platforms": [
    { "key": "italki", "name": "italki", "fee_pct": 15, "url": "https://www.italki.com", "available_in": ["US","GB","CA","AU","NZ","IE","HK"] },
    { "key": "preply", "name": "Preply", "fee_pct": 33,
      "fee_curve": [
        { "after_hours": 0, "fee_pct": 33 },
        { "after_hours": 20, "fee_pct": 28 },
        { "after_hours": 50, "fee_pct": 25 },
        { "after_hours": 200, "fee_pct": 18 },
        { "after_hours": 400, "fee_pct": 15 }
      ],
      "url": "https://preply.com", "available_in": ["US","GB","CA","AU","NZ","IE","HK"] },
    { "key": "lessonspace", "name": "LessonSpace", "fee_pct": 20, "url": "https://www.thelessonspace.com", "available_in": ["AU","NZ"] },
    { "key": "verbling", "name": "Verbling", "fee_pct": 15, "url": "https://www.verbling.com", "available_in": ["US","GB","CA","AU","NZ","IE","HK"] },
    { "key": "cambly", "name": "Cambly", "fee_pct": 0, "url": "https://www.cambly.com", "available_in": ["US","GB","CA","AU","NZ","IE","HK"], "notes": "Per-minute rate." }
  ],
  "tax": {
    "self_employment_form": "IR3 (Individual income return) + IR3B (Self-employed income summary)",
    "self_employment_url": "https://www.ird.govt.nz/income-tax/income-tax-for-individuals/self-employed",
    "vat_threshold_amount": 60000,
    "trading_allowance_amount": 0,
    "registration_steps": [
      "Get an IRD number if you don't already have one (free at ird.govt.nz).",
      "If turnover exceeds NZ$60,000/year, register for GST — voluntary below that.",
      "File IR3 by 7 July each year covering 1 April–31 March; pay tax in three provisional instalments.",
      "Pay ACC levies (work-based + earner) — automatically calculated after first IR3 filing.",
      "Most private tutors are sole traders; no separate business registration required."
    ],
    "notes": "Tutoring is generally GST-exempt only if delivered through a registered education provider. Independent tutors charge GST above the threshold."
  },
  "background_check": {
    "name": "Police vetting (NZ Police-issued criminal record check)",
    "url": "https://www.police.govt.nz/advice-services/businesses-and-organisations/vetting-service",
    "cost_amount": 0,
    "notes": "Free for individuals applying directly, but most parents or schools request a vetted check via an approved organisation. Working safely with children is governed by the Children's Act 2014."
  },
  "rates_by_language_pair": {
    "en-es": { "low": 30, "median": 55, "high": 100, "unit": "per_hour" },
    "en-fr": { "low": 35, "median": 60, "high": 110, "unit": "per_hour" },
    "en-de": { "low": 35, "median": 60, "high": 110, "unit": "per_hour" },
    "en-zh": { "low": 40, "median": 70, "high": 130, "unit": "per_hour" },
    "en-ja": { "low": 45, "median": 75, "high": 140, "unit": "per_hour" },
    "en-ko": { "low": 45, "median": 75, "high": 140, "unit": "per_hour" },
    "en-it": { "low": 35, "median": 60, "high": 110, "unit": "per_hour" },
    "en-pt": { "low": 30, "median": 55, "high": 100, "unit": "per_hour" },
    "en-ru": { "low": 35, "median": 55, "high": 100, "unit": "per_hour" },
    "en-ar": { "low": 40, "median": 65, "high": 120, "unit": "per_hour" },
    "es-en": { "low": 30, "median": 50, "high": 95, "unit": "per_hour" },
    "fr-en": { "low": 30, "median": 50, "high": 95, "unit": "per_hour" }
  },
  "payment_methods": [
    { "key": "bank_transfer", "name": "Bank transfer (account-to-account)", "domestic": true, "international": false, "notes": "Free, 0–1 business day. Default for most NZ tutors." },
    { "key": "poli", "name": "POLi Pay", "domestic": true, "international": false, "url": "https://www.polipayments.com", "notes": "Bank-redirect payment for one-off lessons." },
    { "key": "wise", "name": "Wise", "domestic": true, "international": true, "url": "https://wise.com" },
    { "key": "stripe_link", "name": "Stripe Link", "domestic": true, "international": true, "url": "https://link.com", "notes": "2.9%+NZ$0.30 cards." },
    { "key": "paypal", "name": "PayPal", "domestic": true, "international": true, "url": "https://www.paypal.com" },
    { "key": "cash", "name": "Cash", "domestic": true, "international": false }
  ],
  "insurance": {
    "public_liability_typical_amount": 2000000,
    "providers": [
      { "name": "Vero", "url": "https://www.vero.co.nz/business-insurance" },
      { "name": "AMI Business", "url": "https://www.ami.co.nz/business" },
      { "name": "NZI", "url": "https://www.nzi.co.nz" }
    ],
    "notes": "NZ$2M public liability + NZ$1M professional indemnity is standard. ~NZ$300–$600/year."
  },
  "data_source_last_verified": "2026-05-06"
}
```

- [ ] **Step 4: Validate all three**

```bash
cd /c/Users/darre/slatework && npx -y ajv-cli@5 validate -s data/schema/country.schema.json -d "data/countries/{ca,au,nz}.json" --strict=false
```

Expected: three "valid" lines.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/darre/slatework && git add data/countries/ca.json data/countries/au.json data/countries/nz.json && git commit -m "feat(p0): country packs — CA, AU, NZ"
```

---

### Task 0.5: Country packs (IE + HK)

**Files:**
- Create: `slatework/data/countries/ie.json`
- Create: `slatework/data/countries/hk.json`

- [ ] **Step 1: Write `ie.json`**

Path: `slatework/data/countries/ie.json`

```json
{
  "code": "IE",
  "name": "Ireland",
  "currency": "EUR",
  "currency_symbol": "€",
  "locale_default": "en-IE",
  "platforms": [
    { "key": "italki", "name": "italki", "fee_pct": 15, "url": "https://www.italki.com", "available_in": ["US","GB","CA","AU","NZ","IE","HK"] },
    { "key": "preply", "name": "Preply", "fee_pct": 33,
      "fee_curve": [
        { "after_hours": 0, "fee_pct": 33 },
        { "after_hours": 20, "fee_pct": 28 },
        { "after_hours": 50, "fee_pct": 25 },
        { "after_hours": 200, "fee_pct": 18 },
        { "after_hours": 400, "fee_pct": 15 }
      ],
      "url": "https://preply.com", "available_in": ["US","GB","CA","AU","NZ","IE","HK"] },
    { "key": "tutorful", "name": "Tutorful", "fee_pct": 12.5, "url": "https://tutorful.co.uk", "available_in": ["GB","IE"] },
    { "key": "verbling", "name": "Verbling", "fee_pct": 15, "url": "https://www.verbling.com", "available_in": ["US","GB","CA","AU","NZ","IE","HK"] },
    { "key": "cambly", "name": "Cambly", "fee_pct": 0, "url": "https://www.cambly.com", "available_in": ["US","GB","CA","AU","NZ","IE","HK"], "notes": "Per-minute rate." }
  ],
  "tax": {
    "self_employment_form": "Form 11 (self-assessed) via ROS",
    "self_employment_url": "https://www.revenue.ie/en/self-assessment-and-self-employment/index.aspx",
    "vat_threshold_amount": 42500,
    "trading_allowance_amount": 5000,
    "registration_steps": [
      "Register for Income Tax with Revenue via ROS (Revenue Online Service) at ros.ie.",
      "If non-PAYE income exceeds €5,000/year, you must register as self-assessed.",
      "Register for VAT only if turnover exceeds €42,500 (services threshold — 2026).",
      "File Form 11 by 31 October each year (mid-November if filing through ROS).",
      "Pay preliminary tax and balance via ROS.",
      "USC (Universal Social Charge) and PRSI Class S apply on self-employment income."
    ],
    "notes": "Education services delivered by an approved provider are VAT-exempt; private tutoring is generally exempt — confirm with Revenue."
  },
  "background_check": {
    "name": "Garda Vetting (National Vetting Bureau)",
    "url": "https://vetting.garda.ie",
    "cost_amount": 0,
    "notes": "Free Garda Vetting is required for all roles working with children/vulnerable persons. Application is via a registered organisation; private tutors typically vet through a tutoring association or apply via a parent's school request."
  },
  "rates_by_language_pair": {
    "en-es": { "low": 22, "median": 38, "high": 70, "unit": "per_hour" },
    "en-fr": { "low": 25, "median": 42, "high": 75, "unit": "per_hour" },
    "en-de": { "low": 25, "median": 42, "high": 75, "unit": "per_hour" },
    "en-zh": { "low": 28, "median": 48, "high": 90, "unit": "per_hour" },
    "en-ja": { "low": 30, "median": 50, "high": 95, "unit": "per_hour" },
    "en-ko": { "low": 30, "median": 50, "high": 95, "unit": "per_hour" },
    "en-it": { "low": 22, "median": 38, "high": 70, "unit": "per_hour" },
    "en-pt": { "low": 22, "median": 38, "high": 70, "unit": "per_hour" },
    "en-ru": { "low": 25, "median": 38, "high": 70, "unit": "per_hour" },
    "en-ar": { "low": 28, "median": 45, "high": 85, "unit": "per_hour" },
    "ga-en": { "low": 25, "median": 40, "high": 70, "unit": "per_hour" },
    "es-en": { "low": 22, "median": 35, "high": 65, "unit": "per_hour" },
    "fr-en": { "low": 22, "median": 35, "high": 65, "unit": "per_hour" }
  },
  "payment_methods": [
    { "key": "sepa_instant", "name": "SEPA Instant Credit Transfer", "domestic": true, "international": true, "notes": "Free or low-cost across SEPA zone, near-instant." },
    { "key": "revolut", "name": "Revolut", "domestic": true, "international": true, "url": "https://www.revolut.com" },
    { "key": "wise", "name": "Wise", "domestic": true, "international": true, "url": "https://wise.com" },
    { "key": "stripe_link", "name": "Stripe Link", "domestic": true, "international": true, "url": "https://link.com", "notes": "1.5%+€0.25 EU cards." },
    { "key": "paypal", "name": "PayPal", "domestic": true, "international": true, "url": "https://www.paypal.com" },
    { "key": "cash", "name": "Cash", "domestic": true, "international": false }
  ],
  "insurance": {
    "public_liability_typical_amount": 6500000,
    "providers": [
      { "name": "Aviva Ireland", "url": "https://www.aviva.ie/business-insurance" },
      { "name": "AXA Ireland", "url": "https://www.axa.ie/business-insurance" },
      { "name": "Ironsure", "url": "https://www.ironsure.ie" }
    ],
    "notes": "€6.5M public liability is the Irish standard. ~€200–€400/year for private tutors."
  },
  "data_source_last_verified": "2026-05-06"
}
```

- [ ] **Step 2: Write `hk.json`**

Path: `slatework/data/countries/hk.json`

```json
{
  "code": "HK",
  "name": "Hong Kong",
  "currency": "HKD",
  "currency_symbol": "HK$",
  "locale_default": "en-HK",
  "platforms": [
    { "key": "italki", "name": "italki", "fee_pct": 15, "url": "https://www.italki.com", "available_in": ["US","GB","CA","AU","NZ","IE","HK"] },
    { "key": "preply", "name": "Preply", "fee_pct": 33,
      "fee_curve": [
        { "after_hours": 0, "fee_pct": 33 },
        { "after_hours": 20, "fee_pct": 28 },
        { "after_hours": 50, "fee_pct": 25 },
        { "after_hours": 200, "fee_pct": 18 },
        { "after_hours": 400, "fee_pct": 15 }
      ],
      "url": "https://preply.com", "available_in": ["US","GB","CA","AU","NZ","IE","HK"] },
    { "key": "snapask", "name": "Snapask", "fee_pct": 30, "url": "https://www.snapask.com/en-hk", "available_in": ["HK","SG","TW"] },
    { "key": "afterschool", "name": "AfterSchool HK", "fee_pct": 25, "url": "https://www.afterschool.com.hk", "available_in": ["HK"] },
    { "key": "tutorcircle", "name": "Tutor Circle", "fee_pct": 0, "url": "https://www.tutorcircle.hk", "available_in": ["HK"], "notes": "Charges tutors a one-off introduction fee (~HK$200) per matched student rather than commission." },
    { "key": "verbling", "name": "Verbling", "fee_pct": 15, "url": "https://www.verbling.com", "available_in": ["US","GB","CA","AU","NZ","IE","HK"] },
    { "key": "cambly", "name": "Cambly", "fee_pct": 0, "url": "https://www.cambly.com", "available_in": ["US","GB","CA","AU","NZ","IE","HK"], "notes": "Per-minute rate." }
  ],
  "tax": {
    "self_employment_form": "BIR60 (Tax Return — Individuals) with Part 5 (Profits Tax for sole proprietorship)",
    "self_employment_url": "https://www.ird.gov.hk/eng/tax/bus_pft.htm",
    "vat_threshold_amount": 0,
    "trading_allowance_amount": 0,
    "income_tax_brackets": [
      { "upper_bound_amount": 2000000, "rate": 0.075 },
      { "upper_bound_amount": null,    "rate": 0.15  }
    ],
    "registration_steps": [
      "Apply for a Business Registration Certificate (BR) at the Inland Revenue Department within 1 month of starting — annual fee HK$2,150 (1-year) or HK$5,650 (3-year).",
      "Register your business name with the Companies Registry if trading under any name other than your own.",
      "File Profits Tax Return (Form BIR60 + relevant supplementary forms) annually — tax year is 1 April–31 March.",
      "Profits Tax: 7.5% on first HK$2M assessable profits, 15% above.",
      "Mandatory Provident Fund (MPF) contributions: 5% of relevant income up to HK$1,500/month cap (HK$18,000/year) once you exceed the HK$7,100/month income trigger.",
      "No GST/VAT in Hong Kong — clean."
    ],
    "notes": "Hong Kong has no sales tax, GST, or VAT — a meaningful simplification. The 'tutor king/queen' culture means rates can be 5–10× the international online median for in-person prep."
  },
  "background_check": {
    "name": "Sexual Conviction Record Check (SCRC) — Hong Kong Police",
    "url": "https://www.police.gov.hk/ppp_en/11_useful_info/scrc.html",
    "cost_amount": 135,
    "notes": "Required by many parents and schools for tutors of minors. Application via the HK Police; HK$135 fee. Result valid 12 months."
  },
  "rates_by_language_pair": {
    "en-zh": { "low": 200, "median": 400, "high": 1500, "unit": "per_hour" },
    "en-yue": { "low": 200, "median": 400, "high": 1500, "unit": "per_hour" },
    "yue-en": { "low": 250, "median": 500, "high": 1800, "unit": "per_hour" },
    "zh-en": { "low": 250, "median": 500, "high": 1800, "unit": "per_hour" },
    "en-ja": { "low": 300, "median": 550, "high": 1500, "unit": "per_hour" },
    "en-ko": { "low": 300, "median": 550, "high": 1500, "unit": "per_hour" },
    "en-fr": { "low": 280, "median": 480, "high": 1200, "unit": "per_hour" },
    "en-de": { "low": 280, "median": 480, "high": 1200, "unit": "per_hour" },
    "en-es": { "low": 250, "median": 450, "high": 1100, "unit": "per_hour" },
    "yue-zh": { "low": 200, "median": 350, "high": 800, "unit": "per_hour" },
    "zh-yue": { "low": 200, "median": 350, "high": 800, "unit": "per_hour" }
  },
  "payment_methods": [
    { "key": "fps", "name": "FPS (Faster Payment System)", "domestic": true, "international": false, "url": "https://fps.hkma.gov.hk", "notes": "Free, instant HK bank-to-bank by phone/email/QR. Default for most tutors." },
    { "key": "octopus", "name": "Octopus (peer-to-peer)", "domestic": true, "international": false, "url": "https://www.octopus.com.hk" },
    { "key": "payme", "name": "PayMe (HSBC)", "domestic": true, "international": false, "url": "https://payme.hsbc.com.hk" },
    { "key": "alipay_hk", "name": "AlipayHK", "domestic": true, "international": false, "url": "https://www.alipayhk.com" },
    { "key": "wechat_pay_hk", "name": "WeChat Pay HK", "domestic": true, "international": false, "url": "https://pay.weixin.qq.com/wechatpay_guide/intro_hk.shtml" },
    { "key": "wise", "name": "Wise", "domestic": true, "international": true, "url": "https://wise.com" },
    { "key": "stripe_link", "name": "Stripe Link", "domestic": true, "international": true, "url": "https://link.com", "notes": "3.4%+HK$2.35 HK cards." },
    { "key": "cash", "name": "Cash", "domestic": true, "international": false }
  ],
  "insurance": {
    "public_liability_typical_amount": 10000000,
    "providers": [
      { "name": "AIG Hong Kong", "url": "https://www.aig.com.hk/business" },
      { "name": "AXA Hong Kong", "url": "https://www.axa.com.hk/en/business-insurance" },
      { "name": "Zurich Hong Kong", "url": "https://www.zurich.com.hk" }
    ],
    "notes": "HK$10M public liability is typical. Tutors of minors should carry professional indemnity in addition. ~HK$1,500–$3,500/year."
  },
  "data_source_last_verified": "2026-05-06"
}
```

- [ ] **Step 3: Validate IE + HK**

```bash
cd /c/Users/darre/slatework && npx -y ajv-cli@5 validate -s data/schema/country.schema.json -d "data/countries/{ie,hk}.json" --strict=false
```

Expected: two "valid" lines.

- [ ] **Step 4: Validate all 7 country packs together**

```bash
cd /c/Users/darre/slatework && npx -y ajv-cli@5 validate -s data/schema/country.schema.json -d "data/countries/*.json" --strict=false
```

Expected: 7 "valid" lines.

- [ ] **Step 5: Commit**

```bash
cd /c/Users/darre/slatework && git add data/countries/ie.json data/countries/hk.json && git commit -m "feat(p0): country packs — IE + HK (all 7 countries shipped)"
```

---

### Task 0.6: Country pack loader + currency utility

**Files:**
- Create: `slatework/lib/countries.js`
- Create: `slatework/lib/currency.js`
- Create: `slatework/tests/unit.html`

- [ ] **Step 1: Write `lib/countries.js`**

Path: `slatework/lib/countries.js`

```javascript
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
    const r = await fetch('/data/countries/' + lower + '.json', { cache: 'force-cache' });
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
      { code: 'en-es', label: 'English ↔ Spanish' },
      { code: 'en-fr', label: 'English ↔ French' },
      { code: 'en-de', label: 'English ↔ German' },
      { code: 'en-it', label: 'English ↔ Italian' },
      { code: 'en-pt', label: 'English ↔ Portuguese' },
      { code: 'en-ru', label: 'English ↔ Russian' },
      { code: 'en-zh', label: 'English ↔ Mandarin' },
      { code: 'en-yue', label: 'English ↔ Cantonese' },
      { code: 'en-ja', label: 'English ↔ Japanese' },
      { code: 'en-ko', label: 'English ↔ Korean' },
      { code: 'en-ar', label: 'English ↔ Arabic' },
      { code: 'es-en', label: 'Spanish ↔ English' },
      { code: 'fr-en', label: 'French ↔ English' },
      { code: 'ga-en', label: 'Irish ↔ English' },
      { code: 'yue-zh', label: 'Cantonese ↔ Mandarin' },
      { code: 'zh-yue', label: 'Mandarin ↔ Cantonese' }
    ];
  }

  window.Slatework = window.Slatework || {};
  window.Slatework.loadCountry = loadCountry;
  window.Slatework.listCountries = listCountries;
  window.Slatework.languagePairs = languagePairs;
})();
```

- [ ] **Step 2: Write `lib/currency.js`**

Path: `slatework/lib/currency.js`

```javascript
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
```

- [ ] **Step 3: Write `functions/api/fx.js` (FX cache endpoint)**

Path: `slatework/functions/api/fx.js`

```javascript
// GET /api/fx — returns cached FX rates (USD-base) with daily refresh.
// Cache lives in KV namespace FX_CACHE with key "rates:v1".

const REFRESH_HOURS = 24;
const SOURCE_URL = 'https://open.er-api.com/v6/latest/USD';

export async function onRequestGet({ env }) {
  if (!env.FX_CACHE) {
    return jsonResponse({ error: 'FX_CACHE not configured' }, 503);
  }

  const cached = await env.FX_CACHE.get('rates:v1', { type: 'json' });
  const now = Date.now();
  const ageHours = cached ? (now - cached.fetchedAt) / 3600000 : Infinity;

  if (cached && ageHours < REFRESH_HOURS) {
    return jsonResponse({ rates: cached.rates, asOf: cached.asOf, source: 'kv' }, 200);
  }

  try {
    const r = await fetch(SOURCE_URL, { cf: { cacheTtl: 600 } });
    if (!r.ok) throw new Error('upstream ' + r.status);
    const data = await r.json();
    if (!data.rates || !data.rates.GBP) throw new Error('malformed upstream response');
    const payload = {
      rates: {
        USD: 1.0,
        GBP: data.rates.GBP,
        EUR: data.rates.EUR,
        CAD: data.rates.CAD,
        AUD: data.rates.AUD,
        NZD: data.rates.NZD,
        HKD: data.rates.HKD
      },
      asOf: data.time_last_update_utc || new Date().toISOString(),
      fetchedAt: now
    };
    await env.FX_CACHE.put('rates:v1', JSON.stringify(payload), { expirationTtl: 86400 * 2 });
    return jsonResponse({ rates: payload.rates, asOf: payload.asOf, source: 'upstream' }, 200);
  } catch (e) {
    if (cached) {
      return jsonResponse({ rates: cached.rates, asOf: cached.asOf, source: 'stale' }, 200);
    }
    return jsonResponse({ error: 'FX upstream unavailable and no cache: ' + e.message }, 503);
  }
}

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
```

- [ ] **Step 4: Write a browser-runnable unit test for currency + countries**

Path: `slatework/tests/unit.html`

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Slatework — Unit Tests</title>
  <style>
    body { font: 14px/1.5 system-ui, sans-serif; padding: 1.5em; max-width: 60em; margin: auto; }
    .pass { color: #16a34a; }
    .fail { color: #dc2626; font-weight: 600; }
    pre { background: #f1f5f9; padding: 1em; border-radius: 6px; overflow-x: auto; }
    h2 { border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
  </style>
</head>
<body>
<h1>Slatework Unit Tests</h1>
<p>Open this file in a browser served from the Cloudflare Pages dev server (<code>wrangler pages dev .</code>) so <code>fetch('/data/countries/*.json')</code> resolves.</p>

<div id="out"></div>

<script src="/lib/countries.js"></script>
<script src="/lib/currency.js"></script>

<script>
const out = document.getElementById('out');
let passes = 0, fails = 0;

function section(name) {
  const h = document.createElement('h2');
  h.textContent = name;
  out.appendChild(h);
}

async function test(name, fn) {
  const li = document.createElement('div');
  try {
    await fn();
    li.innerHTML = '<span class="pass">✓ PASS</span> ' + name;
    passes++;
  } catch (e) {
    li.innerHTML = '<span class="fail">✗ FAIL</span> ' + name + '<pre>' + (e.stack || e.message) + '</pre>';
    fails++;
  }
  out.appendChild(li);
}

function eq(a, b, msg) {
  if (a !== b) throw new Error((msg || 'expected') + ': got ' + JSON.stringify(a) + ', expected ' + JSON.stringify(b));
}

function truthy(v, msg) {
  if (!v) throw new Error(msg || 'expected truthy, got ' + JSON.stringify(v));
}

(async () => {
  section('countries.js');

  await test('listCountries returns 7 entries', () => {
    const list = window.Slatework.listCountries();
    eq(list.length, 7);
  });

  await test('loadCountry("us") returns a valid pack', async () => {
    const us = await window.Slatework.loadCountry('us');
    eq(us.code, 'US');
    eq(us.currency, 'USD');
    truthy(us.platforms.length >= 3, 'expected platforms');
    truthy(us.tax.self_employment_form, 'expected tax form name');
  });

  await test('loadCountry("HK") (uppercase) works', async () => {
    const hk = await window.Slatework.loadCountry('HK');
    eq(hk.code, 'HK');
    eq(hk.currency, 'HKD');
  });

  await test('loadCountry("XX") rejects', async () => {
    try {
      await window.Slatework.loadCountry('xx');
      throw new Error('should have thrown');
    } catch (e) {
      truthy(/Unsupported/.test(e.message));
    }
  });

  await test('languagePairs includes en-zh and en-yue', () => {
    const pairs = window.Slatework.languagePairs().map(p => p.code);
    truthy(pairs.includes('en-zh'));
    truthy(pairs.includes('en-yue'));
  });

  section('currency.js');

  await test('formatCurrency formats GBP correctly', () => {
    const s = window.Slatework.formatCurrency(35, 'GBP', 'en-GB');
    truthy(/£35/.test(s), 'expected £35, got ' + s);
  });

  await test('formatCurrency formats HKD correctly', () => {
    const s = window.Slatework.formatCurrency(400, 'HKD', 'en-HK');
    truthy(/400/.test(s), 'expected HKD output, got ' + s);
  });

  await test('rates() returns USD as base', async () => {
    const r = await window.Slatework.rates();
    eq(r.rates.USD, 1.0);
    truthy(r.rates.GBP > 0);
    truthy(r.rates.HKD > 0);
  });

  await test('convert(100 USD -> GBP) returns positive number', async () => {
    const v = await window.Slatework.convert(100, 'USD', 'GBP');
    truthy(typeof v === 'number' && v > 0);
  });

  // Summary
  const summary = document.createElement('h2');
  summary.innerHTML = passes + ' passed, ' + (fails > 0 ? '<span class="fail">' + fails + ' failed</span>' : '0 failed');
  out.appendChild(summary);
})();
</script>
</body>
</html>
```

- [ ] **Step 5: Run the test page**

```bash
cd /c/Users/darre/slatework && npx -y wrangler@3 pages dev . --port 8788 &
sleep 3
curl -s http://localhost:8788/tests/unit.html | head -5
```

Then open `http://localhost:8788/tests/unit.html` in a browser. Expected: all 9 tests pass (the FX live test may show "fallback" source since KV isn't configured locally — that's still a pass).

Stop the dev server after verification:

```bash
kill %1 2>/dev/null
```

- [ ] **Step 6: Commit**

```bash
cd /c/Users/darre/slatework && git add lib/countries.js lib/currency.js functions/api/fx.js tests/unit.html && git commit -m "feat(p0): country pack loader, currency utility, FX endpoint, browser unit tests"
```

---

### Phase 0 checkpoint

Before proceeding to Phase 1, verify the foundation is sound:

- [ ] All 7 country packs validate against schema
- [ ] `lib/countries.js` and `lib/currency.js` pass unit tests in `tests/unit.html`
- [ ] `functions/api/fx.js` returns rates locally (with `--kv FX_CACHE` flag in wrangler dev) or fails clearly when KV not configured
- [ ] git log shows 6 commits on `main` with `feat(p0): ...` prefix

---

## Phase 1 — Client-side pages and tools

Phase 1 ships **6 of 10 tools** plus the homepage, privacy/terms/404, and a base CSS that every tool page extends. None of Phase 1 touches the LLM proxy or Pages Functions; everything renders client-side from country-pack JSON.

### Task 1.1: Shared CSS + base HTML structure

Every page on Slatework uses the same structural skeleton. Defining it once here means later tasks reference this exact markup.

**Files:**
- Create: `slatework/lib/styles.css`

- [ ] **Step 1: Write `lib/styles.css`** (slate-gray palette, type scale, shared form/button rules)

Path: `slatework/lib/styles.css`

```css
:root {
  --bg: #fafaf7;
  --surface: #ffffff;
  --ink: #1e293b;
  --ink-muted: #475569;
  --ink-faint: #94a3b8;
  --slate: #475569;
  --slate-deep: #334155;
  --accent: #b45309;
  --accent-deep: #92400e;
  --line: #e2e8f0;
  --line-soft: #f1f5f9;
  --ok: #15803d;
  --warn: #b45309;
  --err: #b91c1c;
  --radius: 8px;
  --shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.06);
  --shadow-md: 0 4px 12px rgba(15, 23, 42, 0.08);
  --max-width: 64rem;
}

* { box-sizing: border-box; }

html { -webkit-text-size-adjust: 100%; }

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, "Helvetica Neue", Arial, sans-serif;
  font-size: 16px;
  line-height: 1.55;
  color: var(--ink);
  background: var(--bg);
  margin: 0;
  padding: 0;
}

.container {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 1.5rem;
}

/* Header */
.site-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--line);
  background: var(--surface);
}
.site-header a.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  color: var(--ink);
  font-weight: 600;
  font-size: 1.05rem;
}
.site-header nav a {
  color: var(--ink-muted);
  text-decoration: none;
  margin-left: 1.25rem;
  font-size: 0.95rem;
}
.site-header nav a:hover { color: var(--ink); }

/* Footer */
.site-footer {
  padding: 2rem 1.5rem 3rem;
  border-top: 1px solid var(--line);
  background: var(--surface);
  font-size: 0.9rem;
  color: var(--ink-muted);
}
.site-footer .row {
  max-width: var(--max-width);
  margin: 0 auto;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 1rem;
}
.site-footer a { color: var(--ink-muted); text-decoration: none; }
.site-footer a:hover { color: var(--ink); text-decoration: underline; }

/* Type */
h1, h2, h3 { color: var(--ink); margin-top: 0; }
h1 { font-size: 1.9rem; line-height: 1.2; margin-bottom: 0.6rem; }
h2 { font-size: 1.3rem; line-height: 1.3; margin: 2rem 0 0.6rem; }
h3 { font-size: 1.05rem; margin: 1.4rem 0 0.4rem; }
p, li { font-size: 1rem; }
small, .small { font-size: 0.85rem; color: var(--ink-muted); }

/* Forms */
form .field { display: flex; flex-direction: column; gap: 0.3rem; margin-bottom: 1rem; }
form label { font-weight: 600; color: var(--ink); font-size: 0.95rem; }
form .help { color: var(--ink-muted); font-size: 0.85rem; margin-top: -0.1rem; }
input[type=text], input[type=email], input[type=number], select, textarea {
  font: inherit;
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
  color: var(--ink);
  width: 100%;
}
input:focus, select:focus, textarea:focus { outline: 2px solid var(--slate); outline-offset: 0; border-color: var(--slate); }
textarea { min-height: 8rem; resize: vertical; }

button, .btn {
  font: inherit;
  font-weight: 600;
  padding: 0.6rem 1rem;
  border-radius: var(--radius);
  border: 1px solid transparent;
  cursor: pointer;
  background: var(--slate);
  color: var(--surface);
  text-decoration: none;
  display: inline-block;
}
button:hover, .btn:hover { background: var(--slate-deep); }
button.secondary, .btn.secondary { background: transparent; color: var(--slate); border-color: var(--slate); }
button.secondary:hover, .btn.secondary:hover { background: var(--line-soft); }
button:disabled { opacity: 0.5; cursor: not-allowed; }

/* Cards / tiles */
.tile-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
  gap: 1rem;
  margin: 1.5rem 0;
}
.tile {
  display: block;
  padding: 1.1rem;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  text-decoration: none;
  color: var(--ink);
  transition: border-color 0.15s, box-shadow 0.15s;
}
.tile:hover { border-color: var(--slate); box-shadow: var(--shadow-md); }
.tile h3 { font-size: 1rem; margin: 0 0 0.3rem; }
.tile p { color: var(--ink-muted); font-size: 0.88rem; margin: 0; }

/* Result panels */
.result {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 1rem 1.2rem;
  margin: 1rem 0;
}
.result .row { display: flex; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px solid var(--line-soft); }
.result .row:last-child { border-bottom: none; }
.result .row strong { color: var(--ink); }

/* Privacy notice strip */
.privacy-notice {
  background: var(--line-soft);
  border-left: 3px solid var(--slate);
  padding: 0.7rem 1rem;
  border-radius: 0 var(--radius) var(--radius) 0;
  font-size: 0.88rem;
  color: var(--ink-muted);
  margin: 1rem 0;
}

/* Section anchors */
.section-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr)); gap: 1rem; }

/* Checklist */
ul.checklist { list-style: none; padding: 0; margin: 0; }
ul.checklist li {
  position: relative;
  padding: 0.4rem 0 0.4rem 1.6rem;
}
ul.checklist li::before {
  content: "☐";
  position: absolute;
  left: 0; top: 0.4rem;
  color: var(--slate);
  font-size: 1.1rem;
}

/* Tag */
.tag {
  display: inline-block;
  padding: 0.1rem 0.5rem;
  background: var(--line-soft);
  color: var(--ink-muted);
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-left: 0.4rem;
}
.tag.warn { background: #fef3c7; color: var(--accent-deep); }

/* Mobile */
@media (max-width: 640px) {
  .container { padding: 1rem; }
  h1 { font-size: 1.55rem; }
  .site-header nav a { margin-left: 0.7rem; }
}
```

- [ ] **Step 2: Commit**

```bash
cd /c/Users/darre/slatework && git add lib/styles.css && git commit -m "feat(p1): shared base CSS — slate palette, forms, tiles, privacy notice"
```

---

### Task 1.2: Homepage (`index.html`)

The homepage is the entry to all 10 tools. It also contains the newsletter signup form (which posts to `/api/newsletter` once Phase 3 ships) and the easter-egg HTML comment.

**Files:**
- Create: `slatework/index.html`

- [ ] **Step 1: Write `index.html`**

Path: `slatework/index.html`

```html
<!--
  Built with the world's tutors and teachers in mind — and one in particular.
-->
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Slatework — Free tools for independent language tutors</title>
  <meta name="description" content="A free, privacy-first toolkit for independent language tutors and teachers. Country-aware tools for setup, rates, contracts, lesson planning, and grading — across the US, UK, Canada, Australia, New Zealand, Ireland, and Hong Kong." />
  <meta name="theme-color" content="#475569" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="canonical" href="https://slatework.tools/" />
  <link rel="stylesheet" href="/lib/styles.css" />
</head>
<body>

<header class="site-header">
  <a class="brand" href="/">
    <svg width="22" height="22" viewBox="0 0 64 64" aria-hidden="true">
      <rect x="6" y="10" width="52" height="44" rx="6" fill="#475569" stroke="#334155" stroke-width="2"/>
      <line x1="16" y1="22" x2="48" y2="22" stroke="#cbd5e1" stroke-width="1.6" stroke-linecap="round"/>
      <line x1="16" y1="32" x2="42" y2="32" stroke="#cbd5e1" stroke-width="1.6" stroke-linecap="round"/>
      <line x1="16" y1="42" x2="38" y2="42" stroke="#cbd5e1" stroke-width="1.6" stroke-linecap="round"/>
    </svg>
    Slatework
  </a>
  <nav>
    <a href="/about.html">About</a>
    <a href="/privacy.html">Privacy</a>
  </nav>
</header>

<main class="container">
  <section style="padding: 1rem 0 2rem;">
    <h1>Free tools for independent language tutors.</h1>
    <p class="small" style="font-size:1.05rem; max-width:38rem;">
      Ten free, privacy-first tools for the parts of tutoring that platforms hide and templates miss — set up your business, set your rates, plan lessons, mark work. Country-aware for the US, UK, Canada, Australia, New Zealand, Ireland, and Hong Kong.
    </p>
  </section>

  <h2>Setting up your tutoring business</h2>
  <div class="tile-grid">
    <a class="tile" href="/setup.html">
      <h3>Start tutoring privately</h3>
      <p>Country-aware setup: registration, background checks, working-with-minors basics.</p>
    </a>
    <a class="tile" href="/tax.html">
      <h3>Tax &amp; self-employment</h3>
      <p>The forms, thresholds, and deadlines for your country — Schedule C, SA103, T2125, ABN, IR3, ROS, BIR60.</p>
    </a>
    <a class="tile" href="/insurance.html">
      <h3>Insurance &amp; safeguarding</h3>
      <p>Public liability, professional indemnity, and DBS/WWCC/Garda equivalents — what tutors actually need.</p>
    </a>
  </div>

  <h2>Pricing &amp; money</h2>
  <div class="tile-grid">
    <a class="tile" href="/rates.html">
      <h3>Hourly rate calculator</h3>
      <p>Private rate range AND your platform-net side-by-side across italki, Preply, Wyzant, Cambly, and Tutorful.</p>
    </a>
    <a class="tile" href="/payments.html">
      <h3>Payment methods</h3>
      <p>Wise, Stripe Link, PayPal, plus local rails — HK FPS, AU PayID, UK Faster Payments, US Zelle.</p>
    </a>
  </div>

  <h2>Client acquisition</h2>
  <div class="tile-grid">
    <a class="tile" href="/contract.html">
      <h3>Parent-tutor contract</h3>
      <p>Generate a signable lesson agreement — trial terms, cancellation policy, parent welcome paragraph included.</p>
    </a>
  </div>

  <h2>Lesson delivery &amp; grading</h2>
  <div class="tile-grid">
    <a class="tile" href="/lesson-plan.html">
      <h3>Lesson plan generator <span class="tag">AI</span></h3>
      <p>Language pair + level + goal → structured plan. Works for 1:1, small group, or a full classroom.</p>
    </a>
    <a class="tile" href="/cefr.html">
      <h3>CEFR proficiency mapper</h3>
      <p>Place a student at A1–C2 — rule-based by default, with optional AI assessment from a writing sample.</p>
    </a>
    <a class="tile" href="/worksheet.html">
      <h3>Worksheet + answer key <span class="tag">AI</span></h3>
      <p>Topic + level → printable worksheet with the answer key matched, in seconds.</p>
    </a>
    <a class="tile" href="/marking.html">
      <h3>Marking accelerator <span class="tag">AI</span></h3>
      <p>Paste student writing → highlighted error categories + level-matched feedback to copy-paste.</p>
    </a>
  </div>

  <section style="margin-top: 3rem; padding: 1.5rem; background: var(--surface); border: 1px solid var(--line); border-radius: var(--radius);">
    <h2 style="margin-top: 0;">One short email a week. No spam.</h2>
    <p>Notes from independent tutors and teachers — what's working, what just shipped, useful templates. You can unsubscribe in one click.</p>
    <form id="newsletter" style="display:flex; gap:0.5rem; flex-wrap:wrap; align-items:flex-end; margin-top: 0.6rem;">
      <div class="field" style="flex: 1 1 14rem; margin-bottom: 0;">
        <label for="email">Email</label>
        <input id="email" name="email" type="email" required placeholder="you@example.com" autocomplete="email" />
      </div>
      <button type="submit">Join</button>
    </form>
    <div id="newsletter-status" class="small" style="margin-top: 0.6rem; min-height: 1.4em;"></div>
  </section>
</main>

<footer class="site-footer">
  <div class="row">
    <div>
      <strong>Slatework</strong> · Free tools for independent language tutors.
      <br/>
      Built by Darren · 2026
    </div>
    <div>
      <a href="/about.html">About</a> ·
      <a href="/privacy.html">Privacy</a> ·
      <a href="/terms.html">Terms</a>
    </div>
  </div>
</footer>

<script>
console.log("%cFor the teachers", "color:#475569;font-size:14px;font-style:italic");

(() => {
  const form = document.getElementById('newsletter');
  const status = document.getElementById('newsletter-status');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    if (!email) return;
    status.textContent = 'Joining…';
    try {
      const r = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (r.ok) {
        status.textContent = 'Welcome aboard.';
        form.reset();
      } else if (r.status === 429) {
        status.textContent = 'Too many tries — wait a minute.';
      } else {
        status.textContent = 'Could not join right now. Try again in a moment.';
      }
    } catch {
      status.textContent = 'Network error. Try again in a moment.';
    }
  });
})();
</script>

</body>
</html>
```

- [ ] **Step 2: Verify the page renders locally**

```bash
cd /c/Users/darre/slatework && npx -y wrangler@3 pages dev . --port 8788 &
sleep 3
curl -s http://localhost:8788/ | grep -o "<title>[^<]*</title>"
```

Expected: `<title>Slatework — Free tools for independent language tutors</title>`

Open `http://localhost:8788/` in a browser. Expected:
- Header shows the slate logo + Slatework wordmark
- Four tool sections: Setting up (3 tiles), Pricing (2 tiles), Client acquisition (1 tile), Lesson delivery (4 tiles)
- Newsletter form below tiles
- View source → first line is the easter-egg HTML comment
- DevTools console → `For the teachers` log message in italic slate-gray

Stop dev server: `kill %1 2>/dev/null`

- [ ] **Step 3: Commit**

```bash
cd /c/Users/darre/slatework && git add index.html && git commit -m "feat(p1): homepage with 10 tool tiles, newsletter form, and easter eggs"
```

---

### Task 1.3: Privacy + Terms + 404 + About

Four short legal/info pages. None has interactive logic.

**Files:**
- Create: `slatework/privacy.html`
- Create: `slatework/terms.html`
- Create: `slatework/about.html`
- Create: `slatework/404.html`

- [ ] **Step 1: Write `privacy.html`**

Path: `slatework/privacy.html`

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Privacy — Slatework</title>
  <meta name="description" content="Slatework's privacy posture: nothing leaves your device unless we explicitly tell you. No accounts, no tracking, minimal data." />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="stylesheet" href="/lib/styles.css" />
</head>
<body>
<header class="site-header">
  <a class="brand" href="/">
    <svg width="22" height="22" viewBox="0 0 64 64" aria-hidden="true"><rect x="6" y="10" width="52" height="44" rx="6" fill="#475569" stroke="#334155" stroke-width="2"/><line x1="16" y1="22" x2="48" y2="22" stroke="#cbd5e1" stroke-width="1.6" stroke-linecap="round"/><line x1="16" y1="32" x2="42" y2="32" stroke="#cbd5e1" stroke-width="1.6" stroke-linecap="round"/><line x1="16" y1="42" x2="38" y2="42" stroke="#cbd5e1" stroke-width="1.6" stroke-linecap="round"/></svg>
    Slatework
  </a>
  <nav><a href="/about.html">About</a><a href="/">Tools</a></nav>
</header>

<main class="container">
  <h1>Privacy</h1>
  <p class="small">Last updated: 2026-05-06.</p>

  <h2>The short version</h2>
  <p>Most of what Slatework does happens in your browser. The few tools that send data anywhere send it only to a language model for processing — we don't store it, log it, or sell it.</p>

  <h2>What we collect</h2>
  <ul>
    <li><strong>Email address</strong> — only if you sign up for the newsletter. We hash it to deduplicate. You can unsubscribe in one click and we delete the record.</li>
    <li><strong>Anonymous usage stats</strong> — Cloudflare Web Analytics counts page views and visits. It does not use cookies and does not identify you.</li>
    <li><strong>Rate-limit fingerprint</strong> — when you use an AI-backed tool, we hash your IP address and time-stamp the request to prevent abuse. We don't store the request body. The hash is rotated daily.</li>
  </ul>

  <h2>What we don't do</h2>
  <ul>
    <li>No accounts, no logins, no profiles.</li>
    <li>No third-party trackers, no pixels, no Google Analytics.</li>
    <li>No selling or sharing of your data.</li>
    <li>No storing the inputs you give to AI-backed tools (lesson plan, worksheet, marking, CEFR AI).</li>
  </ul>

  <h2>AI-backed tools (lesson plan, worksheet, marking, CEFR AI)</h2>
  <p>When you use one of these four tools, the text you submit is sent to <a href="https://www.anthropic.com">Anthropic</a> for processing. We don't keep a copy on our servers. Anthropic's data-handling policy applies.</p>
  <p>For the marking accelerator and the CEFR AI mode specifically: please don't include a student's name or other identifying information in the input. Paste the writing only.</p>

  <h2>Cookies</h2>
  <p>None.</p>

  <h2>Your rights</h2>
  <p>If you signed up for the newsletter, email <a href="mailto:hello@slatework.tools">hello@slatework.tools</a> to be removed. We hold no other personal data tied to you.</p>

  <h2>Changes</h2>
  <p>If this policy materially changes, the change goes here, dated at the top.</p>
</main>

<footer class="site-footer">
  <div class="row">
    <div><strong>Slatework</strong> · Free tools for independent language tutors.<br/>Built by Darren · 2026</div>
    <div><a href="/about.html">About</a> · <a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a></div>
  </div>
</footer>
</body>
</html>
```

- [ ] **Step 2: Write `terms.html`**

Path: `slatework/terms.html`

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Terms — Slatework</title>
  <meta name="description" content="Slatework's terms of use." />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="stylesheet" href="/lib/styles.css" />
</head>
<body>
<header class="site-header">
  <a class="brand" href="/"><svg width="22" height="22" viewBox="0 0 64 64" aria-hidden="true"><rect x="6" y="10" width="52" height="44" rx="6" fill="#475569" stroke="#334155" stroke-width="2"/><line x1="16" y1="22" x2="48" y2="22" stroke="#cbd5e1" stroke-width="1.6" stroke-linecap="round"/><line x1="16" y1="32" x2="42" y2="32" stroke="#cbd5e1" stroke-width="1.6" stroke-linecap="round"/><line x1="16" y1="42" x2="38" y2="42" stroke="#cbd5e1" stroke-width="1.6" stroke-linecap="round"/></svg>Slatework</a>
  <nav><a href="/about.html">About</a><a href="/">Tools</a></nav>
</header>

<main class="container">
  <h1>Terms</h1>
  <p class="small">Last updated: 2026-05-06.</p>

  <h2>What Slatework is</h2>
  <p>Slatework is a free toolkit for independent language tutors. Use the tools however helps you. There's no signup, no payment, no quota you have to clear.</p>

  <h2>What Slatework is not</h2>
  <p>Slatework is not legal, tax, or financial advice. The tax-setup, insurance, and rate tools surface country-specific information accurate to the date stamped at the bottom of each country's data file — but they're estimates and starting points, not professional guidance. Confirm with a local accountant, lawyer, or insurance broker before making decisions that depend on the output.</p>

  <h2>The AI-backed tools</h2>
  <p>Lesson plan, worksheet, marking, and CEFR AI tools generate output from a language model. Always review what they produce before using it with a student or parent. The model can be wrong; you are the teacher.</p>

  <h2>Liability</h2>
  <p>Slatework is provided as-is. We're not liable for losses arising from your use of the tools. If a tool gives you a wrong number, please email <a href="mailto:hello@slatework.tools">hello@slatework.tools</a> so we can fix it.</p>

  <h2>Acceptable use</h2>
  <p>Don't try to overload the AI-backed endpoints (rate limits apply). Don't use the marking accelerator on writing the student didn't consent to share, even anonymized.</p>

  <h2>Changes</h2>
  <p>If these terms change materially, the change goes here, dated at the top.</p>
</main>

<footer class="site-footer">
  <div class="row">
    <div><strong>Slatework</strong> · Free tools for independent language tutors.<br/>Built by Darren · 2026</div>
    <div><a href="/about.html">About</a> · <a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a></div>
  </div>
</footer>
</body>
</html>
```

- [ ] **Step 3: Write `about.html`** (with anonymous dedication line)

Path: `slatework/about.html`

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>About — Slatework</title>
  <meta name="description" content="Why Slatework exists, who it's for, and how it stays free." />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="stylesheet" href="/lib/styles.css" />
</head>
<body>
<header class="site-header">
  <a class="brand" href="/"><svg width="22" height="22" viewBox="0 0 64 64" aria-hidden="true"><rect x="6" y="10" width="52" height="44" rx="6" fill="#475569" stroke="#334155" stroke-width="2"/><line x1="16" y1="22" x2="48" y2="22" stroke="#cbd5e1" stroke-width="1.6" stroke-linecap="round"/><line x1="16" y1="32" x2="42" y2="32" stroke="#cbd5e1" stroke-width="1.6" stroke-linecap="round"/><line x1="16" y1="42" x2="38" y2="42" stroke="#cbd5e1" stroke-width="1.6" stroke-linecap="round"/></svg>Slatework</a>
  <nav><a href="/about.html">About</a><a href="/">Tools</a></nav>
</header>

<main class="container">
  <h1>About</h1>

  <p>Slatework is a small, free toolkit for independent language tutors and the teachers who tutor on the side. It's the second project from <a href="https://authorly.tools">Authorly</a> — same maker, same approach, sharper niche.</p>

  <h2>Why this exists</h2>
  <p>Tutoring online means choosing a platform that takes 25–33% of your hourly rate and makes you compete on it. Tutoring privately means filing your own taxes, writing your own contracts, building your own client list, planning every lesson, and marking every piece of writing. Neither is bad; both have parts that platforms and templates won't help you with. Slatework is the missing layer.</p>

  <h2>Who it's for</h2>
  <ul>
    <li>Independent language tutors with private 1:1 students</li>
    <li>Tutors on italki, Preply, Wyzant, Cambly, or Tutorful who also want a direct client book</li>
    <li>Classroom language teachers who side-tutor — or who just need a faster way to plan and grade</li>
  </ul>

  <h2>How it stays free</h2>
  <p>Two ways. (1) Affiliate links to tools you'd already pick yourself — Wise, Stripe Link, the platforms themselves. We never recommend something we wouldn't use. (2) Eventually, an optional Pro tier for power users that adds saved drafts and bigger AI quotas. The 10 free tools stay free.</p>

  <h2>How your data is handled</h2>
  <p>See the <a href="/privacy.html">privacy page</a>. The short version: nothing leaves your browser unless we explicitly tell you, no accounts, no tracking pixels, no selling.</p>

  <h2>Get in touch</h2>
  <p>Email <a href="mailto:hello@slatework.tools">hello@slatework.tools</a>. If something's wrong, broken, or could be better, that's the address.</p>

  <hr style="margin: 3rem 0 1.5rem; border: 0; border-top: 1px solid var(--line);" />
  <p class="small" style="text-align: center; font-style: italic;">Built for the teacher who's currently grading at her kitchen table at 11pm.</p>
</main>

<footer class="site-footer">
  <div class="row">
    <div><strong>Slatework</strong> · Free tools for independent language tutors.<br/>Built by Darren · 2026</div>
    <div><a href="/about.html">About</a> · <a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a></div>
  </div>
</footer>
</body>
</html>
```

- [ ] **Step 4: Write `404.html`**

Path: `slatework/404.html`

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Not found — Slatework</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="stylesheet" href="/lib/styles.css" />
</head>
<body>
<header class="site-header">
  <a class="brand" href="/"><svg width="22" height="22" viewBox="0 0 64 64" aria-hidden="true"><rect x="6" y="10" width="52" height="44" rx="6" fill="#475569" stroke="#334155" stroke-width="2"/><line x1="16" y1="22" x2="48" y2="22" stroke="#cbd5e1" stroke-width="1.6" stroke-linecap="round"/><line x1="16" y1="32" x2="42" y2="32" stroke="#cbd5e1" stroke-width="1.6" stroke-linecap="round"/><line x1="16" y1="42" x2="38" y2="42" stroke="#cbd5e1" stroke-width="1.6" stroke-linecap="round"/></svg>Slatework</a>
  <nav><a href="/about.html">About</a><a href="/">Tools</a></nav>
</header>

<main class="container" style="text-align: center; padding-top: 4rem;">
  <h1>Page not found</h1>
  <p>That URL doesn't match any tool we ship. The slate is clean.</p>
  <p style="margin-top: 2rem;"><a class="btn" href="/">Back to the toolkit</a></p>
</main>

<footer class="site-footer">
  <div class="row">
    <div><strong>Slatework</strong> · Built by Darren · 2026</div>
    <div><a href="/about.html">About</a> · <a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a></div>
  </div>
</footer>
</body>
</html>
```

- [ ] **Step 5: Commit**

```bash
cd /c/Users/darre/slatework && git add privacy.html terms.html about.html 404.html && git commit -m "feat(p1): privacy, terms, about, 404 — about page carries anonymous dedication"
```

---

### Task 1.4: Tool 4 — Hourly rate calculator + multi-platform comparison (`rates.html`)

The anchor tool. Country-aware (heavy use of country pack). Includes platform-net comparison so the dropped Multi-platform comparator's main job is folded in.

**Files:**
- Create: `slatework/rates.html`

- [ ] **Step 1: Write `rates.html`**

Path: `slatework/rates.html`

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Hourly rate calculator — Slatework</title>
  <meta name="description" content="Set a defensible hourly rate as an independent language tutor. See your private rate range and your platform-net side-by-side across italki, Preply, Wyzant, Cambly, and Tutorful — country-aware for 7 markets." />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="canonical" href="https://slatework.tools/rates.html" />
  <link rel="stylesheet" href="/lib/styles.css" />
</head>
<body>
<header class="site-header">
  <a class="brand" href="/"><svg width="22" height="22" viewBox="0 0 64 64" aria-hidden="true"><rect x="6" y="10" width="52" height="44" rx="6" fill="#475569" stroke="#334155" stroke-width="2"/><line x1="16" y1="22" x2="48" y2="22" stroke="#cbd5e1" stroke-width="1.6" stroke-linecap="round"/><line x1="16" y1="32" x2="42" y2="32" stroke="#cbd5e1" stroke-width="1.6" stroke-linecap="round"/><line x1="16" y1="42" x2="38" y2="42" stroke="#cbd5e1" stroke-width="1.6" stroke-linecap="round"/></svg>Slatework</a>
  <nav><a href="/about.html">About</a><a href="/">Tools</a></nav>
</header>

<main class="container">
  <h1>Hourly rate calculator</h1>
  <p>Set a rate that reflects your language pair, experience, and country — and see what each platform actually pays you at that rate after their commission.</p>

  <div class="privacy-notice">
    Everything happens in your browser. We don't see your rate, your country, or any other input.
  </div>

  <form id="form">
    <div class="section-row">
      <div class="field">
        <label for="country">Country</label>
        <select id="country" name="country" required></select>
        <span class="help">Currency, rate ranges, and platforms adjust to match.</span>
      </div>
      <div class="field">
        <label for="pair">Language pair</label>
        <select id="pair" name="pair" required></select>
        <span class="help">Pick the pair you teach most. Rates differ per pair.</span>
      </div>
    </div>

    <div class="section-row">
      <div class="field">
        <label for="experience">Experience</label>
        <select id="experience" name="experience" required>
          <option value="new">New (under 1 year)</option>
          <option value="early" selected>Early (1–3 years)</option>
          <option value="mid">Mid (3–7 years)</option>
          <option value="senior">Senior (7+ years)</option>
        </select>
      </div>
      <div class="field">
        <label for="hours">Hours per week</label>
        <input id="hours" name="hours" type="number" min="0" max="60" step="1" value="10" required />
        <span class="help">Used for the annual projection.</span>
      </div>
    </div>

    <div class="section-row">
      <div class="field">
        <label for="rate">Your hourly rate (optional)</label>
        <input id="rate" name="rate" type="number" min="0" step="1" placeholder="leave blank to use the median" />
        <span class="help">If blank, we use the median for your country + pair.</span>
      </div>
    </div>
  </form>

  <section id="result" class="result" style="display:none;">
    <h2 style="margin-top:0;">Your rate</h2>
    <div id="suggestion-block"></div>

    <h2>Platform-net comparison</h2>
    <p class="small">If you charged the same gross hourly rate on each platform, here's what you'd actually take home after commission.</p>
    <div id="platforms-block"></div>

    <h2>Annual projection</h2>
    <div id="annual-block"></div>

    <p class="small" id="fx-note" style="margin-top:1rem;"></p>
  </section>
</main>

<footer class="site-footer">
  <div class="row">
    <div><strong>Slatework</strong> · Built by Darren · 2026</div>
    <div><a href="/about.html">About</a> · <a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a></div>
  </div>
</footer>

<script src="/lib/countries.js"></script>
<script src="/lib/currency.js"></script>

<script>
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

  const pack = await SW.loadCountry(code);
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

function pickFee(p, hoursTaught) {
  if (!p.fee_curve) return p.fee_pct;
  // Find the highest tier whose threshold is <= hoursTaught
  let fee = p.fee_curve[0].fee_pct;
  for (const t of p.fee_curve) {
    if (hoursTaught >= t.after_hours) fee = t.fee_pct;
  }
  return fee;
}

function hoursTier(p, hoursTaught) {
  if (!p.fee_curve) return '';
  let last = 0;
  for (const t of p.fee_curve) {
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
</script>

</body>
</html>
```

- [ ] **Step 2: Verify in dev**

```bash
cd /c/Users/darre/slatework && npx -y wrangler@3 pages dev . --port 8788 &
sleep 3
curl -s http://localhost:8788/rates.html | grep -o "<title>[^<]*</title>"
kill %1 2>/dev/null
```

Expected: `<title>Hourly rate calculator — Slatework</title>`

Open in browser: change country to UK, pair to en-fr, hours to 15. Expect: rate range in £, platforms list shows Tutorful, MyTutor, Tutor House, italki, Preply, Cambly. Annual projection shows £×50×weeklyhours.

- [ ] **Step 3: Commit**

```bash
cd /c/Users/darre/slatework && git add rates.html && git commit -m "feat(p1): hourly rate calculator with multi-platform net comparison"
```

---

### Task 1.5: Tool 5 — Payment methods per country (`payments.html`)

**Files:**
- Create: `slatework/payments.html`

- [ ] **Step 1: Write `payments.html`**

Path: `slatework/payments.html`

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Payment methods for tutors — Slatework</title>
  <meta name="description" content="The payment methods that work for independent tutors in your country — Wise, Stripe Link, PayPal, plus local rails like HK FPS, AU PayID, UK Faster Payments, US Zelle, and more." />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="canonical" href="https://slatework.tools/payments.html" />
  <link rel="stylesheet" href="/lib/styles.css" />
</head>
<body>
<header class="site-header">
  <a class="brand" href="/"><svg width="22" height="22" viewBox="0 0 64 64" aria-hidden="true"><rect x="6" y="10" width="52" height="44" rx="6" fill="#475569" stroke="#334155" stroke-width="2"/><line x1="16" y1="22" x2="48" y2="22" stroke="#cbd5e1" stroke-width="1.6" stroke-linecap="round"/><line x1="16" y1="32" x2="42" y2="32" stroke="#cbd5e1" stroke-width="1.6" stroke-linecap="round"/><line x1="16" y1="42" x2="38" y2="42" stroke="#cbd5e1" stroke-width="1.6" stroke-linecap="round"/></svg>Slatework</a>
  <nav><a href="/about.html">About</a><a href="/">Tools</a></nav>
</header>

<main class="container">
  <h1>Payment methods for tutors</h1>
  <p>The payment methods that work in your country — for collecting from local students and from international ones. Free, private, fast, or all three.</p>

  <div class="privacy-notice">Renders entirely in your browser from a country-pack data file. We don't see your selections.</div>

  <form id="form">
    <div class="field">
      <label for="country">Country</label>
      <select id="country" name="country" required></select>
    </div>
  </form>

  <section id="result" style="display:none;">
    <h2>Domestic payments (within your country)</h2>
    <div id="domestic" class="result"></div>
    <h2>International payments (cross-border students)</h2>
    <div id="international" class="result"></div>
  </section>
</main>

<footer class="site-footer">
  <div class="row">
    <div><strong>Slatework</strong> · Built by Darren · 2026</div>
    <div><a href="/about.html">About</a> · <a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a></div>
  </div>
</footer>

<script src="/lib/countries.js"></script>
<script>
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
  const link = m.url ? `<a href="${escapeAttr(m.url)}" target="_blank" rel="noopener">${escapeHtml(m.name)}</a>` : escapeHtml(m.name);
  const note = m.notes ? ` <span class="small">— ${escapeHtml(m.notes)}</span>` : '';
  return `<div class="row"><span>${link}${note}</span><strong></strong></div>`;
}

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function escapeAttr(s) { return escapeHtml(s); }
</script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
cd /c/Users/darre/slatework && git add payments.html && git commit -m "feat(p1): payment methods page (per country, domestic + international)"
```

---

### Task 1.6: Tool 1 — Start-tutoring-privately walkthrough (`setup.html`)

**Files:**
- Create: `slatework/setup.html`

- [ ] **Step 1: Write `setup.html`**

Path: `slatework/setup.html`

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Start tutoring privately — Slatework</title>
  <meta name="description" content="A country-aware checklist for starting as an independent language tutor. Registration, background checks, working-with-minors basics, and the platform vs. private decision." />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="canonical" href="https://slatework.tools/setup.html" />
  <link rel="stylesheet" href="/lib/styles.css" />
</head>
<body>
<header class="site-header">
  <a class="brand" href="/"><svg width="22" height="22" viewBox="0 0 64 64" aria-hidden="true"><rect x="6" y="10" width="52" height="44" rx="6" fill="#475569" stroke="#334155" stroke-width="2"/><line x1="16" y1="22" x2="48" y2="22" stroke="#cbd5e1" stroke-width="1.6" stroke-linecap="round"/><line x1="16" y1="32" x2="42" y2="32" stroke="#cbd5e1" stroke-width="1.6" stroke-linecap="round"/><line x1="16" y1="42" x2="38" y2="42" stroke="#cbd5e1" stroke-width="1.6" stroke-linecap="round"/></svg>Slatework</a>
  <nav><a href="/about.html">About</a><a href="/">Tools</a></nav>
</header>

<main class="container">
  <h1>Start tutoring privately</h1>
  <p>A short, country-aware walkthrough — what you actually have to do, in order, to start taking private students legally.</p>

  <form id="form">
    <div class="field">
      <label for="country">Country</label>
      <select id="country" name="country" required></select>
    </div>
  </form>

  <section id="result" style="display:none;">
    <h2 id="country-title"></h2>

    <h3>1. Register your business</h3>
    <ol id="reg-steps"></ol>

    <h3>2. Background check (if you'll teach minors)</h3>
    <div id="bgc-block" class="result"></div>

    <h3>3. Insurance signpost</h3>
    <p class="small">Most independent tutors carry public-liability + professional-indemnity insurance, especially when teaching minors. <a href="/insurance.html">See the insurance &amp; safeguarding page</a> for what's typical in your country.</p>

    <h3>4. Tax setup</h3>
    <p class="small">You'll register for self-assessed income tax. <a href="/tax.html">See the tax page</a> for the form, deadline, and thresholds.</p>

    <p class="small" id="last-verified"></p>
  </section>
</main>

<footer class="site-footer">
  <div class="row">
    <div><strong>Slatework</strong> · Built by Darren · 2026</div>
    <div><a href="/about.html">About</a> · <a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a></div>
  </div>
</footer>

<script src="/lib/countries.js"></script>
<script>
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

  $('country-title').textContent = pack.name;

  const reg = $('reg-steps');
  reg.innerHTML = '';
  for (const step of pack.tax.registration_steps) {
    const li = document.createElement('li');
    li.textContent = step;
    reg.appendChild(li);
  }

  const bgc = pack.background_check;
  const bgcBlock = $('bgc-block');
  bgcBlock.innerHTML = `
    <div class="row"><span><strong>Name</strong></span><strong>${escapeHtml(bgc.name)}</strong></div>
    <div class="row"><span><strong>Cost</strong></span><strong>${bgc.cost_amount != null ? formatCost(bgc.cost_amount, pack) : '—'}</strong></div>
    <div class="row"><span><strong>Where</strong></span><strong><a href="${escapeAttr(bgc.url)}" target="_blank" rel="noopener">Apply →</a></strong></div>
    ${bgc.notes ? `<p class="small" style="margin-top:0.6rem;">${escapeHtml(bgc.notes)}</p>` : ''}
  `;

  $('last-verified').textContent = `This information was last verified ${pack.data_source_last_verified}. Confirm with your country's authority before relying on any single step.`;
  $('result').style.display = 'block';
}

function formatCost(amount, pack) {
  if (amount === 0) return 'Free';
  return new Intl.NumberFormat(pack.locale_default, { style: 'currency', currency: pack.currency, maximumFractionDigits: 0 }).format(amount);
}
function escapeHtml(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function escapeAttr(s) { return escapeHtml(s); }
</script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
cd /c/Users/darre/slatework && git add setup.html && git commit -m "feat(p1): start-tutoring-privately walkthrough (country-aware)"
```

---

### Task 1.7: Tool 2 — Tax & self-employment setup (`tax.html`)

**Files:**
- Create: `slatework/tax.html`

- [ ] **Step 1: Write `tax.html`**

Path: `slatework/tax.html`

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Tax &amp; self-employment for tutors — Slatework</title>
  <meta name="description" content="What form to file, when to file it, and the thresholds that matter for self-employed language tutors — across the US, UK, Canada, Australia, New Zealand, Ireland, and Hong Kong." />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="canonical" href="https://slatework.tools/tax.html" />
  <link rel="stylesheet" href="/lib/styles.css" />
</head>
<body>
<header class="site-header">
  <a class="brand" href="/"><svg width="22" height="22" viewBox="0 0 64 64" aria-hidden="true"><rect x="6" y="10" width="52" height="44" rx="6" fill="#475569" stroke="#334155" stroke-width="2"/><line x1="16" y1="22" x2="48" y2="22" stroke="#cbd5e1" stroke-width="1.6" stroke-linecap="round"/><line x1="16" y1="32" x2="42" y2="32" stroke="#cbd5e1" stroke-width="1.6" stroke-linecap="round"/><line x1="16" y1="42" x2="38" y2="42" stroke="#cbd5e1" stroke-width="1.6" stroke-linecap="round"/></svg>Slatework</a>
  <nav><a href="/about.html">About</a><a href="/">Tools</a></nav>
</header>

<main class="container">
  <h1>Tax &amp; self-employment</h1>
  <p>What form to file, what threshold matters, and what to do with the money you make.</p>

  <div class="privacy-notice">This is information, not advice. Confirm with a local accountant before filing — the data here is current as of the date stamped at the bottom.</div>

  <form id="form">
    <div class="field">
      <label for="country">Country</label>
      <select id="country" name="country" required></select>
    </div>
  </form>

  <section id="result" style="display:none;">
    <h2 id="country-title"></h2>

    <div class="result">
      <div class="row"><span><strong>Form</strong></span><strong id="form-name"></strong></div>
      <div class="row"><span><strong>Where to file</strong></span><strong><a id="form-link" target="_blank" rel="noopener">Open →</a></strong></div>
      <div class="row"><span><strong>Trading allowance / threshold</strong></span><strong id="threshold"></strong></div>
      <div class="row"><span><strong>VAT / GST registration threshold</strong></span><strong id="vat-threshold"></strong></div>
    </div>

    <h3>How to register</h3>
    <ol id="reg-steps"></ol>

    <h3>Notes</h3>
    <p id="notes" class="small"></p>

    <p class="small" id="last-verified"></p>
  </section>
</main>

<footer class="site-footer">
  <div class="row">
    <div><strong>Slatework</strong> · Built by Darren · 2026</div>
    <div><a href="/about.html">About</a> · <a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a></div>
  </div>
</footer>

<script src="/lib/countries.js"></script>
<script>
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
    : 'No general allowance — file from $1 of net income.';
  $('vat-threshold').textContent = t.vat_threshold_amount
    ? `${formatAmount(t.vat_threshold_amount, pack)} turnover/year`
    : 'No VAT/GST in this country (or not applicable to tutoring services).';

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
</script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
cd /c/Users/darre/slatework && git add tax.html && git commit -m "feat(p1): tax & self-employment page (country-aware: forms, thresholds, registration)"
```

---

### Task 1.8: Tool 3 — Insurance & safeguarding (`insurance.html`)

**Files:**
- Create: `slatework/insurance.html`

- [ ] **Step 1: Write `insurance.html`**

Path: `slatework/insurance.html`

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Insurance &amp; safeguarding for tutors — Slatework</title>
  <meta name="description" content="Public liability, professional indemnity, and safeguarding (DBS / WWCC / Garda) basics for independent language tutors — what's typical, what providers cover, what it costs." />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="canonical" href="https://slatework.tools/insurance.html" />
  <link rel="stylesheet" href="/lib/styles.css" />
</head>
<body>
<header class="site-header">
  <a class="brand" href="/"><svg width="22" height="22" viewBox="0 0 64 64" aria-hidden="true"><rect x="6" y="10" width="52" height="44" rx="6" fill="#475569" stroke="#334155" stroke-width="2"/><line x1="16" y1="22" x2="48" y2="22" stroke="#cbd5e1" stroke-width="1.6" stroke-linecap="round"/><line x1="16" y1="32" x2="42" y2="32" stroke="#cbd5e1" stroke-width="1.6" stroke-linecap="round"/><line x1="16" y1="42" x2="38" y2="42" stroke="#cbd5e1" stroke-width="1.6" stroke-linecap="round"/></svg>Slatework</a>
  <nav><a href="/about.html">About</a><a href="/">Tools</a></nav>
</header>

<main class="container">
  <h1>Insurance &amp; safeguarding</h1>
  <p>What insurance independent tutors actually carry, and what safeguarding step is expected when teaching minors. Country-aware.</p>

  <div class="privacy-notice">Information only. Quote a couple of providers and read the actual policy before buying — coverage detail varies.</div>

  <form id="form">
    <div class="field">
      <label for="country">Country</label>
      <select id="country" name="country" required></select>
    </div>
  </form>

  <section id="result" style="display:none;">
    <h2 id="country-title"></h2>

    <h3>Public liability — what's typical</h3>
    <div id="pl-block" class="result"></div>

    <h3>Providers tutors often use</h3>
    <ul id="provider-list" class="checklist"></ul>

    <h3>Safeguarding (working with minors)</h3>
    <div class="result">
      <div class="row"><span><strong>Background check name</strong></span><strong id="bgc-name"></strong></div>
      <div class="row"><span><strong>Cost</strong></span><strong id="bgc-cost"></strong></div>
      <div class="row"><span><strong>Where</strong></span><strong><a id="bgc-url" target="_blank" rel="noopener">Apply →</a></strong></div>
      <p class="small" id="bgc-notes" style="margin: 0.6rem 0 0;"></p>
    </div>

    <h3>The "what to do if" basics</h3>
    <ul class="checklist">
      <li>Always teach minors with a parent or guardian on-record (online: visible camera angle preferred; in-person: never alone in a closed room).</li>
      <li>Keep written copies of session notes — date, duration, what was taught, what was assigned.</li>
      <li>Have a one-page safeguarding statement you give parents at intake. Free template in the <a href="/contract.html">contract builder</a>.</li>
      <li>Know your country's mandatory-reporting threshold for child-protection concerns.</li>
    </ul>

    <p class="small" id="last-verified"></p>
  </section>
</main>

<footer class="site-footer">
  <div class="row">
    <div><strong>Slatework</strong> · Built by Darren · 2026</div>
    <div><a href="/about.html">About</a> · <a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a></div>
  </div>
</footer>

<script src="/lib/countries.js"></script>
<script>
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
  const ins = pack.insurance || {};
  const bgc = pack.background_check || {};

  $('country-title').textContent = pack.name;

  $('pl-block').innerHTML = `
    <div class="row"><span>Typical public-liability cover</span><strong>${ins.public_liability_typical_amount ? formatAmount(ins.public_liability_typical_amount, pack) : '—'}</strong></div>
    ${ins.notes ? `<p class="small" style="margin: 0.6rem 0 0;">${escapeHtml(ins.notes)}</p>` : ''}
  `;

  const ul = $('provider-list');
  ul.innerHTML = '';
  for (const p of (ins.providers || [])) {
    const li = document.createElement('li');
    li.innerHTML = `<a href="${escapeAttr(p.url)}" target="_blank" rel="noopener">${escapeHtml(p.name)}</a>`;
    ul.appendChild(li);
  }

  $('bgc-name').textContent = bgc.name || '—';
  $('bgc-cost').textContent = bgc.cost_amount === 0 ? 'Free' : (bgc.cost_amount != null ? formatAmount(bgc.cost_amount, pack) : '—');
  $('bgc-url').href = bgc.url || '#';
  $('bgc-notes').textContent = bgc.notes || '';

  $('last-verified').textContent = `Verified ${pack.data_source_last_verified}.`;
  $('result').style.display = 'block';
}

function formatAmount(n, pack) {
  return new Intl.NumberFormat(pack.locale_default, { style: 'currency', currency: pack.currency, maximumFractionDigits: 0 }).format(n);
}
function escapeHtml(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function escapeAttr(s) { return escapeHtml(s); }
</script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
cd /c/Users/darre/slatework && git add insurance.html && git commit -m "feat(p1): insurance & safeguarding page"
```

---

### Task 1.9: Tool 6 — Parent-tutor contract builder (`contract.html`)

Generates a downloadable contract entirely client-side using browser print-to-PDF. No server, no PII transmitted.

**Files:**
- Create: `slatework/contract.html`

- [ ] **Step 1: Write `contract.html`**

Path: `slatework/contract.html`

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Parent-tutor contract builder — Slatework</title>
  <meta name="description" content="Generate a printable parent-tutor lesson agreement with your name, rate, cancellation policy, and a parent-welcome paragraph — entirely in your browser." />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="canonical" href="https://slatework.tools/contract.html" />
  <link rel="stylesheet" href="/lib/styles.css" />
  <style>
    @media print {
      .no-print { display: none !important; }
      body { background: #fff; }
      .container { max-width: none; padding: 1.5cm; }
      .preview { box-shadow: none; border: none; }
    }
    .preview {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: var(--radius);
      padding: 2rem;
      box-shadow: var(--shadow-sm);
      font-family: Georgia, "Times New Roman", serif;
      line-height: 1.7;
    }
    .preview h2 { font-family: inherit; font-size: 1.4rem; }
    .preview h3 { font-family: inherit; font-size: 1.05rem; margin-top: 1.6rem; }
  </style>
</head>
<body>
<header class="site-header no-print">
  <a class="brand" href="/"><svg width="22" height="22" viewBox="0 0 64 64" aria-hidden="true"><rect x="6" y="10" width="52" height="44" rx="6" fill="#475569" stroke="#334155" stroke-width="2"/><line x1="16" y1="22" x2="48" y2="22" stroke="#cbd5e1" stroke-width="1.6" stroke-linecap="round"/><line x1="16" y1="32" x2="42" y2="32" stroke="#cbd5e1" stroke-width="1.6" stroke-linecap="round"/><line x1="16" y1="42" x2="38" y2="42" stroke="#cbd5e1" stroke-width="1.6" stroke-linecap="round"/></svg>Slatework</a>
  <nav><a href="/about.html">About</a><a href="/">Tools</a></nav>
</header>

<main class="container">
  <div class="no-print">
    <h1>Parent-tutor contract builder</h1>
    <p>Fill out the form on the left and your contract previews on the right. When it looks good, print to PDF (or actual paper) — nothing is sent to our servers.</p>

    <div class="privacy-notice">Generated entirely in your browser. Your name, rate, and details never reach our servers — view source to verify.</div>
  </div>

  <div class="section-row no-print">
    <form id="form">
      <h2>Your details</h2>
      <div class="field"><label for="tutor_name">Tutor name</label><input id="tutor_name" type="text" placeholder="e.g., Sarah Chen" /></div>
      <div class="field"><label for="business_name">Business name (optional)</label><input id="business_name" type="text" placeholder="leave blank to use your name" /></div>
      <div class="field"><label for="contact_email">Contact email</label><input id="contact_email" type="email" placeholder="hello@yourdomain.com" /></div>

      <h2>Lesson details</h2>
      <div class="field"><label for="subject">Subject / language</label><input id="subject" type="text" placeholder="e.g., GCSE Spanish" value="Spanish" /></div>
      <div class="field"><label for="rate">Rate per lesson</label><input id="rate" type="text" placeholder="e.g., £40 per 60-minute lesson" value="£40 per 60-minute lesson" /></div>
      <div class="field"><label for="duration">Lesson duration</label><input id="duration" type="text" placeholder="e.g., 60 minutes" value="60 minutes" /></div>
      <div class="field"><label for="location">Location</label><input id="location" type="text" placeholder="e.g., online via Zoom, or in-person at the student's home" value="online via Zoom" /></div>

      <h2>Policy</h2>
      <div class="field"><label for="cancel_hours">Cancellation notice (hours)</label><input id="cancel_hours" type="number" min="0" max="168" step="1" value="24" /></div>
      <div class="field">
        <label for="cancel_fee">Late-cancel fee</label>
        <select id="cancel_fee">
          <option value="full">Full lesson fee</option>
          <option value="half" selected>Half lesson fee</option>
          <option value="none">No fee (rebook only)</option>
        </select>
      </div>
      <div class="field"><label for="payment_terms">Payment terms</label><input id="payment_terms" type="text" placeholder="e.g., paid weekly in advance via Faster Payments" value="paid weekly in advance" /></div>

      <h2>Parent welcome paragraph</h2>
      <div class="field">
        <label for="welcome_tone">Tone</label>
        <select id="welcome_tone">
          <option value="warm">Warm</option>
          <option value="formal">Formal</option>
          <option value="brief" selected>Brief and practical</option>
        </select>
      </div>

      <div class="field" style="margin-top:1.5rem;">
        <button type="button" id="print-btn">Print / save as PDF</button>
      </div>
    </form>

    <aside>
      <p class="small">Preview →</p>
    </aside>
  </div>

  <section class="preview" id="preview">
    <!-- Filled by JS -->
  </section>
</main>

<footer class="site-footer no-print">
  <div class="row">
    <div><strong>Slatework</strong> · Built by Darren · 2026</div>
    <div><a href="/about.html">About</a> · <a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a></div>
  </div>
</footer>

<script>
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

  const welcome = welcomePara(welcomeTone, tutor, subject);

  const today = new Date().toISOString().slice(0, 10);

  $('preview').innerHTML = `
    <h2 style="text-align:center;">${escapeHtml(subject)} — Lesson Agreement</h2>
    <p style="text-align:center;">between <strong>${escapeHtml(biz)}</strong> ("the Tutor") and the Parent or Guardian named below ("the Parent")</p>

    <h3>1. Welcome</h3>
    <p>${escapeHtml(welcome)}</p>

    <h3>2. Lessons</h3>
    <p>The Tutor will provide <strong>${escapeHtml(subject)}</strong> lessons of <strong>${escapeHtml(duration)}</strong> at the agreed rate of <strong>${escapeHtml(rate)}</strong>, delivered <strong>${escapeHtml(location)}</strong>. Lessons are scheduled by mutual agreement.</p>

    <h3>3. Trial lesson</h3>
    <p>The first lesson is offered at the standard rate. If the Parent decides not to continue after the first lesson, no further commitment applies.</p>

    <h3>4. Payment</h3>
    <p>Lessons are <strong>${escapeHtml(paymentTerms)}</strong>. The Tutor will issue a written invoice or receipt on request.</p>

    <h3>5. Cancellation policy</h3>
    <p>Lessons cancelled with at least <strong>${escapeHtml(cancelHours)}</strong> hours' notice incur no fee and may be rescheduled. Lessons cancelled with less notice incur <strong>${escapeHtml(cancelText)}</strong>. The Tutor will give the same notice in the rare event a session must be rescheduled from her side.</p>

    <h3>6. Communication</h3>
    <p>Lesson-related messaging happens via <strong>${escapeHtml(email)}</strong>. The Tutor responds during reasonable hours; a same-day reply is not guaranteed.</p>

    <h3>7. Safeguarding (where the student is a minor)</h3>
    <p>Lessons with students under 18 are conducted with a parent or guardian on-record. The Tutor maintains current background-check certification and will share documentation on request.</p>

    <h3>8. Privacy</h3>
    <p>The Tutor keeps lesson records (date, duration, topic, work assigned) and shares them with the Parent on request. The Tutor does not share student information with third parties.</p>

    <h3>9. Term</h3>
    <p>This agreement runs lesson by lesson. Either side may end it with one full week's notice.</p>

    <p style="margin-top: 3rem;">Date: <strong>${today}</strong></p>
    <p style="margin-top: 1.5rem;">Tutor signature: ___________________________</p>
    <p style="margin-top: 1rem;">Parent signature: ___________________________</p>
    <p style="margin-top: 1rem;">Parent name: ___________________________</p>
    <p style="margin-top: 1rem;">Student name: ___________________________</p>
  `;
}

function welcomePara(tone, name, subject) {
  if (tone === 'warm') return `Thank you for choosing me to support your child's ${subject} progress. I'll be straightforward, structured, and kind, and I'll keep you informed at each step. The goal of every lesson is real, visible progress — not just hours logged.`;
  if (tone === 'formal') return `This agreement governs the provision of ${subject} tutoring services by ${name}. Lessons follow a structured plan agreed with the Parent and reviewed monthly.`;
  return `I teach ${subject} clearly and consistently. You'll get a brief written note after each lesson summarising what we did and what's been set as practice. If something isn't working, please tell me — I'd rather adjust early than at the end of the term.`;
}

function escapeHtml(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

render();
</script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
cd /c/Users/darre/slatework && git add contract.html && git commit -m "feat(p1): parent-tutor contract builder (client-side, browser print-to-PDF)"
```

---

### Task 1.10: Tool 8 (rule-based mode) — CEFR proficiency mapper (`cefr.html`)

The rule-based mode is shipped now in Phase 1. The optional AI-assessed mode (toggle) is added in Phase 2 (Task 2.4) once the Pages Function exists.

**Files:**
- Create: `slatework/cefr.html`
- Create: `slatework/lib/cefr-rules.js`

- [ ] **Step 1: Write `lib/cefr-rules.js`** — the deterministic rule engine

Path: `slatework/lib/cefr-rules.js`

```javascript
// Deterministic CEFR placement based on Can-Do statements.
// Each statement maps to a CEFR level. The student's highest "yes" answer is the floor;
// the lowest "no" answer above that is the ceiling. Output is the highest "yes" level.

(() => {
  const STATEMENTS = [
    { id: 'a1_intro',    level: 'A1', q: 'Can the student introduce themselves and answer simple questions about who they are?' },
    { id: 'a1_basics',   level: 'A1', q: 'Can they understand and use basic phrases needed in daily situations (greetings, ordering, asking prices)?' },
    { id: 'a2_routine',  level: 'A2', q: 'Can they describe their family, daily routine, and what they did last weekend in simple connected sentences?' },
    { id: 'a2_short',    level: 'A2', q: 'Can they read short signs, menus, and ads and pick out the relevant information?' },
    { id: 'b1_opinion',  level: 'B1', q: 'Can they give a brief, prepared opinion on a familiar topic (a film, a city, a hobby)?' },
    { id: 'b1_travel',   level: 'B1', q: 'Can they handle most situations that arise while travelling — booking, asking for help, explaining a problem?' },
    { id: 'b2_argue',    level: 'B2', q: 'Can they argue for or against a position on a topic they know well, anticipating likely counter-arguments?' },
    { id: 'b2_news',     level: 'B2', q: 'Can they understand most TV news, podcasts, and articles on current events without needing a glossary?' },
    { id: 'c1_nuance',   level: 'C1', q: 'Can they express ideas with idiomatic nuance, switching register depending on whom they are speaking to?' },
    { id: 'c1_academic', level: 'C1', q: 'Can they read long, complex texts (literature, technical material) and summarise them accurately?' },
    { id: 'c2_native',   level: 'C2', q: 'Can they pick up subtle differences of meaning even in complex situations and write at a near-native standard?' }
  ];

  const ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  function statements() { return STATEMENTS.slice(); }

  function place(answers) {
    // answers: { [id]: 'yes'|'no'|'partial' }
    let highestYes = null;
    let lowestNo = null;
    for (const s of STATEMENTS) {
      const a = answers[s.id];
      if (a === 'yes') {
        if (highestYes == null || ORDER.indexOf(s.level) > ORDER.indexOf(highestYes)) highestYes = s.level;
      } else if (a === 'no') {
        if (lowestNo == null || ORDER.indexOf(s.level) < ORDER.indexOf(lowestNo)) lowestNo = s.level;
      }
    }
    if (highestYes == null) return { level: 'A0', confidence: 'low', notes: 'Not enough confirmed Can-Do statements to place — start at the very beginning.' };
    return {
      level: highestYes,
      confidence: lowestNo && ORDER.indexOf(lowestNo) <= ORDER.indexOf(highestYes) ? 'low' : 'medium',
      notes: lowestNo ? `Confirmed up to ${highestYes}; ceiling around ${lowestNo}.` : `Confirmed at ${highestYes}; ceiling not yet probed.`
    };
  }

  window.Slatework = window.Slatework || {};
  window.Slatework.cefrStatements = statements;
  window.Slatework.cefrPlace = place;
})();
```

- [ ] **Step 2: Write `cefr.html`**

Path: `slatework/cefr.html`

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>CEFR proficiency mapper — Slatework</title>
  <meta name="description" content="Place a language student at A1–C2 using the CEFR Can-Do framework. Default rule-based assessment with an optional AI mode for sample-writing input." />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="canonical" href="https://slatework.tools/cefr.html" />
  <link rel="stylesheet" href="/lib/styles.css" />
</head>
<body>
<header class="site-header">
  <a class="brand" href="/"><svg width="22" height="22" viewBox="0 0 64 64" aria-hidden="true"><rect x="6" y="10" width="52" height="44" rx="6" fill="#475569" stroke="#334155" stroke-width="2"/><line x1="16" y1="22" x2="48" y2="22" stroke="#cbd5e1" stroke-width="1.6" stroke-linecap="round"/><line x1="16" y1="32" x2="42" y2="32" stroke="#cbd5e1" stroke-width="1.6" stroke-linecap="round"/><line x1="16" y1="42" x2="38" y2="42" stroke="#cbd5e1" stroke-width="1.6" stroke-linecap="round"/></svg>Slatework</a>
  <nav><a href="/about.html">About</a><a href="/">Tools</a></nav>
</header>

<main class="container">
  <h1>CEFR proficiency mapper</h1>
  <p>Place a student at A1, A2, B1, B2, C1, or C2 using the standard CEFR Can-Do statements. Pick the mode that matches the moment.</p>

  <div role="tablist" style="display:flex; gap:0.5rem; margin: 1rem 0;">
    <button id="tab-rules" type="button" class="btn" aria-selected="true">Rule-based (private)</button>
    <button id="tab-ai" type="button" class="btn secondary" aria-selected="false">AI from writing sample</button>
  </div>

  <section id="rules-mode">
    <div class="privacy-notice">Runs entirely in your browser. We don't see anything you enter.</div>
    <form id="rules-form">
      <p>Answer for each statement: <em>Yes</em>, <em>Partial</em>, or <em>No</em>.</p>
      <div id="statements"></div>
      <button type="button" id="rules-go" style="margin-top:1rem;">Place the student</button>
    </form>
    <section id="rules-result" class="result" style="display:none;"></section>
  </section>

  <section id="ai-mode" style="display:none;">
    <div class="privacy-notice"><strong>Don't include the student's name or identifying info.</strong> The writing sample is sent to Anthropic for processing and is not stored by us.</div>
    <form id="ai-form">
      <div class="field">
        <label for="lang">Language being assessed</label>
        <input id="lang" type="text" placeholder="e.g., Spanish" required />
      </div>
      <div class="field">
        <label for="sample">Anonymised writing sample (50–500 words)</label>
        <textarea id="sample" required minlength="100" maxlength="3000" placeholder="Paste the student's writing here. Remove names and identifying details first."></textarea>
      </div>
      <button type="submit" id="ai-go">Assess</button>
    </form>
    <section id="ai-result" class="result" style="display:none;"></section>
  </section>
</main>

<footer class="site-footer">
  <div class="row">
    <div><strong>Slatework</strong> · Built by Darren · 2026</div>
    <div><a href="/about.html">About</a> · <a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a></div>
  </div>
</footer>

<script src="/lib/cefr-rules.js"></script>
<script>
const SW = window.Slatework;
const $ = (id) => document.getElementById(id);

// --- Tab switching
const rulesMode = $('rules-mode');
const aiMode = $('ai-mode');
const tabRules = $('tab-rules');
const tabAi = $('tab-ai');

tabRules.addEventListener('click', () => {
  rulesMode.style.display = '';
  aiMode.style.display = 'none';
  tabRules.classList.remove('secondary'); tabAi.classList.add('secondary');
  tabRules.setAttribute('aria-selected', 'true'); tabAi.setAttribute('aria-selected', 'false');
});
tabAi.addEventListener('click', () => {
  rulesMode.style.display = 'none';
  aiMode.style.display = '';
  tabAi.classList.remove('secondary'); tabRules.classList.add('secondary');
  tabAi.setAttribute('aria-selected', 'true'); tabRules.setAttribute('aria-selected', 'false');
});

// --- Rule-based mode
const statementsBox = $('statements');
const stmts = SW.cefrStatements();
for (const s of stmts) {
  const div = document.createElement('div');
  div.className = 'field';
  div.innerHTML = `
    <label>${escapeHtml(s.q)}</label>
    <div style="display:flex; gap:1rem;">
      <label><input type="radio" name="${s.id}" value="yes" /> Yes</label>
      <label><input type="radio" name="${s.id}" value="partial" /> Partial</label>
      <label><input type="radio" name="${s.id}" value="no" checked /> No</label>
    </div>
  `;
  statementsBox.appendChild(div);
}

$('rules-go').addEventListener('click', () => {
  const answers = {};
  for (const s of stmts) {
    const sel = document.querySelector(`input[name="${s.id}"]:checked`);
    answers[s.id] = sel ? sel.value : 'no';
  }
  const out = SW.cefrPlace(answers);
  const r = $('rules-result');
  r.innerHTML = `
    <div class="row"><span>Placement</span><strong>${out.level}</strong></div>
    <div class="row"><span>Confidence</span><strong>${out.confidence}</strong></div>
    <p class="small" style="margin-top:0.6rem;">${escapeHtml(out.notes)}</p>
  `;
  r.style.display = 'block';
});

// --- AI mode (wired in Phase 2 — endpoint exists in Phase 2)
$('ai-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const result = $('ai-result');
  const btn = $('ai-go');
  btn.disabled = true;
  result.style.display = 'block';
  result.innerHTML = '<p>Assessing…</p>';
  try {
    const r = await fetch('/api/cefr-assess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: $('lang').value, sample: $('sample').value })
    });
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      result.innerHTML = '<p>' + escapeHtml(e.error || 'Could not assess. Try again in a moment.') + '</p>';
      return;
    }
    const data = await r.json();
    result.innerHTML = `
      <div class="row"><span>Placement</span><strong>${escapeHtml(data.level || '—')}</strong></div>
      <div class="row"><span>Confidence</span><strong>${escapeHtml(data.confidence || '—')}</strong></div>
      <h3 style="margin-top:0.6rem;">Reasoning</h3>
      <p>${escapeHtml(data.reasoning || '').replace(/\n/g, '<br>')}</p>
    `;
  } catch {
    result.innerHTML = '<p>Network error. Try again in a moment.</p>';
  } finally {
    btn.disabled = false;
  }
});

function escapeHtml(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
</script>
</body>
</html>
```

- [ ] **Step 3: Commit**

```bash
cd /c/Users/darre/slatework && git add lib/cefr-rules.js cefr.html && git commit -m "feat(p1): CEFR mapper with rule-based mode (AI mode wired, endpoint comes in Phase 2)"
```

---

### Phase 1 checkpoint

- [ ] Homepage at `/` lists all 10 tool tiles
- [ ] `/privacy.html`, `/terms.html`, `/about.html`, `/404.html` render
- [ ] All 6 client-side tools render and respond to country changes
- [ ] All commits use `feat(p1): ...` prefix
- [ ] No client-side network calls except to `/data/countries/*.json`, `/api/fx`, and `/api/newsletter` (the last two may 404 in dev — that's fine)

End of Phase 1.

---

## Phase 2 — LLM-backed tools

Phase 2 adds the 4 Pages Functions that proxy to Anthropic Claude, plus the UI for the 3 LLM-only tools (Lesson plan, Worksheet, Marking). The CEFR AI mode UI was wired in Phase 1; Task 2.3 only ships its server endpoint.

All endpoints follow the Authorly `bio.js` pattern: per-IP daily rate limit + global daily rate limit, no body logging, system prompt as a joined array, strict input validation. They live in `functions/api/*.js` so Cloudflare Pages serves them automatically.

### Task 2.1: Pages Functions shared helpers + KV setup

The middleware Authorly uses is small and per-function. We follow the same pattern: each LLM endpoint imports a tiny helpers module via relative path. This keeps Cloudflare Pages happy (no build step needed).

**Files:**
- Create: `slatework/functions/_lib.js`
- Create: `slatework/wrangler.toml` (for `wrangler pages dev` KV bindings)

- [ ] **Step 1: Write `functions/_lib.js`** — shared helpers for all LLM endpoints

Path: `slatework/functions/_lib.js`

```javascript
// Shared helpers for Pages Functions. Imported via relative path from each
// endpoint, e.g.: import { jsonResponse, rateCheck, callClaude } from "../_lib.js";

export function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      ...extraHeaders
    }
  });
}

export async function ipHash(request) {
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
  // Day-bucketed hash so the fingerprint rotates daily and we don't hold a
  // long-term identifier of the user.
  const day = new Date().toISOString().slice(0, 10);
  const enc = new TextEncoder().encode(ip + ':' + day);
  const hash = await crypto.subtle.digest('SHA-256', enc);
  return [...new Uint8Array(hash)].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function rateCheck(env, fingerprint, tool, perIpDaily, globalDaily) {
  if (!env.RATE_LIMITS) {
    return { ok: true, reason: 'KV not configured (dev)' };
  }
  const day = new Date().toISOString().slice(0, 10);
  const ipKey = `ip:${tool}:${fingerprint}:${day}`;
  const globalKey = `global:${tool}:${day}`;

  const [ipCountStr, globalCountStr] = await Promise.all([
    env.RATE_LIMITS.get(ipKey),
    env.RATE_LIMITS.get(globalKey)
  ]);
  const ipCount = parseInt(ipCountStr || '0', 10);
  const globalCount = parseInt(globalCountStr || '0', 10);

  if (ipCount >= perIpDaily) return { ok: false, status: 429, reason: 'Personal daily limit reached. Try tomorrow.' };
  if (globalCount >= globalDaily) return { ok: false, status: 429, reason: 'Site-wide daily limit reached. Try in a few hours.' };

  await Promise.all([
    env.RATE_LIMITS.put(ipKey, String(ipCount + 1), { expirationTtl: 86400 * 2 }),
    env.RATE_LIMITS.put(globalKey, String(globalCount + 1), { expirationTtl: 86400 * 2 })
  ]);
  return { ok: true };
}

export async function callClaude(env, { model, system, user, max_tokens = 1500 }) {
  const body = {
    model,
    max_tokens,
    system,
    messages: [{ role: 'user', content: user }]
  };
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!r.ok) {
    const errText = await r.text();
    throw new Error('Anthropic API error ' + r.status + ': ' + errText.slice(0, 500));
  }
  const data = await r.json();
  return (data.content || []).map(c => c.text || '').join('');
}
```

- [ ] **Step 2: Write `wrangler.toml` so `wrangler pages dev` binds KV namespaces locally**

Path: `slatework/wrangler.toml`

```toml
# Slatework — Cloudflare Pages config for local dev (`wrangler pages dev .`).
# Production KV namespaces are bound via the Cloudflare dashboard.
name = "slatework"
compatibility_date = "2025-09-01"
pages_build_output_dir = "."

[[kv_namespaces]]
binding = "RATE_LIMITS"
id = "rate_limits_local_dev"

[[kv_namespaces]]
binding = "FX_CACHE"
id = "fx_cache_local_dev"
```

- [ ] **Step 3: Verify dev server boots with KV bindings**

```bash
cd /c/Users/darre/slatework && npx -y wrangler@3 pages dev . --port 8788 --kv RATE_LIMITS --kv FX_CACHE &
sleep 3
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8788/
kill %1 2>/dev/null
```

Expected: `200`.

- [ ] **Step 4: Commit**

```bash
cd /c/Users/darre/slatework && git add functions/_lib.js wrangler.toml && git commit -m "feat(p2): shared Pages Functions helpers (jsonResponse, ipHash, rateCheck, callClaude) + dev wrangler.toml"
```

---

### Task 2.2: Lesson plan API + UI (`functions/api/lesson-plan.js`, `lesson-plan.html`)

**Files:**
- Create: `slatework/functions/api/lesson-plan.js`
- Create: `slatework/lesson-plan.html`

- [ ] **Step 1: Write the Pages Function**

Path: `slatework/functions/api/lesson-plan.js`

```javascript
// POST /api/lesson-plan
// Generates a structured language lesson plan (1:1, small group, or classroom).

import { jsonResponse, ipHash, rateCheck, callClaude } from "../_lib.js";

const SYSTEM_PROMPT = [
  "You are an experienced language teacher. Given a target language, source language, CEFR level, mode (1:1 / small group / classroom), and lesson goal, produce a focused, time-blocked lesson plan that another teacher could pick up and run.",
  "",
  "Strict rules:",
  "- Always return Markdown with the exact section headers shown below.",
  "- Pick activities that are level-appropriate. A B1 lesson should not assume A1 vocabulary, nor demand C1 essay structure.",
  "- For classroom mode, plan for 25 students unless told otherwise: include grouping decisions and an exit ticket.",
  "- For 1:1 mode, lean into individual feedback opportunities.",
  "- Be concrete. Don't say \"do a warmup\" — say what the warmup is.",
  "- Time the plan to fit a 60-minute lesson by default; adjust if the user specifies otherwise.",
  "",
  "Format your response as Markdown:",
  "",
  "## Lesson at a glance",
  "[1–2 sentences naming target language, level, goal, and how the lesson will reach it.]",
  "",
  "## Materials",
  "[Bulleted list. If a handout or worksheet is needed, name it; reference Slatework's worksheet generator if the teacher will create it.]",
  "",
  "## Warmup (5 min)",
  "[Concrete activity, with what to say and what to ask.]",
  "",
  "## Core teaching block (20 min)",
  "[The main teaching moment. Show the structure being taught with a concrete example in the target language. Include 1 modelling step and 1 guided practice step.]",
  "",
  "## Practice / production (20 min)",
  "[Activity where students use the language. Include grouping for classroom mode.]",
  "",
  "## Wrap-up + assignment (10 min)",
  "[Brief recap. Concrete homework or extension task.]",
  "",
  "## Exit ticket (classroom mode) or feedback prompt (1:1 / small group)",
  "[A single question or task that lets the teacher gauge whether the lesson stuck.]",
  "",
  "## Differentiation notes",
  "[2–3 sentences on how to adjust if a student is ahead or struggling.]"
].join("\n");

const MODEL = "claude-sonnet-4-6";
const PER_IP_DAILY = 15;
const GLOBAL_DAILY = 1500;
const MIN_GOAL_LEN = 10;
const MAX_GOAL_LEN = 600;

const VALID_MODES = ['one_to_one', 'small_group', 'classroom'];
const VALID_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid request format.' }, 400); }

  const target = String(body.target_language || '').trim();
  const source = String(body.source_language || 'English').trim();
  const level = String(body.level || '').trim().toUpperCase();
  const mode = String(body.mode || 'one_to_one').trim();
  const goal = String(body.goal || '').trim();

  if (!target) return jsonResponse({ error: 'Missing target language.' }, 400);
  if (!VALID_LEVELS.includes(level)) return jsonResponse({ error: 'Level must be one of A1, A2, B1, B2, C1, C2.' }, 400);
  if (!VALID_MODES.includes(mode)) return jsonResponse({ error: 'Mode must be one_to_one, small_group, or classroom.' }, 400);
  if (goal.length < MIN_GOAL_LEN) return jsonResponse({ error: 'Lesson goal too short. 10+ characters please.' }, 400);
  if (goal.length > MAX_GOAL_LEN) return jsonResponse({ error: 'Lesson goal too long. Keep it under 600 characters.' }, 400);

  if (!env.ANTHROPIC_API_KEY) return jsonResponse({ error: 'Service is being configured. Try again in a few minutes.' }, 503);

  const fp = await ipHash(request);
  const rate = await rateCheck(env, fp, 'lesson_plan', PER_IP_DAILY, GLOBAL_DAILY);
  if (!rate.ok) return jsonResponse({ error: rate.reason }, rate.status || 429);

  const userMsg = [
    `Target language: ${target}`,
    `Source language: ${source}`,
    `CEFR level: ${level}`,
    `Mode: ${mode.replace('_', ' ')}`,
    `Lesson goal: ${goal}`
  ].join('\n');

  try {
    const text = await callClaude(env, { model: MODEL, system: SYSTEM_PROMPT, user: userMsg, max_tokens: 2000 });
    return jsonResponse({ markdown: text }, 200);
  } catch (e) {
    return jsonResponse({ error: 'Could not generate the lesson plan. Try again in a moment.' }, 502);
  }
}
```

- [ ] **Step 2: Write the UI page**

Path: `slatework/lesson-plan.html`

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Lesson plan generator — Slatework</title>
  <meta name="description" content="Generate a structured, level-appropriate language lesson plan for 1:1, small group, or classroom mode — in seconds. Free and private." />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="canonical" href="https://slatework.tools/lesson-plan.html" />
  <link rel="stylesheet" href="/lib/styles.css" />
</head>
<body>
<header class="site-header">
  <a class="brand" href="/"><svg width="22" height="22" viewBox="0 0 64 64" aria-hidden="true"><rect x="6" y="10" width="52" height="44" rx="6" fill="#475569" stroke="#334155" stroke-width="2"/><line x1="16" y1="22" x2="48" y2="22" stroke="#cbd5e1" stroke-width="1.6" stroke-linecap="round"/><line x1="16" y1="32" x2="42" y2="32" stroke="#cbd5e1" stroke-width="1.6" stroke-linecap="round"/><line x1="16" y1="42" x2="38" y2="42" stroke="#cbd5e1" stroke-width="1.6" stroke-linecap="round"/></svg>Slatework</a>
  <nav><a href="/about.html">About</a><a href="/">Tools</a></nav>
</header>

<main class="container">
  <h1>Lesson plan generator <span class="tag">AI</span></h1>
  <p>Tell it the language, level, mode, and goal — get back a structured 60-minute plan with warmup, core teaching block, practice, wrap-up, and exit ticket.</p>

  <div class="privacy-notice">Your inputs are sent to Anthropic for generation but are not stored by us. Don't include student names.</div>

  <form id="form">
    <div class="section-row">
      <div class="field">
        <label for="target">Target language</label>
        <input id="target" type="text" placeholder="e.g., Spanish" required />
      </div>
      <div class="field">
        <label for="source">Source language</label>
        <input id="source" type="text" placeholder="English" value="English" required />
      </div>
    </div>

    <div class="section-row">
      <div class="field">
        <label for="level">CEFR level</label>
        <select id="level" required>
          <option value="A1">A1 — Beginner</option>
          <option value="A2">A2 — Elementary</option>
          <option value="B1" selected>B1 — Intermediate</option>
          <option value="B2">B2 — Upper-intermediate</option>
          <option value="C1">C1 — Advanced</option>
          <option value="C2">C2 — Mastery</option>
        </select>
      </div>
      <div class="field">
        <label for="mode">Mode</label>
        <select id="mode" required>
          <option value="one_to_one" selected>1:1</option>
          <option value="small_group">Small group (3–6)</option>
          <option value="classroom">Classroom (25)</option>
        </select>
      </div>
    </div>

    <div class="field">
      <label for="goal">Lesson goal</label>
      <textarea id="goal" required minlength="10" maxlength="600" placeholder="e.g., Practise the past simple in the context of weekend activities, focusing on irregular verbs."></textarea>
      <span class="help">10–600 characters. The clearer the goal, the more useful the plan.</span>
    </div>

    <button type="submit" id="go">Generate plan</button>
  </form>

  <section id="result" class="result" style="display:none;"></section>
</main>

<footer class="site-footer">
  <div class="row">
    <div><strong>Slatework</strong> · Built by Darren · 2026</div>
    <div><a href="/about.html">About</a> · <a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a></div>
  </div>
</footer>

<script>
const $ = (id) => document.getElementById(id);

$('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('go');
  const result = $('result');
  btn.disabled = true;
  result.style.display = 'block';
  result.innerHTML = '<p>Generating…</p>';

  try {
    const r = await fetch('/api/lesson-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_language: $('target').value,
        source_language: $('source').value,
        level: $('level').value,
        mode: $('mode').value,
        goal: $('goal').value
      })
    });
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      result.innerHTML = '<p>' + escapeHtml(e.error || 'Could not generate plan. Try again.') + '</p>';
      return;
    }
    const data = await r.json();
    result.innerHTML = '<div id="md">' + renderMarkdown(data.markdown || '') + '</div><p class="small" style="margin-top:1rem;">Tip: select all and paste into your notes; the formatting comes through.</p>';
  } catch {
    result.innerHTML = '<p>Network error. Try again in a moment.</p>';
  } finally {
    btn.disabled = false;
  }
});

function renderMarkdown(md) {
  // Tiny markdown subset: headers (## ###), lists (- ), paragraphs.
  const lines = md.split('\n');
  let html = '';
  let inList = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (inList) { html += '</ul>'; inList = false; }
      html += '\n';
      continue;
    }
    if (line.startsWith('### ')) { if (inList) { html += '</ul>'; inList = false; } html += '<h3>' + escapeHtml(line.slice(4)) + '</h3>'; }
    else if (line.startsWith('## ')) { if (inList) { html += '</ul>'; inList = false; } html += '<h2>' + escapeHtml(line.slice(3)) + '</h2>'; }
    else if (line.startsWith('- ')) { if (!inList) { html += '<ul>'; inList = true; } html += '<li>' + escapeHtml(line.slice(2)) + '</li>'; }
    else { if (inList) { html += '</ul>'; inList = false; } html += '<p>' + escapeHtml(line) + '</p>'; }
  }
  if (inList) html += '</ul>';
  return html;
}

function escapeHtml(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
</script>
</body>
</html>
```

- [ ] **Step 3: Verify the endpoint via curl (with `ANTHROPIC_API_KEY` exported)**

```bash
cd /c/Users/darre/slatework && \
  ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
  npx -y wrangler@3 pages dev . --port 8788 --kv RATE_LIMITS --kv FX_CACHE \
  --binding ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" &
sleep 4
curl -s -X POST http://localhost:8788/api/lesson-plan \
  -H "Content-Type: application/json" \
  -d '{"target_language":"Spanish","source_language":"English","level":"B1","mode":"one_to_one","goal":"Past simple with irregular verbs in a weekend-activities context"}' \
  | head -c 400
kill %1 2>/dev/null
```

Expected: JSON response containing `markdown` field with `## Lesson at a glance` header.

If `ANTHROPIC_API_KEY` is not set, expect `503` with "Service is being configured" — that's the right failure mode.

- [ ] **Step 4: Commit**

```bash
cd /c/Users/darre/slatework && git add functions/api/lesson-plan.js lesson-plan.html && git commit -m "feat(p2): lesson plan generator (Pages Function + UI)"
```

---

### Task 2.3: CEFR AI assessment endpoint (`functions/api/cefr-assess.js`)

The UI for AI mode was wired in Phase 1, Task 1.10. This task only ships the server-side endpoint.

**Files:**
- Create: `slatework/functions/api/cefr-assess.js`

- [ ] **Step 1: Write the endpoint**

Path: `slatework/functions/api/cefr-assess.js`

```javascript
// POST /api/cefr-assess
// Assesses a writing sample against the CEFR scale and returns level + reasoning.

import { jsonResponse, ipHash, rateCheck, callClaude } from "../_lib.js";

const SYSTEM_PROMPT = [
  "You are an experienced language assessor familiar with the CEFR (Common European Framework of Reference for Languages). Given a writing sample in a specified target language, place the writer at one of A1, A2, B1, B2, C1, or C2.",
  "",
  "Strict rules:",
  "- Always cite specific evidence from the sample (a sentence, a structure, a vocabulary range) — do not give a level without naming what justifies it.",
  "- If the sample is too short or off-topic to assess, say so and suggest what additional sample would be needed.",
  "- Confidence is one of: high (≥3 strong evidence points), medium (1–2 evidence points), low (limited evidence).",
  "- Output is JSON only — no markdown, no commentary outside the object.",
  "",
  "Output exactly this JSON shape:",
  '{"level": "B1", "confidence": "medium", "reasoning": "Multi-paragraph explanation citing specific evidence from the sample."}'
].join("\n");

const MODEL = "claude-sonnet-4-6";
const PER_IP_DAILY = 15;
const GLOBAL_DAILY = 1500;
const MIN_SAMPLE_LEN = 100;
const MAX_SAMPLE_LEN = 3000;

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid request format.' }, 400); }

  const language = String(body.language || '').trim();
  const sample = String(body.sample || '').trim();

  if (!language) return jsonResponse({ error: 'Missing target language.' }, 400);
  if (sample.length < MIN_SAMPLE_LEN) return jsonResponse({ error: 'Sample too short. Paste at least 100 characters.' }, 400);
  if (sample.length > MAX_SAMPLE_LEN) return jsonResponse({ error: 'Sample too long. Keep it under 3000 characters.' }, 400);

  if (!env.ANTHROPIC_API_KEY) return jsonResponse({ error: 'Service is being configured. Try again in a few minutes.' }, 503);

  const fp = await ipHash(request);
  const rate = await rateCheck(env, fp, 'cefr_assess', PER_IP_DAILY, GLOBAL_DAILY);
  if (!rate.ok) return jsonResponse({ error: rate.reason }, rate.status || 429);

  const userMsg = `Target language: ${language}\n\nWriting sample:\n"""\n${sample}\n"""`;

  try {
    const text = await callClaude(env, { model: MODEL, system: SYSTEM_PROMPT, user: userMsg, max_tokens: 800 });
    let parsed;
    try {
      const m = text.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : null;
    } catch {}
    if (!parsed || !parsed.level) {
      return jsonResponse({ error: 'Assessment came back malformed. Try again.' }, 502);
    }
    return jsonResponse({
      level: parsed.level,
      confidence: parsed.confidence || 'medium',
      reasoning: parsed.reasoning || ''
    }, 200);
  } catch {
    return jsonResponse({ error: 'Could not assess. Try again in a moment.' }, 502);
  }
}
```

- [ ] **Step 2: Verify the endpoint**

With `ANTHROPIC_API_KEY` exported and the dev server running, paste a known B1-level Spanish sample and verify the response shape:

```bash
curl -s -X POST http://localhost:8788/api/cefr-assess \
  -H "Content-Type: application/json" \
  -d '{"language":"Spanish","sample":"Me llamo Ana y vivo en Madrid. El fin de semana pasado fui al cine con mis amigos. La película era interesante pero un poco larga. Después comimos en un restaurante italiano en el centro. Yo pedí pasta y mi amiga pidió pizza. Lo pasamos muy bien. El domingo por la mañana, fui al parque con mi perro y leí un libro durante dos horas."}'
```

Expected: JSON response with `level`, `confidence`, `reasoning` fields. Level should be A2 or B1 for this sample.

- [ ] **Step 3: Commit**

```bash
cd /c/Users/darre/slatework && git add functions/api/cefr-assess.js && git commit -m "feat(p2): CEFR AI assessment endpoint (UI wired in Phase 1)"
```

---

### Task 2.4: Worksheet + answer-key generator (`functions/api/worksheet.js`, `worksheet.html`)

**Files:**
- Create: `slatework/functions/api/worksheet.js`
- Create: `slatework/worksheet.html`

- [ ] **Step 1: Write the Pages Function**

Path: `slatework/functions/api/worksheet.js`

```javascript
// POST /api/worksheet
// Generates a printable language worksheet plus a matching answer key.

import { jsonResponse, ipHash, rateCheck, callClaude } from "../_lib.js";

const SYSTEM_PROMPT = [
  "You are a language teacher who designs print-ready worksheets and matched answer keys. Given a target language, level, topic, question count, and format, produce a worksheet a teacher could photocopy and a separate answer key the teacher keeps.",
  "",
  "Strict rules:",
  "- Match the requested format: gap_fill (one missing word per blank), multiple_choice (4 options, exactly one correct), short_answer (one-sentence response), or reading_comprehension (one short text + 5–8 questions).",
  "- Keep questions level-appropriate. A B1 worksheet must not require A1 vocabulary or C1 essay form.",
  "- Number every question.",
  "- The answer key must list answers by the same numbers, with a one-sentence note explaining the answer where useful.",
  "- Do not include student names, identifying details, or location-specific facts.",
  "",
  "Output is Markdown with two sections separated by a horizontal rule. The boundary is exactly the line `---ANSWER-KEY---` so the client can split.",
  "",
  "Format:",
  "",
  "## [Worksheet title — by language, level, and topic]",
  "**Instructions:** [one or two sentences]",
  "",
  "1. [Question 1]",
  "2. [Question 2]",
  "...",
  "",
  "---ANSWER-KEY---",
  "",
  "## Answer Key — [same title]",
  "1. [Answer 1] — [optional one-sentence note]",
  "2. [Answer 2] — [optional one-sentence note]",
  "..."
].join("\n");

const MODEL = "claude-sonnet-4-6";
const PER_IP_DAILY = 15;
const GLOBAL_DAILY = 1500;
const VALID_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const VALID_FORMATS = ['gap_fill', 'multiple_choice', 'short_answer', 'reading_comprehension'];

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid request format.' }, 400); }

  const target = String(body.target_language || '').trim();
  const level = String(body.level || '').trim().toUpperCase();
  const topic = String(body.topic || '').trim();
  const format = String(body.format || 'gap_fill').trim();
  const count = Math.max(3, Math.min(20, parseInt(body.count, 10) || 8));

  if (!target) return jsonResponse({ error: 'Missing target language.' }, 400);
  if (!VALID_LEVELS.includes(level)) return jsonResponse({ error: 'Level must be A1–C2.' }, 400);
  if (topic.length < 2) return jsonResponse({ error: 'Topic too short.' }, 400);
  if (topic.length > 200) return jsonResponse({ error: 'Topic too long (200 chars max).' }, 400);
  if (!VALID_FORMATS.includes(format)) return jsonResponse({ error: 'Format must be gap_fill, multiple_choice, short_answer, or reading_comprehension.' }, 400);

  if (!env.ANTHROPIC_API_KEY) return jsonResponse({ error: 'Service is being configured. Try again in a few minutes.' }, 503);

  const fp = await ipHash(request);
  const rate = await rateCheck(env, fp, 'worksheet', PER_IP_DAILY, GLOBAL_DAILY);
  if (!rate.ok) return jsonResponse({ error: rate.reason }, rate.status || 429);

  const userMsg = [
    `Target language: ${target}`,
    `CEFR level: ${level}`,
    `Topic: ${topic}`,
    `Format: ${format}`,
    `Number of questions: ${count}`
  ].join('\n');

  try {
    const text = await callClaude(env, { model: MODEL, system: SYSTEM_PROMPT, user: userMsg, max_tokens: 2500 });
    const idx = text.indexOf('---ANSWER-KEY---');
    if (idx < 0) {
      return jsonResponse({ markdown: text, worksheet: text, answer_key: '' }, 200);
    }
    return jsonResponse({
      worksheet: text.slice(0, idx).trim(),
      answer_key: text.slice(idx + '---ANSWER-KEY---'.length).trim()
    }, 200);
  } catch {
    return jsonResponse({ error: 'Could not generate the worksheet. Try again in a moment.' }, 502);
  }
}
```

- [ ] **Step 2: Write the UI**

Path: `slatework/worksheet.html`

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Worksheet + answer-key generator — Slatework</title>
  <meta name="description" content="Generate a printable language worksheet plus a matching answer key in seconds — pick the topic, level, format, and question count. Free and private." />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="canonical" href="https://slatework.tools/worksheet.html" />
  <link rel="stylesheet" href="/lib/styles.css" />
  <style>
    @media print {
      .no-print { display: none !important; }
      body { background: #fff; }
      .container { max-width: none; padding: 1.5cm; }
      .result { box-shadow: none; border: none; padding: 0; }
    }
    #worksheet, #answer-key { font-family: Georgia, "Times New Roman", serif; line-height: 1.7; }
  </style>
</head>
<body>
<header class="site-header no-print">
  <a class="brand" href="/"><svg width="22" height="22" viewBox="0 0 64 64" aria-hidden="true"><rect x="6" y="10" width="52" height="44" rx="6" fill="#475569" stroke="#334155" stroke-width="2"/><line x1="16" y1="22" x2="48" y2="22" stroke="#cbd5e1" stroke-width="1.6" stroke-linecap="round"/><line x1="16" y1="32" x2="42" y2="32" stroke="#cbd5e1" stroke-width="1.6" stroke-linecap="round"/><line x1="16" y1="42" x2="38" y2="42" stroke="#cbd5e1" stroke-width="1.6" stroke-linecap="round"/></svg>Slatework</a>
  <nav><a href="/about.html">About</a><a href="/">Tools</a></nav>
</header>

<main class="container">
  <div class="no-print">
    <h1>Worksheet + answer-key generator <span class="tag">AI</span></h1>
    <p>Pick the language, level, topic, format, and question count — get a printable worksheet plus the answer key. Use the browser's print dialog to save as PDF.</p>

    <div class="privacy-notice">Your inputs are sent to Anthropic for generation. Don't include student names.</div>

    <form id="form">
      <div class="section-row">
        <div class="field">
          <label for="target">Target language</label>
          <input id="target" type="text" placeholder="e.g., French" required />
        </div>
        <div class="field">
          <label for="level">CEFR level</label>
          <select id="level" required>
            <option value="A1">A1</option>
            <option value="A2" selected>A2</option>
            <option value="B1">B1</option>
            <option value="B2">B2</option>
            <option value="C1">C1</option>
            <option value="C2">C2</option>
          </select>
        </div>
      </div>
      <div class="field">
        <label for="topic">Topic</label>
        <input id="topic" type="text" placeholder="e.g., Past tense with irregular verbs; ordering food at a restaurant" required maxlength="200" />
      </div>
      <div class="section-row">
        <div class="field">
          <label for="format">Format</label>
          <select id="format" required>
            <option value="gap_fill" selected>Gap fill</option>
            <option value="multiple_choice">Multiple choice</option>
            <option value="short_answer">Short answer</option>
            <option value="reading_comprehension">Reading comprehension</option>
          </select>
        </div>
        <div class="field">
          <label for="count">Question count</label>
          <input id="count" type="number" min="3" max="20" step="1" value="8" required />
        </div>
      </div>
      <button type="submit" id="go">Generate worksheet</button>
    </form>
  </div>

  <section id="result" style="display:none;">
    <div class="no-print" style="display:flex; gap:0.5rem; margin: 1rem 0;">
      <button id="print-ws" class="btn">Print worksheet</button>
      <button id="print-ak" class="btn secondary">Print answer key</button>
    </div>

    <article id="worksheet" class="result"></article>
    <article id="answer-key" class="result" style="display:none;"></article>
  </section>
</main>

<footer class="site-footer no-print">
  <div class="row">
    <div><strong>Slatework</strong> · Built by Darren · 2026</div>
    <div><a href="/about.html">About</a> · <a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a></div>
  </div>
</footer>

<script>
const $ = (id) => document.getElementById(id);

$('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('go');
  btn.disabled = true;
  $('result').style.display = 'block';
  $('worksheet').innerHTML = '<p>Generating…</p>';
  $('answer-key').style.display = 'none';
  try {
    const r = await fetch('/api/worksheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_language: $('target').value,
        level: $('level').value,
        topic: $('topic').value,
        format: $('format').value,
        count: parseInt($('count').value, 10)
      })
    });
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      $('worksheet').innerHTML = '<p>' + escapeHtml(e.error || 'Could not generate.') + '</p>';
      return;
    }
    const data = await r.json();
    $('worksheet').innerHTML = renderMarkdown(data.worksheet || '');
    if (data.answer_key) {
      $('answer-key').innerHTML = renderMarkdown(data.answer_key);
    }
  } catch {
    $('worksheet').innerHTML = '<p>Network error. Try again.</p>';
  } finally {
    btn.disabled = false;
  }
});

$('print-ws').addEventListener('click', () => {
  $('answer-key').style.display = 'none';
  $('worksheet').style.display = '';
  window.print();
});
$('print-ak').addEventListener('click', () => {
  $('worksheet').style.display = 'none';
  $('answer-key').style.display = '';
  window.print();
  setTimeout(() => { $('worksheet').style.display = ''; }, 500);
});

function renderMarkdown(md) {
  const lines = md.split('\n');
  let html = '';
  let inList = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (inList) { html += '</ol>'; inList = false; }
      html += '\n';
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      if (!inList) { html += '<ol>'; inList = true; }
      html += '<li>' + escapeHtml(line.replace(/^\d+\.\s/, '')) + '</li>';
    } else if (line.startsWith('## ')) { if (inList) { html += '</ol>'; inList = false; } html += '<h2>' + escapeHtml(line.slice(3)) + '</h2>'; }
    else if (line.startsWith('### ')) { if (inList) { html += '</ol>'; inList = false; } html += '<h3>' + escapeHtml(line.slice(4)) + '</h3>'; }
    else if (line.startsWith('**') && line.endsWith('**')) { if (inList) { html += '</ol>'; inList = false; } html += '<p><strong>' + escapeHtml(line.slice(2, -2)) + '</strong></p>'; }
    else { if (inList) { html += '</ol>'; inList = false; } html += '<p>' + escapeHtml(line) + '</p>'; }
  }
  if (inList) html += '</ol>';
  return html;
}

function escapeHtml(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
</script>
</body>
</html>
```

- [ ] **Step 2 (verify): curl-test the endpoint**

```bash
curl -s -X POST http://localhost:8788/api/worksheet \
  -H "Content-Type: application/json" \
  -d '{"target_language":"French","level":"A2","topic":"Passé composé with être","format":"gap_fill","count":8}' \
  | python -m json.tool | head -30
```

Expected: JSON with `worksheet` and `answer_key` fields, both containing markdown.

- [ ] **Step 3: Commit**

```bash
cd /c/Users/darre/slatework && git add functions/api/worksheet.js worksheet.html && git commit -m "feat(p2): worksheet + answer-key generator (Pages Function + UI)"
```

---

### Task 2.5: Marking accelerator (`functions/api/marking.js`, `marking.html`)

**Files:**
- Create: `slatework/functions/api/marking.js`
- Create: `slatework/marking.html`

- [ ] **Step 1: Write the Pages Function**

Path: `slatework/functions/api/marking.js`

```javascript
// POST /api/marking
// Highlights error categories in a student's writing and returns
// level-matched feedback variants the teacher can paste back.

import { jsonResponse, ipHash, rateCheck, callClaude } from "../_lib.js";

const SYSTEM_PROMPT = [
  "You are an experienced language teacher marking student writing. Given a target language, CEFR level, and a student writing sample (or speaking transcript), you produce: (a) categorised error highlights with examples drawn from the sample, and (b) three feedback paragraphs at different levels of warmth and formality, ready to paste into an email or report.",
  "",
  "Strict rules:",
  "- Group errors into clear categories: Grammar, Vocabulary, Structure, Mechanics. Within each, give 1–3 specific examples taken verbatim from the sample, with the suggested correction.",
  "- Match feedback to the student's level. B1 feedback shouldn't expect C1 register.",
  "- The three feedback variants are: WARM (encouraging, leads with a strength), DIRECT (lists the top 3 priorities to fix), STRUCTURED (numbered list mapped to a generic rubric: content, accuracy, range, organisation).",
  "- Output is Markdown only. Strict structure shown below.",
  "- Do not include or invent the student's name. Refer to 'the student' or 'you' (in the WARM variant).",
  "",
  "Format:",
  "",
  "## Error highlights",
  "",
  "### Grammar",
  "- *\"[verbatim phrase from sample]\"* → [correction] — [one-sentence explanation]",
  "",
  "### Vocabulary",
  "- ...",
  "",
  "### Structure",
  "- ...",
  "",
  "### Mechanics",
  "- ...",
  "",
  "## Feedback variants",
  "",
  "### Warm",
  "[Paragraph that leads with a genuine strength, then names 1–2 things to focus on next.]",
  "",
  "### Direct",
  "[Numbered list of the top 3 priorities. One sentence each.]",
  "",
  "### Structured (rubric-mapped)",
  "1. **Content** — [one-sentence comment]",
  "2. **Accuracy** — [comment]",
  "3. **Range** — [comment]",
  "4. **Organisation** — [comment]"
].join("\n");

const MODEL = "claude-sonnet-4-6";
const PER_IP_DAILY = 20;
const GLOBAL_DAILY = 2000;
const MIN_SAMPLE_LEN = 50;
const MAX_SAMPLE_LEN = 4000;
const VALID_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid request format.' }, 400); }

  const language = String(body.target_language || '').trim();
  const level = String(body.level || '').trim().toUpperCase();
  const sample = String(body.sample || '').trim();
  const rubric = String(body.rubric || '').trim().slice(0, 200);

  if (!language) return jsonResponse({ error: 'Missing target language.' }, 400);
  if (!VALID_LEVELS.includes(level)) return jsonResponse({ error: 'Level must be A1–C2.' }, 400);
  if (sample.length < MIN_SAMPLE_LEN) return jsonResponse({ error: 'Sample too short. Paste at least 50 characters.' }, 400);
  if (sample.length > MAX_SAMPLE_LEN) return jsonResponse({ error: 'Sample too long (max 4000 chars).' }, 400);

  if (!env.ANTHROPIC_API_KEY) return jsonResponse({ error: 'Service is being configured. Try again in a few minutes.' }, 503);

  const fp = await ipHash(request);
  const rate = await rateCheck(env, fp, 'marking', PER_IP_DAILY, GLOBAL_DAILY);
  if (!rate.ok) return jsonResponse({ error: rate.reason }, rate.status || 429);

  const userMsg = [
    `Target language: ${language}`,
    `CEFR level: ${level}`,
    rubric ? `Rubric tag: ${rubric}` : '',
    '',
    'Student writing sample:',
    '"""',
    sample,
    '"""'
  ].filter(Boolean).join('\n');

  try {
    const text = await callClaude(env, { model: MODEL, system: SYSTEM_PROMPT, user: userMsg, max_tokens: 2500 });
    return jsonResponse({ markdown: text }, 200);
  } catch {
    return jsonResponse({ error: 'Could not mark the sample. Try again in a moment.' }, 502);
  }
}
```

- [ ] **Step 2: Write the UI**

Path: `slatework/marking.html`

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Marking accelerator — Slatework</title>
  <meta name="description" content="Paste a student's writing — get categorised error highlights plus three ready-to-paste feedback variants (warm, direct, rubric-mapped). Built for language tutors and teachers." />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="canonical" href="https://slatework.tools/marking.html" />
  <link rel="stylesheet" href="/lib/styles.css" />
</head>
<body>
<header class="site-header">
  <a class="brand" href="/"><svg width="22" height="22" viewBox="0 0 64 64" aria-hidden="true"><rect x="6" y="10" width="52" height="44" rx="6" fill="#475569" stroke="#334155" stroke-width="2"/><line x1="16" y1="22" x2="48" y2="22" stroke="#cbd5e1" stroke-width="1.6" stroke-linecap="round"/><line x1="16" y1="32" x2="42" y2="32" stroke="#cbd5e1" stroke-width="1.6" stroke-linecap="round"/><line x1="16" y1="42" x2="38" y2="42" stroke="#cbd5e1" stroke-width="1.6" stroke-linecap="round"/></svg>Slatework</a>
  <nav><a href="/about.html">About</a><a href="/">Tools</a></nav>
</header>

<main class="container">
  <h1>Marking accelerator <span class="tag">AI</span></h1>
  <p>Paste a student's writing — get categorised error highlights plus three ready-to-paste feedback variants. The model speeds the work; you stay in charge of the call.</p>

  <div class="privacy-notice"><strong>Don't include the student's name or identifying info — paste the writing only.</strong> The sample is sent to Anthropic for processing and not stored by us.</div>

  <form id="form">
    <div class="section-row">
      <div class="field">
        <label for="target">Target language</label>
        <input id="target" type="text" placeholder="e.g., Spanish" required />
      </div>
      <div class="field">
        <label for="level">Student CEFR level</label>
        <select id="level" required>
          <option value="A1">A1</option>
          <option value="A2">A2</option>
          <option value="B1" selected>B1</option>
          <option value="B2">B2</option>
          <option value="C1">C1</option>
          <option value="C2">C2</option>
        </select>
      </div>
    </div>

    <div class="field">
      <label for="rubric">Rubric tag (optional)</label>
      <input id="rubric" type="text" placeholder="e.g., GCSE Spanish writing 90-word essay" maxlength="200" />
      <span class="help">Helps the model match feedback to a known marking scheme. Skip if you grade freely.</span>
    </div>

    <div class="field">
      <label for="sample">Anonymised student writing</label>
      <textarea id="sample" required minlength="50" maxlength="4000" placeholder="Paste the writing only. Remove names and identifying details first."></textarea>
    </div>

    <button type="submit" id="go">Mark and suggest feedback</button>
  </form>

  <section id="result" class="result" style="display:none;"></section>
</main>

<footer class="site-footer">
  <div class="row">
    <div><strong>Slatework</strong> · Built by Darren · 2026</div>
    <div><a href="/about.html">About</a> · <a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a></div>
  </div>
</footer>

<script>
const $ = (id) => document.getElementById(id);

$('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('go');
  const result = $('result');
  btn.disabled = true;
  result.style.display = 'block';
  result.innerHTML = '<p>Marking…</p>';

  try {
    const r = await fetch('/api/marking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_language: $('target').value,
        level: $('level').value,
        rubric: $('rubric').value,
        sample: $('sample').value
      })
    });
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      result.innerHTML = '<p>' + escapeHtml(e.error || 'Could not mark. Try again.') + '</p>';
      return;
    }
    const data = await r.json();
    result.innerHTML = renderMarkdown(data.markdown || '');
  } catch {
    result.innerHTML = '<p>Network error. Try again.</p>';
  } finally {
    btn.disabled = false;
  }
});

function renderMarkdown(md) {
  const lines = md.split('\n');
  let html = '';
  let listType = null; // 'ul' | 'ol' | null
  const closeList = () => { if (listType) { html += `</${listType}>`; listType = null; } };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { closeList(); html += '\n'; continue; }
    if (line.startsWith('### ')) { closeList(); html += '<h3>' + inlineMd(line.slice(4)) + '</h3>'; }
    else if (line.startsWith('## ')) { closeList(); html += '<h2>' + inlineMd(line.slice(3)) + '</h2>'; }
    else if (line.startsWith('- ')) {
      if (listType !== 'ul') { closeList(); html += '<ul>'; listType = 'ul'; }
      html += '<li>' + inlineMd(line.slice(2)) + '</li>';
    }
    else if (/^\d+\.\s/.test(line)) {
      if (listType !== 'ol') { closeList(); html += '<ol>'; listType = 'ol'; }
      html += '<li>' + inlineMd(line.replace(/^\d+\.\s/, '')) + '</li>';
    }
    else { closeList(); html += '<p>' + inlineMd(line) + '</p>'; }
  }
  closeList();
  return html;
}

function inlineMd(s) {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

function escapeHtml(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
</script>
</body>
</html>
```

- [ ] **Step 3: Verify the endpoint**

```bash
curl -s -X POST http://localhost:8788/api/marking \
  -H "Content-Type: application/json" \
  -d '{"target_language":"Spanish","level":"B1","sample":"Last weekend I am go to the beach with my family. We arrive there at 10 am. The water was very fresh and we are swim for two hours. After that we eat sandwiches that my mother make."}' \
  | python -m json.tool | head -40
```

Expected: JSON with `markdown` field containing `## Error highlights` and `## Feedback variants` sections.

- [ ] **Step 4: Commit**

```bash
cd /c/Users/darre/slatework && git add functions/api/marking.js marking.html && git commit -m "feat(p2): marking accelerator (Pages Function + UI) — categorised errors + 3 feedback variants"
```

---

### Phase 2 checkpoint

- [ ] All 4 LLM endpoints live: `/api/lesson-plan`, `/api/cefr-assess`, `/api/worksheet`, `/api/marking`
- [ ] Each rejects malformed input with a 400 + clear error
- [ ] Each rejects when `ANTHROPIC_API_KEY` is missing with a 503
- [ ] Each enforces per-IP and global daily rate limits via `RATE_LIMITS` KV
- [ ] All commits use `feat(p2): ...` prefix

End of Phase 2.

---

## Phase 3 — Newsletter, feedback widget, analytics

Three small tasks that wire site-wide concerns. After Phase 3, every tool page has a feedback button, the newsletter form on the homepage works, and Cloudflare Web Analytics tracks anonymous traffic.

### Task 3.1: Newsletter API (Buttondown integration)

**Files:**
- Create: `slatework/functions/api/newsletter.js`

- [ ] **Step 1: Write the endpoint**

Path: `slatework/functions/api/newsletter.js`

```javascript
// POST /api/newsletter
// Hashes the email, deduplicates against KV, then forwards the new sub to Buttondown.
// We hold the SHA-256 hash of each subscribed email — never the plaintext — so we can
// dedupe future signups without keeping the email ourselves.

import { jsonResponse, ipHash, rateCheck } from "../_lib.js";

const PER_IP_DAILY = 5;     // a single visitor can submit at most 5 / day
const GLOBAL_DAILY = 5000;  // site-wide cap to stop spam floods

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid request format.' }, 400); }

  const email = String(body.email || '').trim().toLowerCase();
  const first_name = String(body.first_name || '').trim().slice(0, 60);

  if (!isPlausibleEmail(email)) return jsonResponse({ error: 'Please enter a valid email.' }, 400);

  const fp = await ipHash(request);
  const rate = await rateCheck(env, fp, 'newsletter', PER_IP_DAILY, GLOBAL_DAILY);
  if (!rate.ok) return jsonResponse({ error: rate.reason }, rate.status || 429);

  // Dedupe via SHA-256 hash kept in KV (RATE_LIMITS namespace).
  const emailHash = await sha256Hex(email);
  if (env.RATE_LIMITS) {
    const seen = await env.RATE_LIMITS.get('news:' + emailHash);
    if (seen) {
      return jsonResponse({ ok: true, already: true }, 200);
    }
  }

  // Forward to Buttondown if configured. If not configured, accept and log
  // the hash — admin can wire up Buttondown later without losing signups.
  if (env.BUTTONDOWN_API_KEY) {
    try {
      const r = await fetch('https://api.buttondown.email/v1/subscribers', {
        method: 'POST',
        headers: {
          'Authorization': 'Token ' + env.BUTTONDOWN_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email_address: email,
          metadata: first_name ? { first_name } : {},
          tags: ['slatework']
        })
      });
      // Buttondown returns 201 on new, 400 on already-subscribed (we treat as success).
      if (r.status >= 400 && r.status !== 400) {
        return jsonResponse({ error: 'Newsletter is temporarily unavailable. Try again later.' }, 502);
      }
    } catch {
      return jsonResponse({ error: 'Newsletter is temporarily unavailable. Try again later.' }, 502);
    }
  }

  if (env.RATE_LIMITS) {
    await env.RATE_LIMITS.put('news:' + emailHash, '1', { expirationTtl: 60 * 60 * 24 * 365 });
  }

  return jsonResponse({ ok: true }, 200);
}

function isPlausibleEmail(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length < 256;
}

async function sha256Hex(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
```

- [ ] **Step 2: Test the endpoint locally without Buttondown configured**

```bash
curl -s -X POST http://localhost:8788/api/newsletter \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","first_name":"Test"}' \
  | python -m json.tool
```

Expected: `{"ok": true}`. Submit the same email again — expect `{"ok": true, "already": true}`.

- [ ] **Step 3: Test rejects malformed email**

```bash
curl -s -X POST http://localhost:8788/api/newsletter \
  -H "Content-Type: application/json" \
  -d '{"email":"not an email"}' \
  | python -m json.tool
```

Expected: `{"error": "Please enter a valid email."}` with HTTP 400.

- [ ] **Step 4: Commit**

```bash
cd /c/Users/darre/slatework && git add functions/api/newsletter.js && git commit -m "feat(p3): newsletter signup endpoint with SHA-256 dedup and Buttondown forward"
```

---

### Task 3.2: Site-wide feedback widget (`feedback.js`)

The widget mirrors Authorly's pattern: it auto-installs, exposes `window.attachFeedback(toolSlug, container)`, and renders a small "Was this useful?" button group. Each tool page gets one extra line: `<script src="/feedback.js" defer></script>`.

**Files:**
- Create: `slatework/feedback.js`
- Create: `slatework/functions/api/feedback.js`
- Modify: each tool HTML file to load `/feedback.js`

- [ ] **Step 1: Write `feedback.js`** — auto-installs at bottom of `<main>` on tool pages

Path: `slatework/feedback.js`

```javascript
// Slatework site-wide feedback widget + Cloudflare Web Analytics beacon.
// Auto-mounts on every page that includes <script src="/feedback.js" defer></script>.

(() => {
  // --- Cloudflare Web Analytics beacon ---------------------------------------
  // Replace this token after creating a site at:
  //   dash.cloudflare.com → Analytics & Logs → Web Analytics → Add a site
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
        <button type="button" data-fb="up" style="font: inherit; padding: 0.4rem 0.8rem; background: transparent; border: 1px solid var(--line, #e2e8f0); border-radius: 6px; cursor: pointer;">👍 Yes</button>
        <button type="button" data-fb="down" style="font: inherit; padding: 0.4rem 0.8rem; background: transparent; border: 1px solid var(--line, #e2e8f0); border-radius: 6px; cursor: pointer;">👎 Could be better</button>
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
      // Silent — feedback failure should never disrupt the user.
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
```

- [ ] **Step 2: Write the feedback receiver endpoint**

Path: `slatework/functions/api/feedback.js`

```javascript
// POST /api/feedback
// Records a per-tool yes/no + optional note. Stored in KV namespace FEEDBACK
// (one key per submission). Read by the maintainer manually — no dashboard.

import { jsonResponse, ipHash, rateCheck } from "../_lib.js";

const PER_IP_DAILY = 30;
const GLOBAL_DAILY = 10000;

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid request.' }, 400); }

  const tool = String(body.tool || '').trim().slice(0, 60);
  const verdict = String(body.verdict || '').trim();
  const comment = String(body.comment || '').trim().slice(0, 500);

  if (!tool) return jsonResponse({ error: 'Missing tool.' }, 400);
  if (verdict !== 'up' && verdict !== 'down') return jsonResponse({ error: 'Verdict must be up or down.' }, 400);

  const fp = await ipHash(request);
  const rate = await rateCheck(env, fp, 'feedback', PER_IP_DAILY, GLOBAL_DAILY);
  if (!rate.ok) return jsonResponse({ error: rate.reason }, rate.status || 429);

  if (env.FEEDBACK) {
    const id = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
    const key = `${tool}:${id}`;
    await env.FEEDBACK.put(key, JSON.stringify({ tool, verdict, comment, ts: new Date().toISOString() }), {
      expirationTtl: 60 * 60 * 24 * 365
    });
  }

  return jsonResponse({ ok: true }, 200);
}
```

- [ ] **Step 3: Add `<script src="/feedback.js" defer></script>` to every tool HTML page**

Tool pages to update (8 of them — homepage and the 4 info pages opt out):

- `setup.html`
- `tax.html`
- `insurance.html`
- `rates.html`
- `payments.html`
- `contract.html`
- `lesson-plan.html`
- `cefr.html`
- `worksheet.html`
- `marking.html`

Add this line **immediately before the existing `<script>` tag at the bottom of each page**:

```html
<script src="/feedback.js" defer></script>
```

For each file, run an Edit that inserts the line. Example for `rates.html`:

```bash
# Verify each file got the line:
grep -l "feedback.js" /c/Users/darre/slatework/*.html | sort
```

Expected output: 10 file paths (the 10 tool pages, none of the info pages).

- [ ] **Step 4: Update `wrangler.toml` with the FEEDBACK KV binding**

Path: `slatework/wrangler.toml` (add the new namespace)

```toml
# Append below the existing kv_namespaces blocks:

[[kv_namespaces]]
binding = "FEEDBACK"
id = "feedback_local_dev"
```

- [ ] **Step 5: Commit**

```bash
cd /c/Users/darre/slatework && git add feedback.js functions/api/feedback.js wrangler.toml setup.html tax.html insurance.html rates.html payments.html contract.html lesson-plan.html cefr.html worksheet.html marking.html && git commit -m "feat(p3): site-wide feedback widget, /api/feedback endpoint, CF Web Analytics scaffold"
```

---

### Task 3.3: Cloudflare Web Analytics token

This is the only step in Phase 3 that requires a manual action outside the codebase — Cloudflare's Web Analytics dashboard, which only exists on the live domain after Pages is configured. The placeholder string `REPLACE_WITH_CF_BEACON_TOKEN` in `feedback.js` is what gets swapped in.

- [ ] **Step 1: Document the manual step**

Add a note to the project README (already exists):

```bash
cd /c/Users/darre/slatework
```

Append to `README.md`:

```markdown

## Pre-launch checklist (manual one-offs)

These are the steps the codebase can't automate:

1. **Cloudflare Pages deploy** — connect the GitHub repo at dash.cloudflare.com/pages.
2. **Cloudflare Web Analytics** — Analytics & Logs → Web Analytics → Add a site → enter `slatework.tools` → copy the site_tag → replace `REPLACE_WITH_CF_BEACON_TOKEN` in `feedback.js`.
3. **KV namespaces** — create `RATE_LIMITS`, `FX_CACHE`, `FEEDBACK` in dash.cloudflare.com → Workers & Pages → KV. Bind each to the Pages project.
4. **Environment variables** — add `ANTHROPIC_API_KEY` and `BUTTONDOWN_API_KEY` as Pages env vars (production scope).
5. **Domain** — point `slatework.tools` and any defensive TLDs at the Pages project.
```

- [ ] **Step 2: Commit**

```bash
cd /c/Users/darre/slatework && git add README.md && git commit -m "feat(p3): document manual pre-launch steps (CF Pages, Analytics, KV, env, domain)"
```

---

### Phase 3 checkpoint

- [ ] Newsletter signup on homepage submits to `/api/newsletter` and gets `{ok: true}`
- [ ] Feedback widget appears at the bottom of every tool page (10 pages); not on /privacy, /terms, /about, /404, /
- [ ] `/api/feedback` accepts up/down + optional comment and stores to FEEDBACK KV when configured
- [ ] Cloudflare Web Analytics beacon scaffolded but inert until token replaced
- [ ] All commits use `feat(p3): ...` prefix

End of Phase 3.

---

## Phase 4 — Launch prep

Phase 4 is everything between "tools work" and "the site is publicly findable on slatework.tools". SEO meta + JSON-LD, social preview, sitemap, Playwright QA, deploy.

### Task 4.1: SEO meta tags + JSON-LD on every page

Each page needs Open Graph + Twitter card tags so links render with a preview, and the homepage + tool pages need `WebApplication` JSON-LD so Google rich results can pick them up.

**Files:**
- Modify: `index.html`, `setup.html`, `tax.html`, `insurance.html`, `rates.html`, `payments.html`, `contract.html`, `lesson-plan.html`, `cefr.html`, `worksheet.html`, `marking.html`, `about.html`, `privacy.html`, `terms.html`

- [ ] **Step 1: Add the shared OG / Twitter / canonical block to every HTML page**

For each file, locate the `<link rel="icon"` line and add **immediately after it**:

```html
<link rel="canonical" href="https://slatework.tools/[PAGE-PATH]" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Slatework" />
<meta property="og:title" content="[PAGE-TITLE]" />
<meta property="og:description" content="[PAGE-DESCRIPTION]" />
<meta property="og:image" content="https://slatework.tools/og.png" />
<meta property="og:url" content="https://slatework.tools/[PAGE-PATH]" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="[PAGE-TITLE]" />
<meta name="twitter:description" content="[PAGE-DESCRIPTION]" />
<meta name="twitter:image" content="https://slatework.tools/og.png" />
```

Replace `[PAGE-PATH]`, `[PAGE-TITLE]`, `[PAGE-DESCRIPTION]` with the values for each page. The titles and descriptions already exist in the page's `<title>` and `<meta name="description">` tags — reuse them.

If a page already has `<link rel="canonical">` (the tool pages do), skip that line; only add the OG/Twitter block.

- [ ] **Step 2: Add JSON-LD to the homepage and each tool page**

For the homepage (`index.html`), add this `<script>` block immediately before the closing `</head>`:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Slatework",
  "url": "https://slatework.tools/",
  "description": "Free privacy-first toolkit for independent language tutors and the teachers who tutor on the side.",
  "publisher": {
    "@type": "Organization",
    "name": "Slatework"
  }
}
</script>
```

For each tool page, add a `WebApplication` block. Example for `rates.html`:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Hourly rate calculator for language tutors",
  "url": "https://slatework.tools/rates.html",
  "description": "Calculate a defensible hourly rate as an independent language tutor; see private rate vs platform-net side-by-side across italki, Preply, Wyzant, Cambly, Tutorful — country-aware for 7 markets.",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Any",
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
  "isAccessibleForFree": true,
  "browserRequirements": "Requires JavaScript"
}
</script>
```

Repeat for each of the 10 tool pages, customising `name`, `url`, and `description`.

- [ ] **Step 3: Verify markup**

```bash
cd /c/Users/darre/slatework && for f in index.html rates.html setup.html tax.html insurance.html payments.html contract.html lesson-plan.html cefr.html worksheet.html marking.html about.html privacy.html terms.html; do
  echo "=== $f ==="
  grep -c 'og:title\|application/ld+json' "$f"
done
```

Each row should show `2` (one OG title + one JSON-LD block). The exception: `privacy.html` and `terms.html` get OG tags but no JSON-LD (they aren't WebApplication).

- [ ] **Step 4: Commit**

```bash
cd /c/Users/darre/slatework && git add index.html *.html && git commit -m "feat(p4): SEO meta (OG, Twitter, canonical) and JSON-LD on every page"
```

---

### Task 4.2: sitemap.xml + robots.txt

**Files:**
- Create: `slatework/sitemap.xml`
- Create: `slatework/robots.txt`

- [ ] **Step 1: Write `sitemap.xml`**

Path: `slatework/sitemap.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://slatework.tools/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>
  <url><loc>https://slatework.tools/setup.html</loc><changefreq>monthly</changefreq><priority>0.9</priority></url>
  <url><loc>https://slatework.tools/tax.html</loc><changefreq>monthly</changefreq><priority>0.9</priority></url>
  <url><loc>https://slatework.tools/insurance.html</loc><changefreq>monthly</changefreq><priority>0.9</priority></url>
  <url><loc>https://slatework.tools/rates.html</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>
  <url><loc>https://slatework.tools/payments.html</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <url><loc>https://slatework.tools/contract.html</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <url><loc>https://slatework.tools/lesson-plan.html</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>
  <url><loc>https://slatework.tools/cefr.html</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <url><loc>https://slatework.tools/worksheet.html</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>
  <url><loc>https://slatework.tools/marking.html</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>
  <url><loc>https://slatework.tools/about.html</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>
  <url><loc>https://slatework.tools/privacy.html</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>
  <url><loc>https://slatework.tools/terms.html</loc><changefreq>yearly</changefreq><priority>0.3</priority></url>
</urlset>
```

- [ ] **Step 2: Write `robots.txt`**

Path: `slatework/robots.txt`

```
User-agent: *
Allow: /
Disallow: /tests/
Disallow: /api/

Sitemap: https://slatework.tools/sitemap.xml
```

- [ ] **Step 3: Commit**

```bash
cd /c/Users/darre/slatework && git add sitemap.xml robots.txt && git commit -m "feat(p4): sitemap.xml (14 URLs) and robots.txt"
```

---

### Task 4.3: Social preview images (`og.svg` + `og.png`)

The OG/Twitter image is what every social platform shows when someone shares a link to slatework.tools. We design once in SVG (the source of truth), then export a 1200×630 PNG (the format social platforms reliably support).

**Files:**
- Create: `slatework/og.svg`
- Create: `slatework/og.png` (rendered from og.svg)

- [ ] **Step 1: Write `og.svg`** (1200×630, slate palette, brand mark + tagline)

Path: `slatework/og.svg`

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fafaf7"/>
      <stop offset="1" stop-color="#e8eaee"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Brand slate icon -->
  <g transform="translate(120 120)">
    <rect x="0" y="0" width="180" height="160" rx="20" fill="#475569" stroke="#334155" stroke-width="4"/>
    <line x1="30" y1="42" x2="150" y2="42" stroke="#cbd5e1" stroke-width="5" stroke-linecap="round"/>
    <line x1="30" y1="80" x2="130" y2="80" stroke="#cbd5e1" stroke-width="5" stroke-linecap="round"/>
    <line x1="30" y1="118" x2="120" y2="118" stroke="#cbd5e1" stroke-width="5" stroke-linecap="round"/>
  </g>

  <!-- Wordmark -->
  <text x="340" y="200" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="84" font-weight="700" fill="#1e293b">Slatework</text>

  <!-- Tagline -->
  <text x="120" y="380" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="44" font-weight="500" fill="#1e293b">Free tools for independent</text>
  <text x="120" y="438" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="44" font-weight="500" fill="#1e293b">language tutors.</text>

  <!-- Subline -->
  <text x="120" y="520" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="26" font-weight="400" fill="#475569">Setup · Rates · Contracts · Lesson plans · Marking</text>

  <!-- Footer -->
  <text x="120" y="585" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="22" font-weight="500" fill="#94a3b8">slatework.tools</text>
</svg>
```

- [ ] **Step 2: Render `og.png` from `og.svg`**

Use Cloudflare's free Browser Rendering or a local Node script. Easiest local path: a tiny Node script using `sharp` (one-time, no project dependency).

Path: `slatework/.claude/render-og.js` (mirror Authorly's pattern of putting build helpers under `.claude/`)

```javascript
// Render og.png from og.svg. Run with: node .claude/render-og.js
// Requires `sharp` — install transiently via npx so we don't add a dependency.
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const svg = readFileSync(join(root, 'og.svg'));

sharp(svg, { density: 192 })
  .resize(1200, 630, { fit: 'contain', background: '#fafaf7' })
  .png({ compressionLevel: 9 })
  .toBuffer()
  .then(buf => {
    writeFileSync(join(root, 'og.png'), buf);
    console.log('Rendered og.png:', buf.length, 'bytes');
  })
  .catch(e => { console.error(e); process.exit(1); });
```

Run:

```bash
cd /c/Users/darre/slatework && npx -y -p sharp@0.33.5 node .claude/render-og.js
```

Expected: `Rendered og.png: <some-bytes>` and an `og.png` file at the project root sized roughly 30–80 KB.

- [ ] **Step 3: Verify the OG image**

```bash
file /c/Users/darre/slatework/og.png
```

Expected: `og.png: PNG image data, 1200 x 630, ...`.

Open `og.png` in an image viewer. Expect: slate-gray background, slate-icon top-left, "Slatework" wordmark, tagline, slatework.tools footer.

- [ ] **Step 4: Commit**

```bash
cd /c/Users/darre/slatework && git add og.svg og.png .claude/render-og.js && git commit -m "feat(p4): social preview image (og.svg source + 1200x630 og.png + render script)"
```

---

### Task 4.4: Playwright QA script (mirror Authorly's `qa.py`)

Catches obvious regressions before launch — broken tools, console errors, layout breaks at mobile vs desktop.

**Files:**
- Create: `slatework/tests/qa.py`
- Create: `slatework/.claude/qa-screenshots/.gitkeep`

- [ ] **Step 1: Write `tests/qa.py`**

Path: `slatework/tests/qa.py`

```python
"""Real-browser QA pass on every Slatework page at desktop + mobile.
Captures screenshots, console errors, layout issues, network failures.
Reads only — never modifies the site.

Run locally against wrangler dev: `python tests/qa.py http://localhost:8788`
Run against production: `python tests/qa.py https://slatework.tools`
"""

from playwright.sync_api import sync_playwright
import json
import sys
from pathlib import Path

DEFAULT_HOST = "http://localhost:8788"
HOST = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_HOST

PAGES = [
    "/",
    "/setup.html", "/tax.html", "/insurance.html",
    "/rates.html", "/payments.html",
    "/contract.html",
    "/lesson-plan.html", "/cefr.html", "/worksheet.html", "/marking.html",
    "/about.html", "/privacy.html", "/terms.html"
]

VIEWPORTS = {
    "desktop": {"width": 1440, "height": 900},
    "mobile":  {"width": 390,  "height": 844},
}

OUT = Path(__file__).resolve().parent.parent / ".claude" / "qa-screenshots"
OUT.mkdir(exist_ok=True, parents=True)

findings = []

def add(page, viewport, severity, kind, msg):
    findings.append({
        "page": page, "viewport": viewport,
        "severity": severity, "kind": kind, "msg": msg
    })

def slug(p):
    return "home" if p == "/" else p.strip("/").replace("/", "-").replace(".html", "")

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)
    for vp_name, vp in VIEWPORTS.items():
        ctx = browser.new_context(viewport=vp)
        for p in PAGES:
            page = ctx.new_page()
            console_errors = []
            page.on("pageerror", lambda e, P=p, V=vp_name: add(P, V, "high", "pageerror", str(e)))
            page.on("console", lambda m, P=p, V=vp_name: console_errors.append(m) if m.type == "error" else None)
            try:
                resp = page.goto(HOST + p, wait_until="networkidle", timeout=15000)
                if resp is None or resp.status >= 400:
                    add(p, vp_name, "high", "http", f"status {resp.status if resp else 'no response'}")
                    continue
                page.screenshot(path=str(OUT / f"{slug(p)}-{vp_name}.png"), full_page=True)
                # Layout sanity: check footer exists
                if not page.query_selector("footer.site-footer"):
                    add(p, vp_name, "medium", "layout", "site-footer not found")
                # Console errors
                for m in console_errors:
                    add(p, vp_name, "medium", "console", m.text)
            except Exception as e:
                add(p, vp_name, "high", "exception", str(e)[:200])
            finally:
                page.close()
        ctx.close()
    browser.close()

# Write findings
report = OUT / "findings.json"
report.write_text(json.dumps(findings, indent=2))

# Summary
high = sum(1 for f in findings if f["severity"] == "high")
med  = sum(1 for f in findings if f["severity"] == "medium")
print(f"QA pass complete. {high} high, {med} medium findings. Report: {report}")
print(f"Screenshots: {OUT}")
sys.exit(1 if high > 0 else 0)
```

- [ ] **Step 2: Add `.gitkeep` to the screenshot directory**

```bash
mkdir -p /c/Users/darre/slatework/.claude/qa-screenshots && \
  touch /c/Users/darre/slatework/.claude/qa-screenshots/.gitkeep
```

- [ ] **Step 3: Add `.claude/qa-screenshots/*.png` and `.claude/qa-screenshots/findings.json` to `.gitignore`**

Path: `slatework/.gitignore` (append):

```
.claude/qa-screenshots/*.png
.claude/qa-screenshots/findings.json
```

- [ ] **Step 4: Run a smoke pass against the local dev server**

```bash
cd /c/Users/darre/slatework && \
  ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
  npx -y wrangler@3 pages dev . --port 8788 --kv RATE_LIMITS --kv FX_CACHE --kv FEEDBACK \
  --binding ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" &
sleep 4
python -m pip install --quiet playwright
python -m playwright install --with-deps chromium 2>/dev/null || true
python tests/qa.py http://localhost:8788
kill %1 2>/dev/null
```

Expected: `QA pass complete. 0 high, 0 medium findings.` (Some `medium` findings are normal on first run if any tool has a console.warn.)

- [ ] **Step 5: Commit**

```bash
cd /c/Users/darre/slatework && git add tests/qa.py .claude/qa-screenshots/.gitkeep .gitignore && git commit -m "feat(p4): Playwright QA script (mirrors authorly/.claude/qa.py)"
```

---

### Task 4.5: Cloudflare Pages deploy + domain

Two subtasks: connect the repo to Cloudflare Pages, and point the domain.

- [ ] **Step 1: Push repo to GitHub**

```bash
cd /c/Users/darre/slatework && \
  gh repo create slatework --public --source=. --remote=origin --description "Free privacy-first toolkit for independent language tutors. slatework.tools." && \
  git push -u origin main
```

Expected: repo created at `github.com/<user>/slatework`, all commits pushed.

- [ ] **Step 2: Connect Cloudflare Pages to the GitHub repo (manual)**

Manual step — Cloudflare doesn't expose a stable CLI for this:

1. Go to dash.cloudflare.com → Workers & Pages → Create application → Pages → Connect to Git.
2. Pick the `slatework` repo, branch `main`.
3. Build settings: leave **Build command** empty, **Build output directory** = `/` (project root).
4. Click "Save and Deploy". The first deploy takes ~1 minute.

- [ ] **Step 3: Add KV namespaces to the Pages project (manual)**

In dash.cloudflare.com → Workers & Pages → KV, create three namespaces:

- `slatework_RATE_LIMITS`
- `slatework_FX_CACHE`
- `slatework_FEEDBACK`

Then in the Pages project → Settings → Functions → KV namespace bindings, bind each:

- variable name `RATE_LIMITS` → namespace `slatework_RATE_LIMITS`
- variable name `FX_CACHE` → namespace `slatework_FX_CACHE`
- variable name `FEEDBACK` → namespace `slatework_FEEDBACK`

- [ ] **Step 4: Add environment variables (manual)**

In Pages project → Settings → Environment variables → Production:

- `ANTHROPIC_API_KEY` = your Anthropic key (paste only into the dashboard, never into the chat)
- `BUTTONDOWN_API_KEY` = your Buttondown key (paste only into the dashboard, never into the chat)

Mark both as "Encrypted".

- [ ] **Step 5: Add custom domain (manual)**

In Pages project → Custom domains → Set up a custom domain. Enter `slatework.tools`. Cloudflare will configure the DNS automatically if `slatework.tools` is on a Cloudflare account.

If `slatework.tools` is registered with a third-party registrar, point the nameservers to Cloudflare first (it tells you the two NS records). Wait up to 24 hours for propagation.

- [ ] **Step 6: Verify the production site**

```bash
curl -sI https://slatework.tools/ | head -5
curl -s https://slatework.tools/ | grep -o "<title>[^<]*</title>"
```

Expected: HTTP 200, title `Slatework — Free tools for independent language tutors`.

Run the QA script against production:

```bash
cd /c/Users/darre/slatework && python tests/qa.py https://slatework.tools
```

Expected: 0 high, low number of medium findings.

- [ ] **Step 7: Replace the CF Web Analytics token in `feedback.js`**

After completing the manual step in dash.cloudflare.com → Analytics & Logs → Web Analytics → Add a site → enter `slatework.tools` → copy the `site_tag`:

Edit `slatework/feedback.js`:

```javascript
// Change this line:
const BEACON_TOKEN = "REPLACE_WITH_CF_BEACON_TOKEN";
// To:
const BEACON_TOKEN = "<the actual site_tag>";
```

Commit and push:

```bash
cd /c/Users/darre/slatework && git add feedback.js && git commit -m "chore(p4): activate Cloudflare Web Analytics beacon" && git push
```

- [ ] **Step 8: Final commit + tag**

```bash
cd /c/Users/darre/slatework && git tag -a v0.1.0 -m "Slatework MVP — public launch" && git push origin v0.1.0
```

---

### Phase 4 checkpoint — launch readiness

- [ ] All 14 pages render at `https://slatework.tools/<page>` with HTTP 200
- [ ] All 4 LLM endpoints return `markdown` or expected JSON shape on production with `ANTHROPIC_API_KEY` set
- [ ] Newsletter signup at `https://slatework.tools/` returns `{ok: true}` and adds the subscriber to Buttondown
- [ ] OG preview renders correctly when shared on Twitter, LinkedIn, Discord (test with each)
- [ ] `https://slatework.tools/sitemap.xml` and `https://slatework.tools/robots.txt` resolve
- [ ] Cloudflare Web Analytics shows page views from the QA pass
- [ ] Playwright QA shows 0 high findings against production
- [ ] git tag `v0.1.0` exists and is pushed

End of Phase 4. Ready to launch.

---

## Plan summary

| Phase | Tasks | Tools shipped | Endpoints shipped |
|---|---|---|---|
| 0 — Foundation | 6 | — | `/api/fx` |
| 1 — Client-side tools | 10 | 6 of 10 (setup, tax, insurance, rates, payments, contract, CEFR rule-based) | — |
| 2 — LLM tools | 5 | 4 of 4 LLM tools (lesson plan, CEFR AI mode, worksheet, marking) | `/api/lesson-plan`, `/api/cefr-assess`, `/api/worksheet`, `/api/marking` |
| 3 — Newsletter, feedback, analytics | 3 | — | `/api/newsletter`, `/api/feedback` |
| 4 — Launch prep | 5 | — | (deploy + manual binding) |
| **Total** | **29 tasks** | **10 / 10 tools** | **6 endpoints** |

Estimated build time for a focused solo developer: 12–18 hours of code time, plus ~2 hours for the Cloudflare manual configuration.

