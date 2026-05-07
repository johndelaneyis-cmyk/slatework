# IndieHackers — fourth launch post

**When:** Thu May 14, anytime in the day
**Format:** Maker story, longer than Reddit/HN. ~600-900 words.
**Why IH last:** maker-community audience overlaps with HN, but IH posts persist longer and reward narrative depth. Use it to fold in real comments from Tue/Wed.

---

## Title

> I built 10 free tools for independent language tutors — what I learned about building for a niche I'm part of

## Tags

- Launch
- Maker stories
- Web app

## Body

A few months ago I sat down to write three contracts for new private students and found myself opening a Google Doc, a free legal-template site, an italki tutor's blog post, and a Stack Overflow answer about UK trading allowances — to write *one* document. That was the moment I started building [Slatework](https://slatework.tools).

It's free, ten tools, no signup, country-aware for seven markets (US, UK, Canada, Australia, New Zealand, Ireland, Hong Kong). I'm an independent language tutor part-time. The tools are the things I needed for myself — rate calculator, contract builder, tax/setup guides per country, lesson planner, worksheet generator, marking accelerator with photo-OCR, CEFR placement (rule-based + AI). I shipped v0.1.0 this week.

A few things I learned that might be useful if you're building for a niche you're already in:

**1. The data is the moat, not the AI.**

Six of the ten tools don't call any LLM. They're JSON country packs — tax form names, registration thresholds, rate curves by language pair, platform fee tables, payment methods, safeguarding rules per market. The four AI tools wrap Anthropic, but the value isn't the wrapper — it's that the country pack and the rubric come pre-attached to the prompt. A tutor doesn't have to know how to write "give me a B1 lesson plan for a Spanish learner in Mexico following the Cambridge syllabus" — the form has already collected those, and the prompt is built underneath.

This was counter-intuitive to me as a builder. The AI part felt like the "cool" part during development. But every time I demoed it, what tutors got excited about was the country-specific tax page, or the contract that already had the right safeguarding clause for their jurisdiction. The AI is the engine; the country pack is the road.

**2. "No platform fee" is a stronger hook than "free."**

Free is a category that includes a hundred bad sites. "No platform fee" speaks to a specific pain that platform-tutors feel every month: italki takes 15%, Preply's tier system goes from 33% (low hours) down to 18% (high hours, gradually). When you say "no platform fee" to an experienced tutor, their jaw doesn't drop — they nod, because they've already done the math.

The hourly rate calculator shows what you'd net on each platform vs. private side-by-side. That comparison alone is the conversation-starter for tutors who've never gone independent.

**3. Privacy posture has to be specific to be believed.**

Every site says "we take privacy seriously." Tutors handle student names, sometimes minors, sometimes writing samples that include personal stories. Vague privacy copy reads as evasion, not assurance.

So my privacy page lists what each tool does individually:

- Contract builder: fully client-side, never reaches the server
- AI tools: send to Anthropic, no logging, no retention
- Newsletter: SHA-256 hash of email, no plaintext storage
- Rate limiting: day-rotated 64-bit IP fingerprint, no long-term identifier
- Feedback widget: stored in Cloudflare KV, no IP, no email

The posture is real (every claim is enforced in code), and writing it specifically also forced me to make the code match. Twice during the launch review I caught a discrepancy — a privacy bullet that wasn't yet enforced — and fixed it before shipping.

**4. Country packs ship at the speed of one tutor.**

Each country pack took me ~3 hours: read the official tax/registration sites, find the rate ranges from the local tutoring scene, list the payment methods that actually work, write the safeguarding paragraph. Seven countries was about 21 hours of research and 3 of code. The architecture is JSON files keyed by ISO country code — adding India, Singapore, Philippines, or any EU country is a single pull request, not a refactor.

This is the part I'm most excited to scale via the community: any independent tutor in an uncovered market can either send me the JSON or write a paragraph and I'll convert it. Country packs are the unit of expansion.

**Stack** (for the curious):

- Static HTML/CSS/JS, no frontend framework. Page weights 6-25 KB compressed.
- Cloudflare Pages + Pages Functions for `/api/*`.
- Anthropic Claude Sonnet 4.6 for the four AI tools (configurable via env var).
- Cloudflare KV for rate-limiting + newsletter dedup hashes.
- GitHub Actions auto-deploy to Cloudflare Pages on push to main. ~30 seconds from `git push` to live.

**Stretch goals** (in order):

- 4 more country packs (India, Singapore, Philippines, Brazil)
- Saved-draft Pro tier for power users
- A small newsletter — weekly notes on indie tutoring economics, what's working that month, useful templates
- Sibling project for parents shopping for tutors (different surface, same data)

If you're a tutor in a market I haven't covered, please email me at hello@slatework.tools and tell me your country — that's the fastest path to a country pack landing.

If you're a maker reading this and you're in a niche you're already part of: build the data, not the wrapper. The wrapper is the easy part.

Slatework is at [slatework.tools](https://slatework.tools). Free, no signup, ten tools, seven countries.

---

## Length notes

- 600-900 words is the IH sweet spot. This draft is ~750.
- Lead with the moment that started it (origin story), not the feature list.
- 4 lessons learned is a memorable structure for IH-style content.
- Mention the stack briefly toward the end — IH readers are makers and care.

## Cross-promotion

- IH allows linking to GitHub repos. If Slatework's repo is public-readable on github.com/johndelaneyis-cmyk/slatework, mention it in a comment reply when someone asks about the country pack format.
- DO link slatework.tools in the body (IH expects this).
- DO NOT link Authorly here.

## Anticipated comments

| Comment pattern | Response |
|---|---|
| "How are you doing customer acquisition?" | Honest: today is part of it — Reddit (Tue), Show HN (Wed), IH (now). No paid acq. Long-term: SEO from the country-specific guides + a weekly newsletter from real tutor questions. |
| "Why no Stripe integration / Pro tier yet?" | The 10 launch tools stay free. Pro is for higher quotas + saved drafts + API access — designed for tutors with 30+ active students. Won't build until I see signal that the free tier is over-loved by a power-user segment. |
| "Authorly?" (someone notices the sibling project) | Yes, sibling. Indie authors instead of tutors. Same architecture pattern, different country/data shape. Not finished — Slatework was the more mature one to launch first. |
| "Is this open source?" | Country packs and frontend are MIT-likely. Pages Functions are private (rate limiting + Anthropic key handling). Will firm up the OSS posture in v0.2 once I see what tutors actually fork. |
