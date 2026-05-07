# Slatework Launch Plan — May 7-14, 2026

**Goal:** Get Slatework v0.1.0 in front of independent language tutors and the broader maker community over a coordinated 8-day window. Optimize for **real-tutor signal** first (which sharpens later positioning), high-stakes Show HN second.

**Approach:** Path 1 — no studio brand, post under a project-specific account `u/slatework_*`. Studio decision deferred to when there are 3+ active projects.

---

## Day-by-day schedule

### Thu May 7 (today) — Setup

Manual user actions (see `manual-steps.md`):
1. Add `reddit@slatework.tools` alias in Cloudflare Email Routing → forward to your real inbox.
2. Register Reddit account at `reddit.com/register` using that alias. Pick `u/slatework_dev` if available, else `u/slatework_maker`, `u/slate_work`, `u/by_slatework`. Avoid `u/slateworkofficial` — reads brand-y, attracts flag.
3. Set bio: *"Building free tools for independent language tutors at slatework.tools."* Do **not** add the URL anywhere subreddit-scoped yet.
4. (Optional but recommended) Register an HN account at `news.ycombinator.com/signup` using `hn@slatework.tools` alias. Same naming logic — `slatework_dev` if available.

### Fri May 8 → Mon May 11 — Seasoning (4 days)

Goal: ~50-100 comment karma, no submissions. See `seasoning-playbook` section below for what to comment on.

Time budget: 30 minutes/day max. Don't grind.

### Tue May 12 — Reddit launch

- **9am UK / 4am ET:** Post to `r/languageteachers` (small, friendly mod team, allows "Resource" posts). Use draft at `posts/r-languageteachers.md`.
- **2pm UK / 9am ET:** If first post was welcomed (no removal, some upvotes), post to `r/ESL_Teachers`. Use draft at `posts/r-eslteachers.md`.
- **Hold:** `r/languagelearning` until you've messaged a mod and gotten explicit approval for a "Resource" flair post. Their auto-mod removes most resource shares from new accounts.

### Wed May 13 — Show HN

- **2pm UK / 9am ET sharp.** Peak HN front-page traffic. Tue is also good but Wed gives you Tue's Reddit comments to fold into the HN response prep.
- Use draft at `posts/show-hn.md`.
- **Be available 4-6 hours after submission** to respond to comments. Top response in first 90 minutes is the single biggest predictor of whether the post climbs.

### Thu May 14 — IndieHackers

- Post anytime in the day; IH posts persist.
- Use draft at `posts/indiehackers.md`. Maker-story format, longer than Reddit/HN.

### Fri May 15 — Quiet day, observe

- No new posts. Read all comments across all venues. Note recurring questions, objections, requested features.
- This is the **input for D (marketing infra)** — newsletter content + SEO blog comes from real-comment patterns, not invented topics.

---

## Reddit seasoning playbook

### Subreddits to engage with (4-day rotation)

| Subreddit | Subs | Why | What to comment on |
|---|---:|---|---|
| `r/languagelearning` | 1.8M+ | Massive — biggest tutor-adjacent audience | "How much should I pay for tutoring?" / "italki vs Preply?" / "What CEFR level am I?" |
| `r/ESL_Teachers` | 90K+ | Bullseye | Lesson planning, teaching adults vs kids, freelance vs platform |
| `r/languageteachers` | 5K | Small + dedicated | Anything — small community, mods read everything |
| `r/Tutor` | 30K+ | All subjects, but language tutors hang out | Rate-setting, contract questions, "first private student" anxiety |
| `r/teaching` | 200K+ | Broader teaching | Marking workflow, student differentiation, AI-in-classroom |
| `r/duolingo` | 200K+ | Adjacent to learner journey | "Is Duolingo enough?" / "What level am I really?" |

### What to comment on (good shapes)

- **"What's a fair rate for [language] tutoring in [country]?"** — share the country-specific reasoning (UK trading allowance, US 1099, HK BR). You wrote the country packs; this knowledge is real.
- **"italki vs Preply vs going private?"** — fee comparison, tier-tutor reality (% gets worse, not better), private-rate math.
- **"How do I place a student at a CEFR level?"** — the Can-Do statement framework. Mention CEFR by name; don't mention any tool.
- **"Do I need to register as self-employed to tutor on the side?"** — country-specific (UK trading allowance £1,000, etc.).
- **"Is ChatGPT good enough for lesson planning?"** — answer honestly: yes for ideas, no for repeated structure. The right answer here is one you actually believe.

### Anti-patterns (auto-removal or shadow-ban risk)

- **DO NOT** mention `slatework.tools` in any comment during seasoning. Not even in passing. Not even "btw I'm building something like this."
- **DO NOT** comment on a thread, then create a post that links to your site. Reddit's anti-spam pattern recognizers catch this.
- **DO NOT** crosspost or DM strangers your URL.
- **DO NOT** use a phrase like "I built a tool that…" — even unrelated to your project — it pattern-matches as setup-for-promo.
- **DO NOT** comment from a brand-new account on r/languagelearning — auto-mod will remove. Comment in smaller subs first to build karma, then move to bigger ones.

### What "good seasoning" looks like

After 4 days you should have ~10-20 comments across 4-6 subreddits, ~50-100 total comment karma, and at least one comment that someone replied to with a follow-up question. That last one matters most: it's the proof that your tone reads as helpful tutor, not promo bot.

---

## Launch post strategy

### Title formulas that work

- **r/languageteachers:** "[Resource] Free toolkit for independent language tutors — country-aware rate calculator, contract builder, lesson planner (no signup, no platform fee)"
- **r/ESL_Teachers:** "I built a free toolkit for independent tutors — feedback wanted before I add more countries"
- **Show HN:** "Show HN: Slatework – Free tools for independent language tutors"
- **IndieHackers:** "I built 10 tools for independent language tutors in N weeks — here's what I learned"

### Anticipated comment patterns (prep responses)

| Comment | Where it shows up | How to respond |
|---|---|---|
| "How do you make money?" | All venues | Honest: affiliate links to tools tutors already use (Wise, Stripe Link), optional Pro tier later. The 10 free tools stay free. |
| "Why not just use ChatGPT?" | All venues | Answer in 3 reasons (already in homepage FAQ): pre-contextualized, tutor-specific structure, no quota panic. Link to FAQ. |
| "Is my student data private?" | Reddit + IH | Strong answer: never stored, never logged, never shared/sold. Link to /privacy.html. |
| "What about [country I'm in]?" | All venues | "On the roadmap — JSON country pack, single PR. Tell me which country and I'll prioritize. Email hello@slatework.tools." |
| "Looks like AI slop" / "Just a wrapper" | HN only | Acknowledge: yes, AI is the engine for 4/10 tools. The other 6 (rate calculator, contract builder, country tax/setup guides, payment methods) are pure data — country packs as JSON. The AI tools have country/level/format already plugged in, that's the value. |
| "Why .tools?" | HN | Honest: cheaper than .com, fits the toolkit framing. |

### What to avoid in posts

- Hyperbole. "Game-changing" / "revolutionary" / "10x" — auto-downvote on HN, eye-roll on Reddit.
- Emojis (any). Reads as marketing.
- Calls to action other than "feedback wanted." No "Sign up!" "Buy now!" "Share if you agree!"
- Mentioning Authorly, justpromptit, or any other project. Keep each post about Slatework only.
- Mentioning the launch dates of other venues. Each post stands alone.

---

## Success metrics

**Don't measure traffic.** Measure these instead:

- **Comments with substance** (not "cool"): target 10+ across all venues by Friday May 15.
- **Country requests:** any tutor asks "what about [my country]?" — that's a signal of fit. Target 3+.
- **Bug reports / typo flags:** real users testing real tools. Target 2+.
- **Newsletter signups:** noise but not zero — target 50+.
- **Direct emails to hello@slatework.tools:** higher signal than newsletter. Target 5+.

If by Saturday May 16 you have <2 substance comments and <1 country request, the positioning is wrong, not the product. The fix is post-launch reposition, not more polish.

---

## What this launch is NOT trying to do

- It's not trying to rank on Google for "language tutoring tools." That's step D (marketing infra), 4-12 weeks.
- It's not trying to convert sign-ups to revenue. There's no revenue model yet on purpose.
- It's not trying to look like a real company. It's trying to look like a real tutor who built a real thing — that's the trust signal at this stage.

---

## Post-launch (Sat May 16 onwards)

This is where step D begins. By then you'll have:
- A list of country packs to add (from comments)
- A list of features tutors actually want (from emails)
- A few quoted bits from tutors saying nice things (testimonials for the newsletter)
- A first weekly newsletter draft based on what surfaced

D is its own brainstorm. Not in scope for this doc.
