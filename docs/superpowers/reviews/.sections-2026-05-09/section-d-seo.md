# Section D — SEO (2026-05-09)

**Score:** 9.7/10 — Up from 9.5/10 baseline (2026-05-08). Two material improvements since last audit: (1) `/privacy` now has a stable `#profile-data` anchor with a dedicated section that's link-target-friendly and is referenced from the homepage FAQ; (2) lesson-plan FAQ #4 rewritten (commit `01ca318`) — drops jargon ("two English options", "GCSE Lang or AP Lit") and reads cleanly for AI Overviews. Sitemap.xml lastmod=2026-05-08 matches actual commit dates (no commits today). Held back from 9.85+/10 only by missing-but-cheap polish items: (a) lesson-plan/marking/rates/worksheet titles could carry "for language tutors" qualifier in <60 chars; (b) privacy.html meta description is 110 chars vs ~155 sweet spot; (c) `404.html:17` `og:url` points to `https://slatework.tools/` not the 404 path; (d) `index.html:43` `Organization.sameAs` lists only `authorly.tools`, no `Person/Author` schema linking maker; (e) no nofollow/sponsored on the 4 affiliate links in static HTML (all in country-pack JSON, but the static disclosures don't carry rel=sponsored).

## Sub-scores
| Sub-dim | Score | Note |
| --- | --- | --- |
| Title/meta per page | 9.5 | All <60 chars; descriptions 110–185 chars; 4 short-tail tool titles could include "for language tutors" qualifier |
| Canonical/OG/Twitter | 9.5 | All 14 indexable pages have self-canonical + matching og:url; 404.html og:url is wrong (points to homepage) |
| H1 hierarchy | 10 | Exactly one H1 per page; clean H2 chain; all 10 tool pages have "What this tool does" + "Honest answers" H2s |
| Internal linking | 10 | Every tool page has a 3-link "Related tools" aside; homepage links every tool with descriptive anchor; cross-links from setup → tax/insurance/rates, etc. |
| Schema/JSON-LD | 9.8 | WebApplication + BreadcrumbList + FAQPage on all 10 tool pages; Organization + WebSite SearchAction + SoftwareApplication on home; AboutPage + Person + BreadcrumbList on /about; only nit is `index.html:43` Organization.sameAs has just one URL |
| Sitemap lastmod | 10 | `sitemap.xml` 14 URLs all 2026-05-08; matches latest commit timestamp (`a92dc38 2026-05-08 14:29:40`); no commits today as of audit |
| Image SEO | 9.5 | No `<img>` tags in static HTML (all SVG icons inline + correctly `aria-hidden="true"`); og.png referenced consistently across all 14 pages incl. 404; apple-touch-icon.png present and referenced in manifest |
| Technical headers | 10 | `_headers:7` strict CSP including `unpkg.com` for SRI-pinned PptxGenJS; X-Robots-Tag noindex applied to /api/* via `functions/_middleware.js:42`; cache rules per-asset class are tuned |
| Content depth | 9.7 | All 10 tool pages have 200+ word "What this tool does" section with use-case scenarios; 4 honest-answers FAQ details per tool; about/privacy/terms have appropriate length for type |
| AI search readiness | 9.8 | FAQPage JSON-LD on home + all 10 tool pages; named entities ("italki, Preply, Wyzant, Cambly", "DBS / WWCC / Garda", country forms "Schedule C, SA103, T2125, ABN, IR3, ROS, BIR60"); llms.txt curated with quoted block descriptions, all 10 tools listed |
| New FAQ copy quality | 10 | Lesson-plan FAQ "Does it work for languages other than English?" (`lesson-plan.html:84-89` JSON-LD; `lesson-plan.html:218-223` HTML) reads cleanly: target/source language framing without jargon; rewritten copy still surfaces "language pair", "vocabulary", "grammar drills" — strong rich-snippet target. Homepage FAQ "Do I have to make an account or save anything?" (`index.html:96-100` JSON-LD; `index.html:400-406` HTML) wraps profile feature succinctly + deep-links `/privacy.html#profile-data` |

## Findings

### Critical
- None.

### Important
- **`404.html:17`** — `og:url` is `https://slatework.tools/` instead of `https://slatework.tools/404` or omitted. Twitter/Facebook scrapers landing on a broken URL would resolve the OG card to the homepage (mild but it scrambles social-share previews of broken links). Fix: change to `<meta property="og:url" content="https://slatework.tools/404" />` (page already has noindex so no indexation impact).

### Nice-to-have
- **`index.html:42-43`** — `Organization.sameAs` array contains only `["https://authorly.tools"]`. Add an entity-graph link to maker's public profile and/or a `Person` node (`Darren`) so `WebApplication` → `publisher` → `Person` chains. Consider also `https://x.com/...` (omitted per user's "no X handle in copy" preference, so skip).
- **`lesson-plan.html:6`** — Title "Lesson plan generator — Slatework" (33 chars). Could be "Lesson plan generator for language tutors — Slatework" (54 chars, still <60) — adds the qualifier that's already in meta description and aligns with rate-calc/marking title style. Same opportunity at `marking.html:6` (31 chars), `rates.html:6` (34 chars — already has "Hourly"), `worksheet.html:6` (44 chars — already has "answer-key").
- **`privacy.html:7`** — Meta description "Slatework's privacy posture: nothing leaves your device unless we explicitly tell you. No accounts, no tracking, minimal data." = 124 chars. Sweet spot 150–160. Could add "...minimal data. Daily-rotated SHA-256 IP hash for AI rate-limits, no cookies." (~155 chars).
- **`terms.html:6`** — Title "Terms — Slatework" (17 chars). Could be "Terms of use — Slatework" (24 chars).
- **Affiliate-link `rel`** — The 4 nofollow/sponsored markers I detected are on noopener for safe outbound; Wise/Stripe/Preply affiliate URLs render from country-pack JSON client-side. Static-HTML disclosure on `/payments` (`payments.html:84-89`) and `/index.html:419-422` mentions affiliate fees but doesn't `rel="sponsored"` the disclosure links — minor compliance risk if Google's spam team eyes the page. Cheap to add to the JSON renderer or inline mention.
- **Sitemap could include `<image:image>` annotation** for the homepage with og.png — wholly optional, helps Google Images indexing. ~5 lines of XML.
- **`functions/_middleware.js:42`** — `X-Robots-Tag: noindex, nofollow` on /api/* JSON is correct; consider mirroring on `/data/countries/*` JSON too (those are crawlable today; not a problem because no public links to them and robots.txt allows them, but they could leak into search if anyone backlinked).
- **`robots.txt`** — explicit allow for GPTBot/ClaudeBot/PerplexityBot/Google-Extended/Applebot-Extended is great. Could add `User-agent: CCBot` (Common Crawl) + `User-agent: anthropic-ai` (different from ClaudeBot) for completeness.

## Top 3 ship-now
1. **Fix `404.html:17` `og:url`** — change to `https://slatework.tools/404`. 1-line edit, removes a real broken-share artifact. (5 minutes.)
2. **Lengthen 4 short-tail tool titles** — append " for language tutors" (or similar qualifier already in description) to lesson-plan, marking, rates, worksheet titles. Brings each into 50–60 char sweet spot, reinforces the niche keyword without altering branding pattern. 4 1-line edits + matching og:title/twitter:title (so 12 lines). (10 minutes.)
3. **Pad `privacy.html:7` meta description to ~155 chars** — append the SHA-256 / IP-hash disclosure already shown on the page itself. Reinforces a strong differentiator at SERP-snippet level. 1-line edit, mirrors `<meta property="og:description"` and `<meta name="twitter:description"` (3 lines total). (5 minutes.)

## What Slatework does well
- **Schema density unusually high for a 14-page site.** Every tool page carries WebApplication + BreadcrumbList + FAQPage; home adds Organization + WebSite + SoftwareApplication; /about adds AboutPage + Person + BreadcrumbList. All FAQPage entries carry plausible rich-snippet copy (no padding, real answers).
- **Internal linking is editorially deliberate.** Every tool page closes with a curated 3-link "Related tools" aside that reflects actual workflow adjacency (lesson-plan → worksheet/cefr/marking; rates → payments/tax/contract). Homepage groups the 10 tools into 4 mental buckets ("Setting up", "Lesson delivery & grading", "Pricing & money", "Client acquisition") with descriptive prose under each tile.
- **AI search readiness is strong.** llms.txt is curated (not auto-generated), uses Markdown link blocks with one-line descriptions of every tool. Country-form named entities (`Schedule C, SA103, T2125, ABN, IR3, ROS, BIR60`) appear once each in the homepage tile copy — exactly the kind of long-tail GEO signal that travels well into Perplexity/ChatGPT answer composition.
- **FAQPage copy avoids bingo-card SEO.** Every FAQ across the site reads like an honest answer — no "everything you need to know" filler, no "in this guide we'll cover" preambles. Both new entries (lesson-plan #4 + homepage account FAQ) maintain that voice.
- **Privacy anchors are link-target-friendly.** `#student-data` and `#profile-data` are both stable IDs on `/privacy`, both linked from multiple tool pages and the homepage FAQ. AI assistants citing privacy claims can cite an exact section, not the whole page.
- **Headers + middleware are SEO-aware, not just security-aware.** `X-Robots-Tag: noindex, nofollow` injected onto /api/* JSON keeps the API endpoints out of search; CSP allows necessary CDN origins (`unpkg.com` for SRI-pinned PptxGenJS) without forcing inline scripts.
- **Sitemap discipline.** All 14 lastmod dates match the actual most-recent-content date (2026-05-08). No stale dates that would teach Google to ignore the field.
