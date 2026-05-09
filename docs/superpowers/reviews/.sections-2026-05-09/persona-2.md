# Personas 5-8 — UK

Walk-through audit. Code-grounded, no live API calls. Claims cite `file:line`.

---

## Persona 5: David, 32 — GCSE Spanish tutor (London, MyTutor)
**Score:** 9.0/10  ·  **Returns?** Yes (probable Twinkl swap-in for plan/worksheet, keeps Twinkl for image bank)

**Landing.** `index.html:164` headline "Tutor tools that don't waste your evening" + "// v0.1.0 · 10 tools · 7 countries · live now" mono caption — David's tech-confident, this signals "indie engineer, not Twinkl-corp." He scans `tile-grid` (`index.html:235,268,307,337`) sections, sees lesson-plan + worksheet + marking + cefr clustered. Trust signal lands; no SSO/upsell wall makes him stay.

**Profile.** Opts in. He's a repeat tutor with one Year 11 student and weekly prep — saving target=Spanish, level=B1, exam=GCSE Foundation pays back by lesson 2. `profile-tutor-strip` + `profile-student-strip` (`lesson-plan.html:109` and below) sit above the form. Only friction: the three empty mount divs cost ~150 px above-fold (Critical #7 in the 05-09 audit). David doesn't bounce — he just scrolls.

**Tool walkthrough.**
1. **lesson-plan** — sets target=Spanish, level=B1, mode=`one_to_one` (`lesson-plan.html:153`), exam="GCSE Spanish Foundation Paper 3 writing", goal="past-tense weekend recount, build to irregular preterites." `deriveAudience` (`profile.js:275`) → exam string ≥2 chars → `exam_prep`. Plan returns timed blocks, target language, exit ticket — exactly what FAQ#1 (`lesson-plan.html:88-92`) promised. He reads it, fixes the joke that lands in his student's L1, done. Beats Twinkl's static GCSE pack because this one is shaped to *his* student's sentence pattern.
2. **worksheet** — same target/level, format=gap-fill or short-answer (`worksheet.html:155`), count=8, topic="Past tense — irregular preterites: ir/ser, hacer, tener, decir." Two pages, key separated. The `exam` field accepts "GCSE Spanish Foundation Paper 3" verbatim and shapes output; FAQ#76-79 confirms this is intended.
3. **marking** — pastes a 90-word essay, sets rubric tag="GCSE Spanish writing 90-word essay" (placeholder text matches exactly: `marking.html:145`). Gets categorised errors + warm/direct/rubric-mapped variants. Picks rubric-mapped, edits one sentence, sends.

**Slideshow.** Probably not. 1:1 GCSE prep is conversational; he doesn't run slides. If he did — exam_prep deck style means `image_keywords` empty for all slides except warmup (`slideshow.js:56`), so it'd be a clean prompt-cards deck, not a Twemoji cartoon. That's correct. He'd skip it anyway because at 1:1 he's already screen-sharing the document in MyTutor.

**Twinkl substitution test.** Slatework replaces ~70% of Twinkl's *generation* role for this student (lesson plans + worksheets) but does NOT replace Twinkl's image bank, audio files, or pre-made cultural packs. David keeps Twinkl at £6/mo and uses Slatework for the "shape this for *Mateo* this week" work that Twinkl can't do. Net: complementary, not displacing. Slatework wins ~£0 from him directly but earns the Reddit post.

**Friction:**
1. The three empty profile mount divs above the form (`lesson-plan.html:109` plus two siblings — Critical #7). David scrolls past, doesn't bounce, but it does waste his first-impression real estate.
2. No "save this lesson plan to a student" — every prep cycle for the same student starts from the same form. Profile saves student name+level but not lesson history. Twinkl has plan-folders. (Out of scope for v0.1.0; flag for v0.2.)

**Delights:** rubric tag placeholder text is *literally* "GCSE Spanish writing 90-word essay" (`marking.html:145`) — the kind of detail that makes a UK GCSE tutor go "they actually thought about me."

---

## Persona 6: Sophie, 38 — A-level French + adult conversation (Bristol)
**Score:** 8.4/10  ·  **Returns?** Maybe-leaning-yes, but two friction points hurt

**Landing.** Same hero. State-school referrals + private adults — confident enough to skim FAQ. The "Why use this instead of ChatGPT?" answer (`index.html:91`) is the trust unlock for her: she already pays for ChatGPT and has been hand-prompting it. Pre-contextualization argument lands.

**Profile.** Opts in for the A-level student (target=French, level=B2, exam="A-level French Paper 2 translation"). For her two adult conversation learners — *here she hits the bug*. Adult conversation, level=B1 or A2, no exam. She'd add them as separate students. The audience derivation (`profile.js:275-286`) for A2 with mode=`one_to_one` → `young_learner`. **Wait**: the rule reads `mode === 'tutor' ? 'adult' : 'young_learner'`. There is no `tutor` mode in the lesson-plan form (`lesson-plan.html:153-156` defines `one_to_one`, `small_group`, `classroom`). So **every A1/A2 1:1 adult learner gets `young_learner` deck style** (Twemoji-heavy, A1 wordlist). This is exactly the audit's Critical #2, but the proposed fix ("when mode is `one_to_one` AND no exam, leave audience as `adult`") is what saves her. Until that ships she gets a primary-school deck for her 35-year-old conversation client.

**Tool walkthrough.**
1. **rates** — sanity-checks Bristol A-level pricing (£35-45/hr typical). UK is in the 7-country list; landing on `rates.html` and seeing "Showing Hourly rate calculator for United Kingdom Change" reads as broken English (Critical #5). She reads past it; doesn't lose trust but it's the first cosmetic crack.
2. **contract** — for the under-18 A-level student. `contract.html:133` has subject/language field, `:127-130` four welcome-paragraph tones. The current contract is parent-tone-aware via the welcome paragraph but has **no explicit "this is for a minor — parent signs" toggle**. Sophie has to write her own clause about parent vs. student signature. The "warm" tone helps but the form doesn't prompt for parent name as separate from student name. UK-specific gap: GDPR consent for under-18 data isn't called out. She types the parent name into the "your client" field and adds her own line in the welcome paragraph. Works, but she's improvising.
3. **lesson-plan** — Friday prep for "literary translation" task: target=French, level=B2, mode=`one_to_one`, exam="A-level French Paper 2 literary translation", goal="extract from Camus, register and idiom." `deriveAudience` → `exam_prep` (exam string trips the threshold at `profile.js:277`). Good output — exam_prep deck strips images, leans on prompt cards. This is the persona-tool fit highlight.
4. **worksheet** — translation extracts as gap-fill or short-answer. Format dropdown (`worksheet.html:155`) doesn't have "translation" as an explicit option, so she picks short-answer and types "translate from English to French" in topic. Works but indirect.
5. **marking** — pastes a translation attempt with rubric tag "A-level French Paper 2 literary translation 60-word." Gets variants. Picks "direct" for the adult-paying-for-honesty student.

**Slideshow.** A-level 1:1 — no. Adult conversation — no. She skips. If she ran the deck for the literary-translation lesson, exam_prep style would be appropriate.

**Friction:**
1. **A2/A1 adult-conversation client → young_learner deck** (Critical #2 in 05-09 audit; `profile.js:281`). The audit fix lands. Until then, broken for ~half her adult roster.
2. **Contract has no explicit minor/parent toggle.** UK A-level tutors have a dual-payer relationship (parent pays, student receives); the welcome-paragraph tones help but don't structurally support "parent signs, student is the recipient." She'll improvise. Lower-priority than #1 but hits the only field where Slatework competes head-on with platforms (MyTutor handles this implicitly because MyTutor is the contract).

**Delights:** A-level + literary translation is exactly the niche where exam_prep deck style + rubric-mapped marking variants shine. Worksheet's optional `exam` field accepting verbatim exam-name text (`worksheet.html:148-150`) is the kind of flexibility a private tutor with weird requests needs.

---

## Persona 7: Hassan, 44 — Saturday Arabic community school + private adults (East London)
**Score:** 7.8/10  ·  **Returns?** Maybe — depends on whether classroom mode delivers

**Landing.** Hero copy is generic-tutor; community school teacher needs to scroll to FAQ before the value lands. The "10 tools, 7 countries" caption doesn't mention classroom mode explicitly, and his use case (8 kids, 7-11, Arabic) is the niche-iest of all four UK personas. He gives it 30 seconds. The "for language tutors" framing on every tool page leans 1:1 indie-tutor; community-classroom teacher isn't the modelled user but the tooling does support him — he just has to read past the framing.

**Profile.** Opts in for *himself* (tutor profile). For students — community school of 8 kids doesn't map cleanly to Slatework's per-student profile model (`profile.js:240-243` checks `state.tutor || state.students.length > 0`). He'd save one tutor profile + maybe one "Saturday class" pseudo-student with level=A1, mode=classroom. For private adults, separate students. Profile model is built for indie 1:1 — community-classroom is a square peg. He works around it.

**Tool walkthrough.**
1. **lesson-plan** (Saturday class) — target=Arabic, source=English, level=A1, mode=`classroom` (`lesson-plan.html:155`), exam="" empty, goal="Introducing yourself: ana, ismi, min." `deriveAudience` → A1 + classroom (no `tutor` literal) → `young_learner`. **Correct for his case** — 7-11 year olds at A1, primary classroom is exactly the deck style he needs. The audit's Critical #2 fix ("only flip to young_learner when mode is small_group or classroom") *preserves* his correct behaviour. Plan returns timed blocks suited to a classroom of 8.
2. **slideshow** (this is his big test) — A1 + classroom + young_learner audience → `deck_style: "primary"` (`slideshow.js:143`), `image_density: high`, image_keywords are concrete nouns (`slideshow.js:53`). For Arabic A1 introducing-yourself: warmup keyword "hello/wave," core nouns "name/I-am," practice "teacher/student." This is the bullseye persona for the slideshow feature. **However:** image search via Pexels — and Arabic-language image search isn't a Pexels strength. The slides will use the English keyword to fetch the photo (he writes Arabic on the slide, photo is universal — fine). If `connect-src` Pexels gap (Critical #1) hasn't shipped, photos silently drop and he gets text-only slides. Critical for his use case.
3. **worksheet** — printable for homework. A1, gap-fill, count=8, topic="self-introduction phrases." Outputs two pages. Hassan prints and hands out — printable flow works (`worksheet.html:105` lead copy explicitly says "Use the browser's print dialog to save as PDF"). UK-specific delight.
4. **marking** — limited utility. Saturday classroom doesn't have time for individual marking on 8 kids; he'd use it for the private adult students. Target=Arabic on the dropdown — Modern Standard Arabic should be in `targetLanguageList()` (need to verify but `cefr-rules.js` exists and `target_other` is a fallback at `worksheet.html:127`).
5. **contract** — for the private adults only. Standard adult-to-adult agreement, picks "formal" or "warm" tone. Works.

**Slideshow flow detail.** This is the persona where slideshow is most valuable. If the 7 Critical items (especially #1 Pexels CSP and #4 audience-aware fallback) ship, his Saturday class deck is excellent. If they don't, fallback fires → "Look. Say the word." (`slideshow.js:124-132` audit ref) → for 7-11 kids at A1 it's actually *appropriate* (this is the one persona for whom the fallback copy is *right*) but the missing photos hurt.

**Friction:**
1. **Profile model assumes 1:1 indie-tutor.** Hassan's "8 kids in a Saturday class" isn't a student record — he creates one pseudo-student or none. No classroom-roster concept. He works around it but the friction is constant.
2. **Pexels CSP Critical #1 + slideshow fallback Critical #4 both hit him directly.** If they ship before launch, his deck is great; if they don't, his Saturday-morning prep produces a text-only deck and he's not coming back next week.

**Delights:** classroom mode existing at all (`lesson-plan.html:155`) is more than most ESL tools offer indie/community teachers. The audience derivation rule, when fixed, correctly routes A1+classroom → young_learner deck — primary-school visual density without him having to specify it.

---

## Persona 8: James, 51 — Manchester community college ESL coordinator + Saturday IELTS group
**Score:** 7.4/10  ·  **Returns?** Maybe — printable worksheet is the hook; rest is half-fit

**Landing.** Hero copy "Tutor tools that don't waste your evening" — James is full-time salaried, evenings are *his* time, this works. Decade-plus IT-fatigued state-college teacher who's tried every ESL platform and been disappointed; the "no signup, no quota" caption (`index.html:170`) is the trust unlock. He reads about 60 seconds of FAQ, decides to try one tool.

**Profile.** **Skips.** IT-fatigue + "another save-my-stuff feature" instinct = he doesn't opt in. Profile.js architecture (`profile.js:240-243`) makes opt-in genuinely optional (no nag-walls). James uses every tool stateless. The site honours that. This is a Slatework strength for him.

**Tool walkthrough.**
1. **lesson-plan** (Tuesday morning past-simple irregular verbs) — target=English, source="" or English, level=B1 (mid-class average), mode=`classroom` (`lesson-plan.html:155`), exam="ESOL Entry 3" or "" empty, goal="past simple irregular verbs — went/saw/had/got/took, mixed-L1 classroom of 12-15." `deriveAudience` → B1 + classroom → **`teen`** (`profile.js:283`). **This is wrong for his class** — adult immigrant ESOL Entry 3 students are not teens. The audit's Critical #2 fix doesn't address this (it only changes A1/A2 routing). James gets a teen deck style: image_density medium, photo subjects "school, friends, sports" (`slideshow.js:54`) — wrong for a classroom of mid-30s adults from Pakistan, Iran, Brazil, Romania. He doesn't see this until he tries the slideshow; the lesson-plan output itself reads OK because it's text.
2. **worksheet** — the killer tool for him. Past-simple irregular verbs, gap-fill, count=12-15, target=English, level=B1, exam="ESOL Entry 3" verbatim. Two printable pages, key separated. **This is the only tool where James is the modelled user** — printable worksheet flow is exactly his Tuesday-morning need (`worksheet.html:105` lead). He prints 15 copies, walks into class.
3. **marking** — he's right that this tool isn't for him. Classroom of 15 ≠ individual feedback time. He skips.
4. **rates** — n/a (salaried). Skips.
5. **contract** — n/a. Skips.

**Slideshow flow.** If he tries it for the past-simple lesson, the teen deck style with school/friends/sports keywords (`slideshow.js:54`) lands wrong for adult immigrants. He'd need an adult-classroom audience that doesn't currently exist — the four-bucket taxonomy (`slideshow.js:11`) doesn't have "adult_classroom" or "adult_mixed_L1." This is a structural gap, not a bug. He'd skip the slideshow after one try.

**Friction:**
1. **No "adult classroom" audience profile.** Teen deck for B1 + classroom is wrong for adult ESL. The four buckets {young_learner, teen, adult, exam_prep} don't have an adult-classroom mode. Either the audience derivation needs `(level=B1, mode=classroom) → adult` (override the teen default for non-1:1) or the bucket list needs a fifth audience. The existing `tone_overrides` per-slide system (`slideshow.js:24-27`) could absorb this without a new bucket if the rule changes.
2. **Marking doesn't fit his workflow** — the page voice ("five essays before tomorrow morning," `marking.html:181`) presumes 1:1/small-group time horizons. James won't use it; he won't bookmark it. Lost surface area for him.

**Delights:** worksheet's printable flow with separated answer key (`worksheet.html:105` lead) is exactly the artifact he prints Tuesday morning. The "no signup, no quota panic" framing (FAQ `index.html:91`) is the single most-aligned message for a full-time IT-fatigued salaried teacher trying-something-new on a Monday evening.

---

## Section findings

**Cross-persona patterns.**
- All four UK personas pass the trust threshold on the homepage (no SSO wall, "10 tools, 7 countries," strict CSP / no tracking). Trust is not the bottleneck.
- The **audience derivation rule (`profile.js:275-286`) has two holes**, both already partly known:
  - **Hole 1 (Critical #2 in 05-09 audit, Sophie):** A1/A2 + 1:1 + no exam → wrongly young_learner. The audit's proposed fix lands.
  - **Hole 2 (newly surfaced, James):** B1 + classroom → teen, but adult ESL classroom is the dominant UK community-college reality. Not addressed by Critical #2's proposed fix.
- **The four-bucket audience taxonomy {young_learner, teen, adult, exam_prep} is the load-bearing constraint.** It maps cleanly to David (exam_prep), Sophie's A-level (exam_prep), and Hassan's Saturday class (young_learner) but breaks for Sophie's adult conversation client (A2 1:1) and James's adult ESL classroom (B1 classroom). Two of four UK personas have at least one student that doesn't fit cleanly.
- **Profile model is built for 1:1 indie tutoring.** Hassan's 8-kid class doesn't fit the per-student record cleanly. James opts out entirely. Profile is opt-in (good) but doesn't support "group as student."
- **The printable worksheet is the universally-praised tool.** All four UK personas use it and all four praise it. It's also the single tool where the modelled user *is* a UK community/state-school teacher (James).

**Most damaging finding for UK segment.**
**The audience derivation rule fails for adult ESL classrooms** (James) and adult 1:1 conversation clients at A2 (Sophie's adult learners). Together that's 2 of 4 UK personas with at least one mis-routed student — and the UK adult ESL market (community colleges, private 1:1 conversation tutors) is structurally larger than the 1:1 indie-tutor segment that Slatework's voice models. The Critical #2 fix from the 05-09 audit closes Sophie's hole but **doesn't close James's**. James needs `(mode=classroom AND level≥B1) → adult` regardless of B1's normal teen default — i.e., classroom mode should override the teen default at B1. One additional line in `deriveAudience`.

**Cheapest single fix that helps multiple UK personas.**
Extend Critical #2's fix to handle Hole 2 in the same patch. Concretely, change the rule (`profile.js:275-286`) to:

```
if (mode === 'classroom' || mode === 'small_group') {
  if (lvl === 'A1' || lvl === 'A2') return 'young_learner'; // young classroom (Hassan: correct)
  return 'adult'; // B1+ classroom is adults (James: fix)
}
// 1:1 / one_to_one path
if (lvl === 'A1' || lvl === 'A2') return 'adult';   // 1:1 conversation (Sophie's adults: fix)
if (lvl === 'B1') return 'teen';
return 'adult';
```

That's 6 lines and ~10 minutes — closes both Hole 1 (Sophie) and Hole 2 (James). Combined with Critical #1 (Pexels CSP) it makes the slideshow correct for all four UK personas. Pairs with the existing Critical #2 effort at zero additional cost.
