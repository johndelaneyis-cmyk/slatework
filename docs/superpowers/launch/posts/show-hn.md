# Show HN — third launch post

**When:** Wed May 13, 2pm UK / 9am ET sharp
**Why Wed not Tue:** Tue is also peak, but Wed lets you fold Tuesday's Reddit comments into your HN response prep — sharpen the FAQ, anticipate concerns.
**Account:** HN account ideally with 1+ week of comment history. If brand-new, the post survives but ranks slightly lower. Acceptable.

---

## Title (HN-specific format)

> Show HN: Slatework – Free tools for independent language tutors

**Title rules:**
- HN's `Show HN` prefix is mandatory; submission won't surface in /show without it
- No hyperbole. No emojis. No "I built." Just the noun phrase.
- Max ~80 chars
- Don't add "AI-powered" — HN downvotes that immediately

---

## URL field

`https://slatework.tools`

---

## Text body (optional but recommended)

Hi HN,

I'm a part-time language tutor and got annoyed at three things: stitching seven free templates together for what should be one workflow; handing platforms 30% of my rate after they've already done the matchmaking; and AI prompts that don't know what country my student is in or what CEFR level B1 actually means.

Slatework is ten free tools for independent language tutors — country-aware for the US, UK, Canada, Australia, New Zealand, Ireland, and Hong Kong. No signup. The four AI-powered tools (lesson plan generator, worksheet generator, marking accelerator, CEFR-from-writing-sample) call Anthropic via Cloudflare Pages Functions. The other six are pure data — JSON country packs and client-side compute. The contract builder is fully browser-side; nothing about your student leaves your machine.

A few things that may be relevant here:

- **Privacy posture is real, not theatre.** No request body logging. Newsletter dedup uses SHA-256 hashes — no plaintext email storage. IP rate-limiting uses day-rotated SHA-256 fingerprints, no long-term identifier. Strict CSP, HSTS preload, COOP/CORP same-origin, X-Frame-Options DENY, Permissions-Policy zeroing camera/mic/geo/payment. Detail at /privacy.

- **Country packs are JSON.** Each market is one file in `data/countries/<iso>.json` — tax form name + URL, rate ranges by language pair, payment methods, business-registration thresholds, safeguarding requirements. Adding a country is a single PR, not a refactor. PRs welcome.

- **Stack:** static HTML/CSS/JS + Cloudflare Pages + Pages Functions + Anthropic. No frontend framework. Inline scripts, currently behind `'unsafe-inline'` in CSP — moving to nonces in v0.2. Page weights are ~6-25 KB compressed.

- **AI tools degrade transparently.** If `ANTHROPIC_API_KEY` is unset, endpoints return 503 with a specific error string the frontend renders. Validation runs before the API call so non-AI errors are still 400, not 503.

- **Built solo over a few weeks.** No funding. Free, with no plan to paywall the 10 launch tools. Optional Pro tier later for higher AI quotas. Affiliate links to tools tutors already use (Wise, Stripe Link) cover hosting.

What I'd genuinely value from HN:

1. Privacy/security posture — anything I missed in `_headers` or the CSP?
2. The model-fallback pattern (env var → 503 with frontend-rendered string) — better idiom?
3. Any tutors here, please tell me what your country pack should include.

Slatework just shipped v0.1.0 today. Comments very welcome.

---

## Pre-flight check before posting (Wed May 13)

- [ ] `https://slatework.tools` returns 200 at 1:55pm UK
- [ ] All 4 AI endpoints return 503 with a real key, or 200 with a generated response — pick one, don't ship both
- [ ] No "Lorem ipsum" / placeholder anywhere on the visible site
- [ ] Privacy page is accurate to the current code (re-read /privacy)
- [ ] Email `hello@slatework.tools` is monitored for the next 6h
- [ ] You're free 2pm-8pm UK to respond to comments

## Post-submit behavior

- **First 30 minutes:** post needs early upvotes to climb. Don't ask friends to upvote — HN catches and shadow-flags. Just let it find the audience.
- **First 90 minutes:** the comment most likely to define the post is the first substantial reply. Watch for it. Reply with substance, not ack-and-thank.
- **First 4 hours:** if you're at 5+ points, you're climbing /show. If you're at 1-2 with no comments, the title may be wrong; you can resubmit once after ~6 hours per HN guidelines.
- **First 24 hours:** the post lives or dies. Don't crosspost the URL elsewhere asking people to comment — HN's "Showmod" filters detect coordinated traffic.

## Anticipated tough HN comments + prep

| Comment | Response strategy |
|---|---|
| "Why not just use ChatGPT?" | Three reasons — pre-context (country/level/format already plugged in), tutor-specific output structure (timed blocks, exit tickets, rubric-mapped feedback), no quota panic for an active tutor. Use ChatGPT for open-ended thinking; use Slatework when you need the same shape of output repeatedly. |
| "Just an AI wrapper" | Acknowledge: yes, 4 of 10 tools wrap Claude. The other 6 are pure data — JSON country packs (tax thresholds, rate curves, payment-method cataloguing) and a deterministic CEFR rule-based mapper that runs entirely in-browser. The wrapper value isn't the AI — it's that the country pack and rubric come pre-attached to the prompt. |
| "How do you make money?" | Affiliate links to Wise, Stripe Link, and similar (tools tutors would already pick). The 10 free tools stay free. Optional Pro tier later for power users with bigger quotas — saved drafts, multi-student, API access. No paywall on what's shipped today. |
| "Privacy claims feel hand-wavy" | They're specific: SHA-256 newsletter dedup, day-rotated 64-bit IP hashes (truncated for KV-key compactness, daily rotation does the privacy work), no request body logging, contract builder fully client-side. /privacy lays out each tool's data flow individually. |
| "The CSP has unsafe-inline" | True. Inline scripts on every tool page require it. v0.2 moves them to external files with nonces. The threat model is "Anthropic response rendered into innerHTML" — `escapeHtml` is called before every interpolation in the affected files (marking.html, cefr.html). |
| "What model? You should disclose" | Sonnet 4.6 across all 4 endpoints. Configurable via `ANTHROPIC_MODEL` env var. |
| "Why .tools?" | Cheaper than .com, fits the toolkit framing. Authorly (a sibling project for indie authors) is at `.tools` too. The TLD is the signature. |

## Don't do

- Don't link to Authorly in the post or comments. Different audience, different launch.
- Don't paste the Reddit links in the HN comments. Each venue's audience is different.
- Don't argue with downvotes. Every "this is just X" comment that gets a calm, specific reply is a recovered impression for the next reader.
