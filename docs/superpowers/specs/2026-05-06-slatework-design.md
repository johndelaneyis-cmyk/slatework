# Slatework — Design Spec

**Date:** 2026-05-06
**Status:** Approved (brainstorming complete, ready for implementation planning)
**Author:** Darren

---

## 1. Summary

**Slatework** is a free, privacy-first toolkit website for **independent language tutors** — primarily private 1:1 tutors and secondarily tutors who also teach on platforms (italki, Preply, Wyzant, Cambly, Tutorful). It launches with **10 free tools** spanning business setup, pricing, client acquisition, and lesson delivery, all data-driven by a country-pack JSON structure for **7 launch countries** (US, UK, Canada, Australia, New Zealand, Ireland, Hong Kong).

The brand is the second project in the Authorly indie-creator-tools family. Same maker, same stack pattern, sharper niche focus.

## 2. Positioning & audience

**Brand line:** *"Free tools for independent language tutors."*

**Primary audience:** Private language tutors operating outside or alongside platforms — UK 11+ exam prep tutors, HK Cantonese/Mandarin/English tutors, US affluent-suburb tutors, and the global independent online tutor.

**Secondary audience:** Platform tutors (italki/Preply/Wyzant/Cambly/Tutorful) who also want a direct client book.

**Tertiary audience by design (no rebrand):** Language teachers in classrooms, captured organically through 4 dual-mode tools (lesson plan, parent communication, vocab/activity, CEFR mapper).

**Out of scope:** Students looking for tutors. Parents looking to hire tutors. Platforms themselves. Non-language tutors at launch (extensible later).

## 3. MVP — 10 tools, 4 homepage rows

### Setting up your tutoring business (3)

1. **Start-tutoring-privately walkthrough by country** — country-aware setup checklist: registration, background checks (UK DBS, AU WWCC, US norms), business setup (HK BR, AU ABN, NZ IRD), legal-to-teach-minors checklist, insurance signpost.
2. **Tax & self-employment setup by country** — separate page (SEO weight): US Schedule C, UK SA103, CA T2125, AU ABN+BAS, NZ IR3, IE ROS, HK Profits Tax + MPF.
3. **Insurance & safeguarding checklist by country** — public-liability, professional indemnity, working-with-minors policies. Major market gap.

### Pricing & money (2)

4. **Hourly rate calculator + earnings projector** ⭐ — language pair, experience years, country, hours/week. Output: private-rate range AND platform-net side-by-side across italki/Preply/Wyzant/Cambly/Tutorful (built-in multi-platform comparison), with annual projection toggle. Subsumes the standalone Multi-platform comparator.
5. **Payment methods per country** — Wise / Stripe Link / PayPal + local rails (HK FPS, AU PayID, UK Faster Payments, US Zelle/Venmo, IE SEPA Instant).

### Client acquisition (1)

6. **Parent-tutor contract / lesson agreement builder** — includes embedded sections for trial-lesson terms, cancellation/no-show policy, and a parent-welcome paragraph (covers most of what a separate marketing-copy tool would produce).

### Lesson delivery + grading (4)

The bucket where the secondary classroom-teacher audience is captured — and where most of the *correcting + prepping* time-burden is reduced. Four tools.

7. **Lesson plan generator** — language pair, level (CEFR), 1:1 vs small-group vs classroom mode, online vs in-person. LLM-backed. Classroom mode bridges secondary teacher audience.
8. **CEFR / proficiency mapper** — default rule-based Q&A version (client-side, deterministic). Optional AI-assessed mode for sample writing input.
9. **Worksheet + answer-key generator** — language pair + CEFR level + topic + question count → printable worksheet (gap-fill, multiple choice, short answer, reading comprehension) + matching answer key. LLM-backed. Directly addresses the *prepping* time-sink for both tutors and classroom teachers.
10. **Marking accelerator** — paste student writing or speaking transcript → highlighted error categories (grammar / vocabulary / structure / mechanics) + ready-to-paste feedback variants matched to CEFR level and a generic rubric. LLM-backed. Directly addresses the *correcting* time-sink.

### What changed from the original 10 (and why)

- **Dropped: Multi-platform comparator** — its core function (italki vs Preply vs Wyzant vs Cambly net earnings) is folded into Tool 4's rate calculator output. Saves a page; the SEO target queries are still partially captured.
- **Dropped: Marketing copy generator** — its highest-value sub-functions (parent-welcome paragraph, lesson description) are folded into Tool 6's contract builder. Pure marketing-channel copy (Mumsnet ad / IG bio / LinkedIn intro) deferred to v2 backlog.
- **Added: Worksheet + answer-key generator (Tool 9)** and **Marking accelerator (Tool 10)** — both directly address the *correcting + prepping* workflow that consumes language teachers and tutors, especially when teaching minors. Strengthens the secondary classroom-teacher audience without rebranding.

### Country-pack burden split

| Tool | Country variants needed |
|---|---|
| 1, 2, 3, 4, 5 | Heavy (full per-country data) |
| 6 | Light (currency + minor localization) |
| 7, 8, 9, 10 | None (country-agnostic) |

**Total:** ~36 country-specific data instances at launch (5 heavy × 7 + 1 light × 1).

## 4. Country-pack architecture

Country-specific data is **decoupled from code** and lives in JSON files that drive every country-aware tool.

```
data/
  countries/
    us.json
    gb.json
    ca.json
    au.json
    nz.json
    ie.json
    hk.json
```

### Country-pack schema (per file)

```jsonc
{
  "code": "GB",
  "name": "United Kingdom",
  "currency": "GBP",
  "currency_symbol": "£",
  "locale_default": "en-GB",
  "platforms": [
    {"key": "tutorful", "name": "Tutorful", "fee_pct": 12.5, "url": "https://tutorful.co.uk", "available_in": ["GB","IE"]}
  ],
  "tax": {
    "self_employment_form": "SA103",
    "self_employment_url": "https://www.gov.uk/self-employment-tax",
    "trading_allowance_amount": 1000,
    "vat_threshold_amount": 90000,
    "registration_steps": ["Register for Self Assessment", "..."]
  },
  "background_check": {
    "name": "DBS Enhanced Check",
    "cost_amount": 38,
    "url": "https://www.gov.uk/dbs-check-applicant-criminal-record"
  },
  "rates_by_language_pair": {
    "en-es": {"low": 20, "median": 35, "high": 70, "unit": "per_hour"},
    "en-fr": {"low": 22, "median": 38, "high": 75, "unit": "per_hour"}
  },
  "payment_methods": [
    {"key": "faster_payments", "name": "Faster Payments", "domestic": true, "international": false},
    {"key": "wise", "name": "Wise", "domestic": true, "international": true}
  ],
  "insurance": {
    "public_liability_typical_amount": 6000000,
    "providers": [{"name": "PolicyBee", "url": "..."}, {"name": "Hiscox", "url": "..."}]
  },
  "data_source_last_verified": "2026-05-06"
}
```

**Why this matters:**
- Adding India / Singapore / Philippines / EU later is a **JSON pull request, not a code change**.
- Every tool reads from the same canonical structure.
- Each country pack carries `data_source_last_verified` for staleness tracking.
- Currency conversion uses a static daily-cached rate from a free FX API (ExchangeRate-API or Fixer.io free tier), with a "rates as of [date]" disclaimer in outputs.

## 5. Privacy & data architecture (non-negotiable)

> **Default principle: nothing leaves the user's device unless we explicitly tell them.**

| Layer | Requirement |
|---|---|
| **6 of 10 tools** | Pure client-side. Forms + JS + JSON country-pack. Zero network calls beyond loading the page. |
| **4 LLM-backed tools** (7 lesson plan, 8 CEFR AI mode, 9 worksheet, 10 marking) | Cloudflare Pages Functions proxy to Anthropic API. **No request-body logging.** Only `{timestamp, ip-hash, tool, success}` for rate-limit + abuse detection. |
| **Rate limit** | 10 requests/hour per IP-hash on free tier (LLM tools). |
| **User accounts** | None. Ever. |
| **Persistence** | localStorage only. Never server-side. |
| **PII collection** | Newsletter signup only — email + optional first name. SHA-256 hash dedup pattern from Authorly. |
| **Privacy notice** | Each LLM tool displays: *"Your input is sent to Anthropic for generation but not stored by us."* |
| **Contract builder (#6)** | Generated entirely client-side — PDF/doc never touches a server. |
| **CEFR mapper (#8)** | Default rule-based (client-side, no transmission). Optional AI-assessed mode with explicit "don't include student names" warning. |
| **Worksheet generator (#9)** | LLM-backed; tutor-supplied topic + level only — no student PII required. Generated worksheet returned and rendered client-side; not persisted server-side. |
| **Marking accelerator (#10)** | LLM-backed; takes pasted student writing — potentially a minor's content. Form-level warning: *"Don't include the student's name or identifying info — paste the writing only."* Same no-logging posture as CEFR AI mode. |

### Compliance posture

- **GDPR / UK DPA:** lawful basis = consent (newsletter only). Privacy policy short and honest.
- **CCPA:** no data sales, no profiling.
- **HK PDPO / AU Privacy Act:** satisfied by minimal data hold.
- **COPPA / GDPR-K:** not triggered — adults-only audience, no student-data uploads stored.

## 6. Tech stack

Matches Authorly pattern for known-working infrastructure:

| Layer | Choice |
|---|---|
| Hosting | Cloudflare Pages (static) |
| API / LLM proxy | Cloudflare Worker (serverless) |
| LLM provider | Anthropic Claude (claude-haiku-4-5 for cheap tools, claude-sonnet-4-6 for higher-quality generation) |
| Frontend | Vanilla HTML/CSS/JS, progressively enhanced. No framework dependency. |
| Persistence | localStorage only |
| Newsletter | Same provider as Authorly (preserve current pattern) |
| FX rates | ExchangeRate-API free tier, cached daily in worker KV |
| Analytics | Cloudflare Web Analytics (matches Authorly stack, no third-party trackers) |
| Domain | `slatework.tools` (primary), `slatework.app` + `slatework.co` (defensive) |
| Repo | New GitHub repo, sibling to `authorly` |

### Pages Functions endpoints (LLM tools only)

- `POST /api/lesson-plan` — input: language pair, CEFR level, mode (1:1 / small-group / classroom), goal. Output: structured lesson plan with warmup, core activities, exit ticket. Model: `claude-sonnet-4-6`.
- `POST /api/cefr-assess` — input: writing sample. Output: CEFR level + reasoning. (Tool 8's "Try AI assessment" toggle.) Model: `claude-sonnet-4-6`.
- `POST /api/worksheet` — input: language pair, CEFR level, topic, question count, format (gap-fill / multiple choice / short answer / reading comp). Output: worksheet markdown + matching answer key markdown. Model: `claude-sonnet-4-6`.
- `POST /api/marking` — input: language pair, CEFR level, student writing/transcript, optional rubric tag. Output: error categories with examples + level-matched feedback variants. Model: `claude-sonnet-4-6`.

Each endpoint: rate-limited, no body logging, returns within 15s or fails clearly. Total of 4 LLM endpoints + 1 newsletter endpoint + 1 FX endpoint = 6 Pages Functions in `functions/api/`.

## 7. Brand & visual

| Element | Spec |
|---|---|
| Name | Slatework |
| Tagline | *Free tools for independent language tutors.* |
| Sub-line (used on About) | *Built for the tutors and teachers who turn lesson prep into late-night grading.* |
| Domain | `slatework.tools` |
| Logo iconography | Small slate frame (rounded rectangle, dark slate-gray, optional chalk-line edge) |
| Color palette | Slate gray primary (`#475569`-ish range), warm cream accent, single brand color for CTAs |
| Voice | Practical, dignified, indie. No emoji-heavy startup energy. Same tonal family as Authorly. |
| Typography | Match Authorly's font family for visual continuity |
| Dedication (About page) | One quiet line at the bottom: *"Built for the teacher who's currently grading in her bedroom at 11pm."* No name. The site's whole emphasis on *correcting + prepping* tools speaks to her implicitly. |
| Easter egg (HTML comment in `index.html`) | `<!-- Built with the world's tutors and teachers in mind — and one in particular. -->` Source-view discoverable; preserves privacy of the dedicatee. |
| Easter egg (console.log on page load) | `console.log("%cFor the teachers", "color:#475569;font-size:14px;font-style:italic")` — appears in DevTools, costs nothing on the page. |

## 8. Monetization path

Sequential, not simultaneous:

1. **Phase 1 — newsletter growth.** Tools → newsletter signup → free weekly "Independent Tutor" digest. Same playbook as Authorly.
2. **Phase 2 — affiliate.** Platform referrals (italki, Preply, Cambly, RareJob, Tutorful all pay $20–100/tutor signup). Tool affiliates (Wise, Stripe Link, Calendly).
3. **Phase 3 — paid tier (post-launch, traffic-validated).** $5–15/mo for: saved profile/contract drafts, advanced analytics, larger LLM rate limits, premium templates. Paid tier never gates the 10 launch tools.

**Out of scope at launch:** ads, sponsorships, paid tier itself. Phase 3 is a post-launch decision contingent on traffic data.

## 9. Distribution

Same Authorly playbook adapted to the audience:

- **Reddit:** r/tutor, r/languagelearning (1.4M members), r/Wyzant, r/AskAcademia, r/teachers (where overlap exists)
- **Tutor-platform communities:** italki forum, Preply Discord, Cambly Slack
- **FB groups:** UK private tutor groups, expat parent groups, Mumsnet
- **Twitter/X:** EduTwitter, language-learning hashtags (#langtwt)
- **TikTok:** #tutorlife, #tutoring, language-teacher creators
- **LinkedIn:** professional tutor profiles, education-adjacent
- **Local SEO:** *"private tutor rates UK"*, *"how to start tutoring privately"*, *"italki vs preply"*, etc.

## 10. Open questions / deferred decisions

| Question | Decision rule |
|---|---|
| **Parent demand-side capture (`/for-parents` micro-section)** | Defer until 4–6 weeks post-launch. Add only if parent-side organic traffic on rate-related pages is meaningful AND clean affiliate path exists. |
| **Subject expansion beyond language** | Defer until language-tutor traction is established (target: 1k newsletter subs). Architecture already supports it via country-pack `rates_by_subject`. |
| **Backorder `slatework.com`** | Set calendar nudge for Aug 2026; backorder via DropCatch/SnapNames if it drops. Don't make launch wait on this. |
| **Country expansion (India, Singapore, Philippines, EU)** | Add via JSON PR after launch. India/Philippines target Phase 1.5 (2–3 months post-launch). |
| **Paid tier launch** | Phase 3 — only after Phase 1 traction (>2k newsletter, >5k MAU). |

## 11. Out of scope (YAGNI)

- User accounts / login
- Server-side data persistence beyond newsletter
- Native mobile apps
- Tutor marketplace / matchmaking (we are not a platform)
- Student-facing tools
- Parent-facing tools at launch
- Non-language subjects at launch
- Paid features at launch
- Live chat / support widget
- Forum / community features

## 12. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Platforms (italki, Preply) ship competing free tools | Off-platform / private-tutor-first positioning means our audience isn't dependent on platforms. 70% of MVP is irrelevant to platforms anyway. |
| LLM API cost spikes from abuse | Per-IP-hash rate limit (10/hr free); fail closed with friendly message; cheaper model (haiku) for higher-volume tools. |
| Country data goes stale | `data_source_last_verified` timestamp on every country pack; quarterly review reminder; "last updated" badge on each tool. |
| Tax/legal advice liability | Every output carries clear disclaimer: *"Estimate only — confirm with a local accountant / lawyer."* No bespoke advice; structured information only. |
| Domain `.com` competitor revives | `slatework.com` is currently a blank squatter; if it activates, we already own `.tools` `.app` `.co` (and likely `.io`). Backorder calendar nudge for Aug 2026. |
| Brand collision with `tutorbase.com` (active SaaS) | Avoided by name choice. No other active tutoring SaaS using "Slatework" anywhere. |

## 13. Success criteria (post-launch)

| Metric | Target by 30 days | Target by 90 days |
|---|---|---|
| Unique visitors | 5,000 | 25,000 |
| Newsletter signups | 200 | 1,500 |
| Tools used per session | 1.5 | 2.0 |
| Top-3 organic SEO rankings | 3 long-tail queries | 15 long-tail queries |
| Affiliate signups (italki/Preply/Wise) | 10 | 100 |

---

**Approved scope.** Ready to move to implementation planning.
