# Personas 1-4 — HK + Young-Learner Heavy

Walk-through audit, no live API calls. Reasoning grounded in `docs/superpowers/reviews/2026-05-09-post-launch-audit.md` and read of `src/lib/profile.js`, `functions/api/slideshow.js`, `src/lib/slideshow-render.js`, `index.html`.

---

## Persona 1: Aiya — 28, HK supplementary tutorial centre, Y3 future-tense / Ocean Park

**Score:** 7.6/10  ·  **Returns?** Yes

**Walkthrough:**
- **Landing** (`index.html`) — peer-tutor voice + "free, privacy-first, no signup" lands well for a tutorial-centre teacher used to upselling. HK is in the 7-market list, so the "Showing for [country]" affordance signals fit. Trust: high.
- **Profile decision** — Aiya is iPad-first and trusts web tools; she'll opt in. Sets tutor: HK, target=English, source=Cantonese, base rate HKD. Adds Student #1 "Y3 group" with level=A1, mode=small_group. **Audience derives `young_learner`** — correct outcome.
- **Lesson-plan with slideshow** — fills "future tense, A1, small group, 60 min, topic = Ocean Park trip". Hits Generate, then "Make slideshow." Slideshow generates. **First friction: `.btn-ghost` toolbar buttons render unstyled** (`src/lib/slideshow-render.js:108-109`) — looks broken on her iPad. She still tries Download .pptx. **Second friction: PPTX downloads text-only**, no Pexels photos, because of the `connect-src` CSP gap (`_headers:7`). She'll notice — Y3 kids need pictures.
- **Worksheet** — derived correctly (A1 + small_group → young_learner copy is appropriate). Output usable.
- **Rates check on opening day** — falls into the broken caption template: "Showing Hourly rate calculator for Hong Kong Change" (audit Critical #5). Looks clumsy but doesn't block her.

**Friction:**
1. Slideshow PPTX downloads with no images for kids who need images (CSP `connect-src` gap, audit Critical #1) — costs her the headline reason she came back.
2. Stacked empty profile-mount strips push the form below the fold on her iPad (audit Critical #7) — tutorial centre is time-pressed, that's annoying every visit.

**Delights:** Cantonese as a source-language option survived the English-collapse refactor; HK rates with HKD currency; payments page covers FPS/PayMe. She's the persona Slatework was practically designed for.

---

## Persona 2: Linda — 34, HK kindergarten English prep, "household objects" for 4-year-olds

**Score:** 6.8/10  ·  **Returns?** Maybe

**Walkthrough:**
- **Landing** — lands. "Privacy-first, no signup" matters disproportionately to HK preschool parents and Linda knows it.
- **Profile decision** — moderate-tech, iPad. She'll skip profile and try "Quick lesson" first (the opt-in design is right for her).
- **Lesson-plan with slideshow** — picks A1, one_to_one (she does 1:1 prep), no exam, target=English, topic="household objects". **Audience derivation:** per `src/lib/profile.js:275-283`, A1 + mode≠'tutor' → `young_learner`. Correct for Linda. Slideshow generates.
- **Slideshow flow specifically** — this is her killer use case. She wants the .pptx with cartoon images of a chair, a table, a bed. Two failure modes converge:
  - Pexels host missing from CSP `connect-src` (Critical #1) → her slideshow downloads as text-only. **For pre-literate 4-year-olds, a text-only deck is unusable.**
  - If Sonnet drift trips fallback path, she gets `'Look. Say the word.'` infantilizing copy (which actually fits 4-year-olds, but with no images attached, it reads bizarrely on a slide by itself).
- **Payments + contract** — these are the secondary tools she'd come back for. HK preschool parent contracts are common; the contract tool helps. Payments page (FPS/PayMe) is genuinely useful.

**Friction:**
1. Slideshow ships text-only — for her audience this is a blocker, not friction. (Critical #1)
2. Slideshow shell looks like "a generic AI tool" not "Slatework" (audit Section A) — Linda is moderate-tech, the broken `.btn-ghost` styling will read as "this site is unfinished" and she'll bounce.

**Delights:** `young_learner` correctly inferred without her ticking a box. Contract template tailored to under-18s. The fact she didn't have to make an account.

---

## Persona 3: Wei — 41, Mandarin tutor in HK, expat 11-year-old, int'l-school admissions interview

**Score:** 8.4/10  ·  **Returns?** Yes

**Walkthrough:**
- **Landing** — the "across 7 markets" framing is fine, but Wei is high-tech (Notion / Anki / Pleco). She'll evaluate Slatework as a tool, not a brand. Verdict on landing: solid, doesn't oversell.
- **Profile decision** — she'll opt in immediately. Tutor: HK, target=Mandarin, source=English. Student: 11yo, level B1 (best-fit guess for an interview-prep kid).
- **Lesson-plan** — B1 → `teen` audience (`src/lib/profile.js:283`). Correct. Topic=interview practice, mode=one_to_one, 45min. Generation works. The deck targets a teenager not a kid — she's relieved.
- **Slideshow** — she'll try it once. Deck downloads with Pexels images for B1 (but only if connect-src is fixed; otherwise text-only, less catastrophic for B1 since the slides have substantive text — but still a regression). Wei's high-tech enough to notice the lack of images and dismiss it. She'd reach for the lesson-plan markdown export, which works and is what she actually wanted anyway.
- **Worksheet, marking, contract, rates** — all four tools fit. Marking with photo upload of student handwriting is the hook for high-tech tutors.

**Friction:**
1. Mandarin slideshow body copy ships in English on the slides (`functions/api/slideshow.js:124-132` — fallback always English; primary deck depends on Sonnet output following target lang). For Mandarin tutors, English-on-slide is a small but ongoing irritation.
2. Slideshow shell undersells the "slate" brand — Wei has taste, she'll downgrade her opinion of the whole site by 5-10% on the slideshow alone (audit Important Finding, Section A).

**Delights:** B1 → teen → calm, useful image density (not cartoon, not zero). Marking tool's photo upload. The fact that the lesson-plan output is valid markdown she can paste into Notion.

---

## Persona 4: Patrick — 67, Edinburgh, IELTS speaking band-7 prep, Tuesday session

**Score:** 8.9/10  ·  **Returns?** Yes

**Walkthrough:**
- **Landing** — the "no signup" line is everything for Patrick. He'd have closed the tab on a login wall.
- **Profile decision** — **Skips.** He'll never click the opt-in. Goes straight to "Quick lesson" / direct tool nav. The opt-in design choice is right for him.
- **Lesson-plan with exam=IELTS** — he picks B2/C1 (best-fit for a band-7 candidate), exam=IELTS, mode=one_to_one. Audience derives `exam_prep` (the early-return at `src/lib/profile.js:277` on `trimmedExam.length >= 2`). Correct. Deck targets adult IELTS prep.
- **Slideshow** — Patrick is low-tech and email-first. **He won't generate a slideshow.** He wants the lesson plan as text/markdown to print. The slideshow toggle is invisible to him — that's actually fine, it's not in his way.
- **Marking** — he'll try this. His students do speaking, not handwriting, so it's a partial fit. Photo upload of his hand-written feedback notes might work; ambiguous.
- **Rates check, once** — looks at GBP rates for Edinburgh, captures the number, leaves. Falls into the broken caption template ("Showing Hourly rate calculator for United Kingdom Change", Critical #5) — but Patrick won't notice and won't care.

**Friction:**
1. The collapsed-English target dropdown means "English (any variety)" rather than the GB-specific variant he might subconsciously want. Tiny gripe, but he's the persona who'd notice.
2. Marking's photo-upload UI is the friction-iest UI on the site for a low-tech user — he might try once and fall back to email. Not a Critical from the audit, but persona-specific.

**Delights:** Zero signup. Exam=IELTS routing works without him touching a profile. Plain markdown lesson-plan output prints nicely. `connect-src` CSP bug doesn't bite him because he never opens the slideshow.

---

## Section findings

**Cross-persona patterns (2+ personas hit):**
- **PPTX text-only failure** (CSP `connect-src` gap, Critical #1) hits Aiya and Linda hard, hits Wei mildly. **Three of four personas affected.** This is the dominant cross-persona issue in this segment.
- **Stacked empty profile-mount strips** (Critical #7) cost Aiya and Linda above-fold real estate on iPad. Patrick skips profile so he doesn't see them; Wei opts in so they collapse into useful state.
- **`.btn-ghost` unstyled toolbar** (Critical #3) breaks slideshow trust for Aiya, Linda, Wei. Patrick never sees it. Three of four affected.
- **Caption template broken English** (Critical #5) hits Aiya and Patrick on rates page. Visible but not blocking.

**Most damaging finding for this segment:**
The Pexels `connect-src` CSP gap. For HK young-learner tutors (Aiya, Linda — the segment's centre of gravity), text-only slideshows are useless. A 4-year-old does not learn "table" from the word `table` rendered in 24pt sans-serif. This single bug downgrades two personas from "Yes return" to "Maybe return."

**Cheapest single fix that helps multiple personas in this block:**
Critical #1 — add `https://images.pexels.com` to `_headers:7` `connect-src` directive. **One line.** Fixes the killer use case for Aiya and Linda, restores parity for Wei, doesn't affect Patrick. Score uplift: Aiya 7.6 → 8.5, Linda 6.8 → 8.0, Wei 8.4 → 8.6. Block average jumps ~1 point for ~30 seconds of work.

**Second-cheapest:** Critical #3 — replace `.btn-ghost` with `.btn-link` in `src/lib/slideshow-render.js:108-109`. ~30 seconds. Restores slideshow toolbar trust signal for everyone except Patrick (who never opens it).

**Note on audience-derivation Critical #2:**
Within this 4-persona block, Critical #2 is dormant. Aiya = correct, Linda = correct (A1 + young students), Wei = B1 → teen (rule unaffected), Patrick = exam=IELTS (early return). The bug bites the next block (UK/EU adult-A1 and US senior-A1 personas), not this one. Still ship the fix — but note it didn't fire here.
