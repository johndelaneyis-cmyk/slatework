# r/OnlineESLTeaching — first launch post (replaces r/languageteachers, 2026-05-12)

**When:** Tue May 12, 9am UK / 4am ET
**Why this sub:** 45K subs, zero subreddit-level rules (verified via API + wiki check), active daily posts, sidebar explicitly says the sub is for "discussing the different companies and giving concrete details of teacher experiences" — italki / Cambly / Preply etc. Slatework's rate calculator is bullseye for this audience. Replaces the dead r/languageteachers (178 subs, last post 8 years ago).
**Flair:** check the flair list on submit — likely "Discussion" or "Resource" if available; otherwise no flair.

**Account check:** u/Slatework needs the account to be old enough not to auto-filter. If it's brand new (created May 7), there may be a sub-level new-account delay. If first attempt is auto-filtered, modmail and ask to be approved.

---

## Title

> Built a free toolkit comparing what you actually net on italki / Preply / Cambly vs. private — plus marking, lesson plans, contracts. No signup.

## Body

Independent ESL tutor here — got tired of three things and built a fix:

1. **Not knowing what platforms actually pay you net.** Every "italki vs Preply" thread has different numbers and nobody breaks down the take-rate, the FX hit, or the per-hour ceiling once you're booked-out.
2. **Stitching seven free templates together** for what should be one workflow — rate cards, contracts, lesson plans, marking, CEFR placement.
3. **Generic ChatGPT prompts** that don't know what country my student is in or what B1 actually looks like in the wild.

The result is [Slatework](https://slatework.tools) — free, no signup, runs in your browser. Made by me (so yes, this is self-owned content; I'll keep it honest).

**The bit most relevant for this sub — the platform comparison inside the rate calculator:**

Pick your country, your language pair (en-en, en-es, etc.), and experience years. Returns suggested low/median/high private rates. Then shows you side-by-side what you'd actually net on:

- **italki** (after 15% community-tutor cut or 30% professional cut)
- **Preply** (sliding 18–33% based on hours taught with the same student)
- **Cambly** (fixed $0.17/min ≈ ~$10.20/hour)
- **Verbling** (15% cut)
- **Private direct**

Plus the FX hit if you're paid in USD but live somewhere else (UK/CA/AU/NZ/IE/HK are calibrated; more on the way). Most of the platform numbers come from each platform's published pay docs cross-checked against tutor reports; please tell me where any of them are wrong.

**The other tools, briefly:**

- **Marking accelerator** — paste student writing (or a photo of handwritten work via vision OCR). Returns categorised errors (Grammar / Vocab / Structure / Mechanics) plus three feedback variants (warm / direct / rubric-mapped). Calibrated to CEFR.
- **Lesson plan generator** — time-blocked, includes warm-up / production / wrap-up / exit ticket / differentiation. Calibrates to Cambridge / IELTS / TOEFL / GCSE if you say which.
- **Worksheet + answer-key generator** — gap-fill / multi-choice / short-answer / reading comp.
- **CEFR mapper** — rule-based Can-Do statements (no AI, runs locally) or AI mode with writing sample.
- **Parent-tutor contract builder** — fills name/rate/policy/duration, prints to PDF, fully client-side (nothing leaves your browser).

**Privacy posture:** AI tools call Anthropic, no storage or logging on my end. Contract builder is browser-only. Privacy page lays it out specifically: https://slatework.tools/privacy

**What I'd love feedback on from this sub specifically:**

1. **Platform numbers** — italki / Preply / Cambly / Verbling rates. Are any of them stale, wrong, or missing the right caveats (peak hours, tier-up windows, payout fees)?
2. **What you net at scale** — the calculator currently doesn't model "you book 20 hours/week so the FX fees compound." Would that be useful?
3. **Other platforms worth comparing** — italki cleanup, Preply, Cambly, Verbling, and Lingoda are in there; anyone want me to add others (engoo, LatinHire, NativeCamp etc.)?

I'm a tutor who codes, not a platform person — if the platform numbers don't match your actual payouts, that's the bug. Tell me and I'll fix it the same day.

---

## Length / format notes

- Lead with the platform-comparison angle since that's the sub's daily bread (browse /new — half the threads are "is X platform worth it")
- Owned-content disclosure upfront ("Made by me") — community penalises veiled self-promo, rewards directness
- Three concrete feedback asks at the bottom

## Don't include

- Emojis
- "Hey everyone!" opener
- Mention of Authorly / HN / IH
- Mention of HK rates in the post (they exist on the site but lead with the English-speaking + remote markets that this sub serves)
- The word "platform" more than ~6 times — Reddit auto-mods are sensitive to ad-language patterns

## Pre-flight check before posting

- [x] r/OnlineESLTeaching rules verified: zero sub-level rules, only Reddit defaults
- [ ] u/Slatework account ≥4 days old (created May 7 → today May 12 = OK, 5 days)
- [ ] Account has at least 1-2 comments somewhere (not 0-karma)
- [x] Slatework returns 200 (verified 07:55 UK)
- [x] FX API returns 200 with fresh rates (verified 07:55 UK)
- [x] /privacy returns 200
- [ ] You're free for the next 4 hours to respond to comments

## After posting

- Refresh every 15 min for first 2 hours, every hour after
- Reply to every comment within 30 min during first 4 hours
- Top reply pattern: ack the question + answer specifically + offer to add/fix something
- If post auto-filters or gets removed: modmail "is the account too new? Happy to wait or post anywhere else more appropriate." Don't argue.

## Anticipated tough comments

- **"Just another italki/Preply comparison":** acknowledge — yes, the comparison data is the table-stakes. The differentiator is the rate calculator outputs YOUR rate against THEIR fee structure side-by-side in one screen, not five blog posts.
- **"This is just an AI wrapper":** 4 of 10 tools call Anthropic; the other 6 (rate calc, country tax/registration packs, payment-methods reference, contract builder, CEFR rule-based mode, FX/currency display) are pure JSON + client-side compute, no AI. The AI tools save time because the CEFR/country/format/audience is already plumbed in.
- **"What about my country":** "On the roadmap. Tell me which one — country packs are JSON, single evening's work to add."
- **"AI marking is dangerous":** agreed — that's why output is structured (categorised errors + 3 feedback variants), not "here's what to write." Teacher reviews and chooses. Vision OCR step shows extracted text first for spot-check.
