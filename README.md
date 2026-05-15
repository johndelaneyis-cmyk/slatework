# Slatework

Free, privacy-first toolkit for independent language tutors. Live at **[slatework.tools](https://slatework.tools)**.

Ten tools that handle the work tutoring platforms don't — pricing, contracts, lesson planning, marking, CEFR placement, tax + payment setup — country-aware for **10 markets**: US, UK, Canada, Australia, New Zealand, Ireland, Hong Kong, India, Philippines, Singapore.

No signup. No tracking. No platform fee.

## The tools

| Tool | What it does |
|---|---|
| [Rates](https://slatework.tools/rates) | Suggests a defensible hourly rate by country, language pair, and experience. Shows what you actually net on italki / Preply / Cambly / Verbling / Wyzant / MyTutor / Tutor House / Lingoda / TutorOcean / regional platforms — with the commission curve modelled and sourced |
| [Lesson plan](https://slatework.tools/lesson-plan) | Time-blocked plans with warm-up / core / production / wrap-up / exit ticket / differentiation. Calibrates to Cambridge / IELTS / TOEFL / GCSE if you name it |
| [Worksheet](https://slatework.tools/worksheet) | Gap-fill / multi-choice / short-answer / reading comp + answer key, printable |
| [Marking](https://slatework.tools/marking) | Paste student writing (or upload a photo of handwriting) → categorised errors + three feedback variants (warm / direct / rubric-mapped). CEFR-calibrated |
| [CEFR placement](https://slatework.tools/cefr) | Rule-based Can-Do checklist (runs in your browser, no AI) or AI mode from a writing sample |
| [Parent-tutor contract](https://slatework.tools/contract) | Fills in name / rate / policy / safeguarding clause, prints to PDF. Fully client-side |
| [Tax & self-employment](https://slatework.tools/tax) | Country-specific: form name, VAT threshold, trading allowance, income-tax brackets, registration steps |
| [Payment methods](https://slatework.tools/payments) | Per-country domestic + international (FPS, PayMe, Wise, Zelle, Interac, Stripe Link, etc.) |
| [Insurance & safeguarding](https://slatework.tools/insurance) | Public-liability, professional-indemnity, DBS / WWCC / Garda basics |
| [Setup walkthrough](https://slatework.tools/setup) | What you actually need to start: registration, insurance, safeguarding for minors |

## Privacy posture

- **Nothing about your students leaves your machine** for the client-side tools (contract builder, CEFR rule-based mode).
- The four AI-backed tools (lesson plan, worksheet, marking, CEFR AI) send your text to Anthropic for processing — never stored, never logged on our side.
- Photo OCR routes through Google Cloud Vision *before* the text reaches Anthropic — the model never sees the raw image.
- Newsletter sign-ups are stored as SHA-256 hashes, not plaintext.
- Rate-limit fingerprints are day-rotated SHA-256(IP+UTC-date), 8-byte truncated, discarded overnight. No long-term identifier.
- Full detail: [/privacy](https://slatework.tools/privacy)

## Country packs

Each market is one JSON file in [`data/countries/<iso>.json`](data/countries/) with:
- Rate ranges by language pair (low / median / high) per experience tier
- Platforms available + commission curves (with `data_source` URLs traceable to the official help page)
- Tax form name + URL + VAT/trading-allowance thresholds + income-tax brackets
- Domestic + international payment methods
- Insurance / safeguarding requirements

Adding a country is a single PR, not a refactor. Same with correcting a platform commission — just edit the JSON and link the source.

## Stack

- Static HTML/CSS/JS, no framework, ~6-25 KB per page compressed
- Cloudflare Pages + Pages Functions for the 8 AI/data endpoints
- Anthropic for the four AI tools (Sonnet 4.6 default, fallback chain to 4.5 / Haiku 4.5)
- Google Cloud Vision for photo OCR
- KV namespaces for FX cache, rate limits, newsletter dedup, feedback
- CSP / HSTS / COOP / CORP / Permissions-Policy locked down; CSP currently `unsafe-inline` for tool-page scripts (nonces planned)

## CI

- **[Deploy](.github/workflows/deploy.yml)** — Cloudflare Pages on push to `main`
- **[Lighthouse CI](.github/workflows/lhci.yml)** — runs against production after each deploy
- **[Linkinator](.github/workflows/linkinator.yml)** — weekly crawl of the live site to catch link rot (especially important for the platform `data_source` URLs)

## Contributing

Country-pack corrections (commission rates, tax thresholds, language-pair ranges) are the highest-value PRs and the easiest to land — just edit the JSON and include a source URL.

Open an issue if you'd rather flag the problem and let me update it; the country packs are scrupulously sourced and any divergence from the published commission/tax rate is treated as a bug.

## License

MIT — see [LICENSE](LICENSE).

## Maker

Built by Darren — independent language tutor and developer. Sibling project to **[Authorly](https://authorly.tools)** (toolkit for indie authors, same stack, same posture).

Contact: `hello@slatework.tools`
