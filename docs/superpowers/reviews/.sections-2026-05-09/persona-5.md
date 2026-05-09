# Persona Block 5 — US + Edge Case (2026-05-09)

Walk-through audit, no live API calls. Four personas: a NYC bilingual ESL teacher with adult-ed day job + private side gig (Carlos), a US homeschool parent using the toolkit as a free curriculum aid (Sarah), a London-based Japanese tutor running a long-term private client (Tomoko), and a brand-new Edinburgh undergrad who needs the *whole* business-setup pack (Dani — the edge case Slatework is supposedly built for).

**Block average: 8.55/10.** Three of four personas leave with a bookmark. Slatework's "tutor toolkit" promise lands cleanly for Carlos, Tomoko, and Dani; Sarah is the real friction case — the homeschool-parent use is real and obvious from the slideshow and lesson-plan, but the surrounding chrome (rates, tax, payments, contract, insurance) is loud about her not being the audience and no copy or path acknowledges her on landing. Two systemic issues recur across all four: (1) the `// MONO //` mode-as-caption tile labels assume a tutor who already speaks fluent Slatework, and (2) the lesson-plan above-the-form chrome stack identified in Section A re-surfaces here as concrete persona friction (Carlos hits it twice in one Sunday session).

---

## Persona 17 — Carlos, 36, NYC bilingual ESL teacher

**Context:** Bronx-based. Day job teaching adult ESL at a community-based org (Mon–Thu, two evenings, classroom-of-12-ish — "small group" in Slatework's model). Six paying private students on Tuesday and Saturday at his kitchen table. Spanish/Mandarin/Bengali L1 students, A1–B1. Uses Google Classroom for the day-job admin. Moderate tech literacy.

### 1. Landing
- Hits `/` on his phone after dinner Sunday. Hero (`index.html:164`) reads `Tutor tools that don't waste your evening.` — that's exactly the problem. The dot+ "// v0.1.0 · 10 tools · 7 countries · live now" mono-caption (`:170`) reassures him the project is real.
- The live preview widget on the right (`:178-205`) auto-loads US rates. He glances at the median-rate badge — sees `—` then `// loading…` flash — fine, doesn't dwell. Picks "Spanish" on the language pair to satisfy curiosity. Sees `$50/hr` median for `es-en` US — that's roughly what he charges his private students ($60). Reassured, scrolls.
- The two buckets ("Setting up your tutoring business" / "Lesson delivery & grading") read clearly. Tile `// MONO //` slugs (`// setup`, `// tax`, `// insurance`, `// lesson-plan`) — he gets it because he's a teacher and reads English well, but the slug-as-label idiom is a code-style affectation; on a phone screen the slug repeats the title (`// lesson-plan` above `Lesson plan generator`), which costs vertical space.
- Verdict on landing: **strong**. He clicks "Lesson plan generator" first.

### 2. Profile decision
- He lands on `lesson-plan.html`. Above the form he sees `#profile-mount` — empty initially (`lesson-plan.html:108-112`) — but a "Save your tutor info?" save-link strip appears once the form is touched. The pitch (`profile-ui.js` save-link copy: "Speeds up next time. Saved in this browser only — never to our servers.") is on-voice and trustworthy.
- Carlos has six students plus a day-job class. Six private students = potentially six profiles + one "small group" profile. He reads "Saved in this browser only" carefully — he's been burned by browser-localStorage products before (Sunday prep on his phone, Monday on the laptop at the org). Decision: opt in for the **tutor strip** (his own info — country US, teaching English-Spanish, 5 years), but he holds off on student profiles for tonight. He'll use the per-lesson form fields for tonight's small-group plan and Tuesday's 1:1.
- The tutor editor itself is clean — 3 fields, "Cancel" + "Save", warm reassurance copy. 30 seconds. Modal closes, the tutor strip appears (`profile-ui.js:78-148`).

### 3. Tool walkthrough — Sunday session

**a. Lesson-plan #1: Monday small_group adult ESL (12 students, B1, weekend topic).**
- He reads the form top-to-bottom. The above-the-form chrome stack identified in Section A bites here: privacy-notice → tutor-strip → empty student-strip slot → save-link → noscript → first form row. That's four nearly-identical horizontal cards before "Target language". He gets through it but later he says "the form is buried" without being prompted.
- Target = English (auto-defaulted via `target_language=English` for ESL tutors? Actually no — the select defaults to nothing, he picks English). Source = Spanish (he picks the most common L1 in his small group). The source/target help-text mismatch flagged in Section F lands: "Pick the language being taught" vs "The language the student already speaks" — he reads them both, no real friction, just a fractional pause. Level B1, Mode `small_group (3-6)`. **Friction:** small_group is `3-6` in the option text, but his actual class is 12. He picks classroom (25). Now the plan generates for a 25-student classroom, which is twice his real size. There's no "Other / specify size" path. He'll work around it.
- Goal textarea — 200 words about past simple weekend topic. Exam input — leaves blank.
- Submit. Plan generates. He copies it. Shape is right.

**b. Lesson-plan #2: Tuesday 1:1 with private student (Mei, B1 Mandarin L1, working on tenses).**
- Re-uses the same tab. Mode → `one_to_one`. Source → Mandarin. Goal → narrative past tense. Submits. Good plan.
- He notices the `Generate worksheet for this plan` button (`lesson-plan.html:181`). Clicks. New tab, lesson-plan context preserved. Generates a worksheet that mirrors the plan. He prints two copies. **Material win** — he was going to do this in Word.

**c. Marking — placeholder for Wednesday.** He skips for now (no student work in hand yet).

**d. Rates check — sanity-check his $60/hr private rate.**
- Hits `rates.html`. Country auto-binds to US (it remembered from preview widget? — the country select uses `data-profile-country-bound` so yes if he's in his profile or via the URL country param). Picks `Spanish ↔ English`, experience "Established (3-5 years)", hours 5/week (his actual private load). Result: median is $45/hr en-es, high $120 — his $60 sits in the upper-middle. Reassuring.
- Platform comparison block shows italki (15%), Preply (33% sliding to 18%), Wyzant (25%, US-only), Cambly fixed-rate. Useful. He's currently 100% private so this is informational; doesn't act on it tonight.

**e. Tax — quick check.**
- Carlos already files a 1099 from his org (he's a contractor there) so he knows how this works. Opens `tax.html` to verify the 2026 1099-K threshold change for his side gig. Page shows `Form 1099-K thresholds dropped to $5,000 for tax year 2026. Platform earnings above that get reported to IRS automatically.` (from `data/countries/us.json:87`) — exactly what he needed. **Material win** — that's a fact he'd otherwise google for 10 minutes.
- The country caption "Showing Tax info for United States Change" — wait, actually the bug from Section F: `'Showing ' + (document.title.split('—')[0] || 'data ').trim() + ' for '` produces `"Showing Tax info — what to file, how, and when. for United States"` — broken English. Carlos pauses, re-reads, moves on. Cosmetic, but it's the kind of tiny breakage that makes a free-tool-with-no-account feel less polished.

**f. Payments — Zelle vs Venmo question.**
- His private students currently pay him in cash or Venmo. Wants to know if Zelle is better. Hits `payments.html`. US auto-bound. Sees the table: Zelle "Free, instant; bank-to-bank within US. No platform fee.", Venmo "Free for personal; 1.9%+$0.10 for goods/services tag.". The "goods/services tag" detail is **material** — his Venmo payments are tagged personal which is technically wrong since this is business income. He doesn't change anything tonight but notes it.
- The same caption bug ("Showing Payment methods table for United States") is present.

### 4. Slideshow flow
- Doesn't trigger on Sunday — he's prepping a 12-person adult ESL class, slides aren't his medium. Notes the `Generate slideshow from this plan` extension button (`lesson-plan.html:180`) for the future when he tries a vocabulary lesson.

### 5. Verdict — bookmark + return?
**Yes.** Strong fit. Bookmarks `/lesson-plan` and `/tax`. The combination of "structured plan in 30 seconds" + "1099-K threshold I needed to know anyway" + "rate sanity-check that ratifies what I'm already charging" is real value in one Sunday session.

### 6. Score: **8.5/10**

### 7. Top friction
1. **`small_group (3–6)` doesn't fit his real day-job class size of 12.** The mode picker has a hard ceiling at 6 then jumps to 25. ESL tutors at community-based orgs and adult-ed programs routinely run 8–14. Add an `intermediate_group (7-15)` option, OR change classroom to "Group of 7+" with an optional size field. `lesson-plan.html:152-156`. (~10 min HTML + 5 min prompt update.)
2. **The above-the-form chrome stack reads as 4 cards before the first input** — already in Section A, but this persona is the proof point. He lands on lesson-plan twice in one session and hits the same wall both times.

---

## Persona 18 — Sarah, 42, US homeschool parent

**Context:** Texas. Homeschools her 9-year-old daughter Lily. Spanish is one of three weekly subjects (alongside math and reading). Tech-confident — homeschool community is online-native. Tuesday morning prep: needs "Spanish numbers 1–20 with cartoon images" — half curriculum, half "keep a 9-year-old's attention for 25 minutes". **Not a paid tutor.** No income, no contract, no insurance. The toolkit's "tutor business pack" is structurally not for her.

### 1. Landing
- Hits `/` on her laptop. Hero `Tutor tools that don't waste your evening.` — she reads it twice. "Tutor tools" is *almost* her — she is teaching, after all — but the surrounding language is clearly "indie tutor as a business" (rates, tax, contract, payments, insurance, platforms). She scrolls past the live rate preview ("$50/hr" — irrelevant), past the "Setting up your tutoring business" bucket (fully irrelevant), and stops at "Lesson delivery & grading".
- Decision point: do I belong here? She's primed by the homeschool-Reddit recommendation that probably brought her, so she clicks "Lesson plan generator" anyway. **A homepage that signals "homeschool parents welcome too" — a single line in the bucket header or a fourth tile (`// homeschool`) — would close the gap with zero feature work.**

### 2. Profile decision
- She lands on lesson-plan. Sees the profile-mount strip, the privacy notice, the form. Reads the save-link: "Save your tutor info? Saved in this browser only — never to our servers."
- Decision: opt in for tutor (her — Spanish-English, 1:1) and a student profile for **Lily**. The student-editor placeholder text — "e.g., Lily, J.K., Wed-evening kid" (`profile-ui.js`, called out in Section F as "one of the best strings in the codebase") — uses the literal name "Lily". For Sarah, whose actual daughter is named Lily, this is **uncanny in a good way** — she takes it as "this product was built for me too". She fills it in.
- Audience: she picks `young_learner`. Mode 1:1. Level A1. This is the moment the toolkit feels right.

### 3. Tool walkthrough

**a. Lesson-plan: numbers 1–20 in Spanish for a 9yo.**
- Form fills out cleanly. Goal: "Practise Spanish numbers 1–20 using counting games, songs, and cartoon flash cards. Lily is a 9yo native English speaker." Source English, Target Spanish, Level A1, Mode 1:1, Audience inferred from profile = young_learner.
- Plan comes back. Structure is a real lesson — warmup, core, practice, wrap-up, exit ticket. She's pleased.
- She clicks `Generate worksheet for this plan` → printable matching exercise + fill-in-the-blanks with cartoon prompts. **Material win** — she was going to make this in Canva.

**b. Slideshow — the headline use case.**
- Clicks `Generate slideshow from this plan`. Stage shell appears. **The undefined `.btn-ghost` issue from Section A bites here:** the prev/next chevrons render as heavy ink-black `.btn` rectangles next to the orange "Download .pptx" — three high-emphasis buttons in a 3-button toolbar. To Sarah's eye, "Download .pptx" looks like the safe button and "←/→" look like dangerous form submits. She hovers, realizes they're nav, clicks `→`. Slide 2 of 8.
- Audience is inferred `young_learner` so the Twemoji slide images render — counting, numbers, cartoon-bright. She's relieved — she was worried she'd get an enterprise bullet-deck. Stage min-height 320px with 1.5rem padding plus 1fr 1fr text/media grid (`styles.css:2492-2497`) — Twemoji at max-height 220px floats in a generous void. To Sarah, this reads as "early prototype" rather than "deck preview". The slide-frame absence (Section A important #4) lands hardest here because she is the slideshow's natural buyer.
- She clicks "Download .pptx". File downloads. Opens in Keynote. The pptx itself is structurally good — title, body, image per slide — and she'll iterate on it for Tuesday morning. **Material win** despite the rough preview.
- Slideshow fallback note (Section F critical): she didn't hit the fallback path, but if the model had failed, the audience-agnostic "Look. Say the word." / "Listen. Repeat. Try." kid-deck strings would have worked for her case. (Ironically, Sarah is the *only* persona for whom the kid-deck fallback is correct.)

**c. Tools she will not use (correctly).**
- Rates: irrelevant. She doesn't open it.
- Tax: irrelevant. She doesn't open it.
- Payments: irrelevant.
- Contract: irrelevant.
- Insurance: irrelevant.
- Setup: irrelevant.

This is fine, *but* the Slatework homepage doesn't acknowledge it. There's no "Using this as a homeschool parent? Skip the business pack — go straight to lesson-plan, worksheet, slideshow." copy anywhere. A 3-line block on `index.html` between the hero and the buckets would convert Sarah from "uncertain visitor" to "confident user" in ~15 seconds.

### 4. Slideshow flow (revisited — the headline path for her)
- Trigger from lesson-plan: works.
- Preview shell: rough (Section A), but functional.
- Audience-bound images: works. Lily-appropriate Twemoji.
- Export: works. .pptx is usable in Keynote.
- Reduced-motion safe (Section C: explicit `@media (prefers-reduced-motion: reduce)` killing slide transitions, `styles.css:2550-2553`).
- One a11y note specific to her flow: she has bifocal glasses and prefers larger text. The slideshow stage text is bound to `--ink` body size (~16px). On a 13" laptop the body text is comfortable; on her external 27" monitor it reads small for someone reading-while-cooking. Not a fail, but a "Dynamic Type"-style scale-up control on the preview would be a nice-to-have for the homeschool segment specifically.

### 5. Verdict — bookmark + return?
**Maybe.** She bookmarks `/lesson-plan` and `/worksheet` but probably forgets `/slideshow` exists (since it's an extension button, not a top-level tile or homepage bucket). Returns next Tuesday for the next subject's prep, possibly. The risk of churn is high if she has *one* bad slideshow output on a topic where Twemoji doesn't have an image.

### 6. Score: **7.5/10**

### 7. Top friction
1. **Homeschool parents are an obvious secondary audience and the homepage doesn't say so.** Hero copy + buckets are 100% indie-tutor framing. A single line ("Used by independent tutors and homeschool parents") in the hero sub OR a "For homeschool parents" callout above the lesson-delivery bucket would unlock this segment with zero feature changes. Estimated impact: meaningful — Tuesday-morning homeschool-Reddit traffic is probably already arriving.
2. **Slideshow shell looks under-designed for the parent-buyer who is its natural target.** Section A important #2 and #4 — slate aesthetic missing, no slide-frame, undefined `.btn-ghost` — all manifest as "prototype-y" exactly when a homeschool parent is making the bookmark/no-bookmark call. The biggest single fix for this persona is the slideshow shell polish.

---

## Persona 19 — Tomoko, 51, Japanese tutor in London

**Context:** London-based Japanese expat. Full-time online tutor (italki + private). 25–50 yo adult students mostly UK/EU. Today's prep: weekly lesson on Japanese honorific speech (敬語) for a London-based diplomat (B2, professional context). Has been tutoring for 11 years, switched to italki + private split 4 years ago. Tech-confident.

### 1. Landing
- Hits `/`. Hero copy lands. The mono-caption "// v0.1.0 · 10 tools · 7 countries" — she does the country check: GB is one of them. Good. Live rate preview defaults to GB, en-en. She switches the pair to en-ja (Japanese), experience "Expert (5+ years)": median £48/hr (`gb.json:18`). Her actual italki rate is £38/hr after fees, private is £50/hr. The £48 figure ratifies her private rate.
- Scrolls. Bucket structure makes sense to her. She clicks "Lesson plan generator" first.

### 2. Profile decision
- Reads the save-link copy. **Opts in fully** — she has one regular long-term student (the diplomat) and 8–12 italki students cycling through. Creates a tutor profile (GB country, en-ja, expert) and a single student profile for the diplomat: name nickname "K-san", level B2, audience `adult`, mode `one_to_one`, target Japanese, source English. Takes 90 seconds.
- The audience profile section in `<details>` (Section A: clean) impresses her. She fills it in: "professional / diplomatic / Japan posting upcoming / interest in 敬語 and business kanji".
- Privacy reassurance ("This stays in your browser. Slatework's servers never see it.") — she's an italki contractor, has read three platforms' privacy policies, recognizes this language as honest. Pro user, low-friction opt-in.

### 3. Tool walkthrough

**a. Lesson-plan: 敬語 lesson for K-san.**
- Form pre-fills from her profile (target Japanese, source English, audience adult, mode 1:1, level B2). Goal textarea: she writes a detailed 250-character goal about humble vs honorific forms in business contexts, with practice scenarios for a foreign affairs setting.
- Exam field: leaves blank — there's no JLPT framing for this lesson, it's vocational.
- Submit. Plan generates with timed blocks specific to honorific speech: warmup with form recognition, core block on three keigo registers, practice with role-play scenarios, exit ticket. She's impressed — the `audience: adult` + `mode: one_to_one` + free-text goal combination produced a plan that sounds like a real keigo lesson.
- Worksheet extension → she generates a parallel worksheet with form-conjugation exercises and role-play prompts. **Material win** — she usually builds these manually in a Google Doc.

**b. Marking — pre-empts Wednesday.**
- She skips for now (K-san hasn't submitted writing yet).

**c. Rates check — italki vs private comparison.**
- `rates.html` GB en-ja expert. Median £48 private vs platform comparison: italki 15% fee, Preply 33% sliding to 15% after 400 hours, Cambly fixed rate, Verbling 15%. **The platform-fee curve in `rates.html` is precisely the data she has been informally tracking in a spreadsheet for 4 years.** Strong moment.
- Annual income block: 25 hrs/week × £48 × 48 weeks ≈ £57,600 — minus italki 15% on platform hours, minus FX on EUR clients, minus the trading-allowance-already-used because she earns more than £1k. The page does enough of the math that she screenshots it.
- Caption bug ("Showing Hourly rate calculator — work out... for United Kingdom Change") — she notices but moves on. Same as Carlos, cosmetic.

**d. Tax — UK self-employed sanity check.**
- `tax.html` GB. Trading allowance £1,000, self-assessment via SA103, deadlines, VAT threshold £90,000. She's been registered for 11 years and files annually, so the first half is ratification. The 5-year record-keeping note (`gb.json:86`) — she didn't realize the retention was past the 31 January submission deadline rather than from the tax year end. Clarifying.

**e. Payments — UK Faster Payments + Wise for international clients.**
- `payments.html` GB. Sees Faster Payments domestic, Wise international, Stripe Link international. Her actual setup is Faster Payments domestic + Wise for EU clients + PayPal as a fallback. Page confirms. Material — she had been wondering about Wise vs Revolut Business; Wise is featured, Revolut isn't (gap, but minor).

**f. Contract — for the long-term private with K-san.**
- `contract.html`. UK-bound. She's currently working from a 4-year-old Google Doc template that was given to her by another italki tutor. The Slatework contract has cancellation terms, late-payment, no-shows, and "this is not legal advice" disclaimer. Reads the contract output. Notes one thing — the contract is generated with English-only output, no bilingual option. For K-san (B2 English) this is fine; for some of her older italki students this would be a barrier. Not a fail for tonight.

### 4. Slideshow flow
- She doesn't trigger it on this lesson — keigo is a textbook + handwriting + role-play subject, not a slide-deck subject. Notes the extension button.

### 5. Verdict — bookmark + return?
**Yes, strongly.** Bookmarks `/lesson-plan`, `/worksheet`, `/rates`, `/contract`, `/payments`. She becomes a power user of this site within one session. Likely candidate for the launch playbook's word-of-mouth channel (italki tutor Slack groups, r/japaneseteachers, LinkedIn).

### 6. Score: **9.5/10**

### 7. Top friction
1. **The lesson-plan above-the-form chrome stack is also her top blocker** — but at her experience level she internalizes it as a one-time onboarding tax, not a recurring annoyance. The `// MONO //` slugs on the homepage tiles cost her ~half a second of cognitive translation; she's English-fluent so it's nothing, but a more bilingual user would pause longer.
2. **No bilingual contract output.** Her use case (UK-based Japanese tutor with EU/Japan-side students) is the canonical international-private case for Slatework, and the contract output being English-only narrows the contract tool's usefulness for her. ~2-day refactor (template translation pass + UI toggle), defer to v0.2.

---

## Persona 20 — Edge case: Dani, 23, Edinburgh new freelancer

**Context:** Just-graduated linguistics undergrad, Edinburgh. One paying student (an adult French learner, B1, £20/hr) who started 3 weeks ago. A second French student starts in two weeks. **Has never thought about VAT, contracts, registration, insurance, or any business topic.** Uses Notion and Discord daily. Tech-fluent, **business-illiterate**. Question on her mind tonight: *"Should I register as self-employed before the second student starts?"*

This is the persona Slatework's tagline is addressing. The **whole** package needs to land for her, not just one tool.

### 1. Landing
- Hits `/`. Hero `Tutor tools that don't waste your evening.` — she reads it as solidarity. The "// v0.1.0 · 10 tools · 7 countries · live now" tag signals "small project, real, current". The maker-italic block on the about page (Newsreader font, peer-tutor voice) is the kind of thing Edinburgh undergrads recognize as authentic.
- The "Setting up your tutoring business" bucket reads like it was titled for her. She clicks `// setup` first — not lesson-plan.
- This is the only persona of the four for whom the setup tile is the primary entry point. **Slatework's tile-priority order should reflect that for net-new tutors, setup → tax → contract → insurance is the journey, not lesson-plan.** Currently the homepage tile order is geographic (setup-tax-insurance, then lesson-plan-worksheet-cefr-marking, etc.) which is correct, but the live preview widget in the hero is rates-focused, which sells the wrong tool first to Dani's segment.

### 2. Profile decision
- She gets to `setup.html` first. There's no profile-mount on setup (correctly — setup is country-bound, not student-bound). She picks GB. Reads the 4-step setup flow: "register for self-assessed income tax, get a background check, decide on insurance, work out how you'll get paid." That's the answer to her question. The `tax_setup → tax.html` link routes her further.
- She returns to `/lesson-plan` later in the session and *does* opt into a tutor profile (she's going to use this every week). She also creates a student profile for her one current student. She doesn't yet think to create a profile for the second student because they haven't started.

### 3. Tool walkthrough — the intended "whole pack" journey

**a. Setup → tax → register-or-not decision.**
- `setup.html` step 1 routes to `tax.html`. UK pack: trading allowance £1,000, self-assessment by 5 October following the first tax year of trading, SA103 form. **The trading-allowance figure answers her question.** Two students at £20/hr × 1 hour/week × ~30 weeks/year = £1,200. That crosses £1,000. So yes, she has to register. The page tells her *when* (by 5 Oct following the tax year she crossed the threshold) and *how* (gov.uk/log-in-file-self-assessment-tax-return).
- This is the **single highest-value moment in Slatework for Dani's persona.** The product just answered a question that an accountant would charge £80 to answer. She bookmarks `/tax`.

**b. Rates — am I undercharging?**
- `rates.html` GB. Picks French → English, experience "New (0-1 years)", hours 1/week. Median en-fr is £35/hr (`gb.json:36`), low £20, high £65. Her £20 is at the floor of the range. This is **a small ego-bruise** but the right answer — she's new, the floor is correct for her stage, and the page gives her a glide-path: at "Established (3-5 years)" the median jumps to ~£35, at "Expert" to ~£50.
- She bookmarks `/rates`.

**c. Contract — for student #2 starting in 2 weeks.**
- `contract.html` GB. Generates a basic 1:1 tuition contract: cancellation policy, late-payment, no-shows, hourly rate, IP. She has literally no contract right now with student #1. Generates one for both students retroactively. **Material win** — this is the kind of thing she would have either skipped entirely or paid £200 to a template-vendor for.
- One small gap: the contract doesn't include a specific **DBS check status** clause that the UK pack note flags ("DBS check required for tutoring minors in some authorities", `gb.json:86`). Both her students are adults so it's a non-issue tonight, but if she takes on a teen or young learner later she'll need the DBS clause. Not flagged anywhere on the contract page itself — this is the kind of thing where Slatework's voice ("the data is information that's accurate as of the date stamped...") could insert a one-line conditional: "If you teach minors, see `/setup` for the DBS step."

**d. Insurance — should I have it?**
- `insurance.html` GB. UK pack lists professional indemnity providers, public liability typical amounts, ~£X/month range. She reads the page in full (which is rare for an Edinburgh 23-year-old reading a UK insurance page) because the voice doesn't lecture. The "What it isn't." conceit (Section F: "structural strength") on the insurance tool-explainer is the one that lands hardest for her — "*Insurance advice. We don't sell it, we tell you the typical providers and what most tutors get.*" — that's exactly the framing she trusts.
- She doesn't buy insurance tonight, but she bookmarks `/insurance` and decides she'll revisit at student #4 or #5.

**e. Payments — how should student #2 pay me?**
- `payments.html` GB. Sees Faster Payments (domestic, free, instant), Wise (international, mid-market FX), Stripe Link, GoCardless, etc. Her current student pays her in cash. She decides student #2 pays via Faster Payments. Picks up the bank-detail formatting hint and the "issue a receipt" pointer.

**f. Lesson-plan + worksheet — for tonight's actual lesson with student #1.**
- After the business-setup pass, she circles back to lesson-plan. Source English, target French, level B1, mode 1:1, audience adult. Goal: passé composé in restaurant ordering scenarios. Generates a clean plan + worksheet. **Material win.**

### 4. Slideshow flow
- She doesn't trigger it for an adult B1 French learner. Mentally files it under "for if I ever take on a young learner". This is correct.

### 5. Verdict — bookmark + return?
**Yes, the strongest of the four.** Dani is the persona Slatework was built for and she bookmarks `/setup`, `/tax`, `/rates`, `/contract`, `/insurance`, `/payments`, `/lesson-plan`, `/worksheet` — eight pages of an eleven-page site. She is a candidate for word-of-mouth distribution to the Edinburgh University tutoring society and r/languageteachers UK Discord.

### 6. Score: **9.7/10**

### 7. Top friction
1. **DBS check is mentioned in the UK pack data (`gb.json:86`) but isn't surfaced on `setup.html`'s step-by-step list as a conditional.** For a brand-new tutor who might take on a teen learner in month 3, this is a missing breadcrumb. Add a conditional bullet under setup step 2 ("If you teach minors: book a DBS check via [link]; ~£23 standard, ~£40 enhanced, 1–4 weeks turnaround.") and link from `/contract` and `/insurance`. ~30 min content + 5 min in setup HTML.
2. **The hero live-preview-widget defaults to a rate calculator, which is the wrong sell for the brand-new-freelancer segment.** For Dani (and any new freelancer), the first question isn't "what should I charge" — it's "do I need to register". Either rotate the preview widget through 2–3 modes (rates, tax-threshold, payment-methods) on a 6-second cycle, or swap to a "what's my country pack" mini-tile that surfaces threshold + form name in the hero. ~2-hour build. Worth piloting because Dani's segment is probably the biggest unconverted slice of arriving traffic.

---

## Block summary

| # | Persona | Bookmark? | Score | Top fix |
|---|---|---|---|---|
| 17 | Carlos (NYC adult ESL + private) | Yes | 8.5 | `small_group` ceiling at 6 doesn't fit adult-ed classes of 8-14; add a `7-15` mode |
| 18 | Sarah (TX homeschool parent) | Maybe | 7.5 | Homepage signals "indie tutor business" — add a homeschool-parent acknowledgment line |
| 19 | Tomoko (London JP tutor, 11yr) | Yes (strong) | 9.5 | Lesson-plan above-the-form chrome stack; bilingual contract for v0.2 |
| 20 | Dani (Edinburgh new freelancer) | Yes (strongest) | 9.7 | DBS-check conditional missing from `/setup`; hero rate-preview is wrong sell for new tutors |

**Block average: 8.55/10.**

**Cross-persona patterns:**
- The Section A "above-the-form chrome stack" issue surfaces as material friction in 3 of 4 personas (Carlos, Tomoko, and partially Sarah).
- The Section F "Showing X for [Country]" caption bug is hit by 3 of 4 personas (Carlos, Sarah skipped country pages, Tomoko, Dani). Cosmetic but visible everywhere.
- The undefined `.btn-ghost` slideshow class hits 1 of 4 (Sarah) — but she is the slideshow's natural buyer, so it's the most consequential single hit.
- The `// MONO //` mono-caption tile-slug aesthetic costs nothing for Tomoko + Dani + Carlos (all English-fluent, code-fluent), but for users with lower English fluency or non-technical backgrounds the slug-as-label idiom is friction. Not visible in this persona block; flag for a future non-English-L1 persona pass.
- **The single highest-leverage fix for the next homepage pass: a one-line acknowledgment of homeschool parents** — converts Sarah's segment from "uncertain visitor" to "confident user" with zero feature work. Higher ROI than any of the section-level "important" findings for that segment.
