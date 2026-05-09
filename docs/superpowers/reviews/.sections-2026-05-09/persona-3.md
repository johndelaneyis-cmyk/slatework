# Persona block 3 — AU/NZ tutors (2026-05-09)

Walk-through audit of 4 AU/NZ personas through Slatework. No live API calls; all friction points cited at `file:line`.

---

## Persona 9 — Aaron, 45, Sydney IELTS coach (skilled-migration stream)

**Stack:** lesson-plan (exam=IELTS speaking band 7) → marking (band-aligned) → slideshow → rates → tax (AU GST + sole trader)

### 1. Landing page
Aaron lands on `index.html` from a Reddit r/IELTS post. The mono-caption + chalk-mark headline reads as serious and editorial — refreshing after a week of "Elevate your teaching with AI" SEO pages. Country band reads `// COUNTRY-AWARE FOR US · UK · CA · AU · NZ · IE · HK` (`index.html:213-215`) — he sees AU and is reassured. Bucket: "Plan & teach" goes first, which matches his mental model (lesson prep is the wedge). Slideshow new-feature card is below the fold.

**Friction:** None. He clicks "Lesson plan generator" within ~12 seconds.

### 2. Profile decision
Aaron is the prototypical power user: 45, full-time IELTS, builds his own Notion templates. He **opts into the Tutor profile** because he sees that the Student profile is per-student and he runs ~10 active migration candidates simultaneously. He fills tutor: "Aaron / Sydney AU / English-only / IELTS specialist." He skips Student profile for now because he wants to test the tool before committing student data — and the privacy-notice (`lesson-plan.html:106`) explicitly tells him not to paste student names anyway.

**Friction:** The tutor-strip + student-strip + save-link triple-card stack noted in section-a-design.md (`lesson-plan.html:108-112` + `profile-ui.js:78-148`) reads as "three rectangles before I get to a field." For a power user this is a 1-time cost; for first-impression critique it's noise.

### 3. Tool walkthrough

**Lesson-plan (Tuesday IELTS speaking session):**
- Target = English (en), Source = English (en-en pair exists at `countries.js:36`). He picks B2 (his student is mid-B2 hunting Band 7 — IELTS doesn't map cleanly to CEFR but B2/C1 is the realistic prep range).
- Mode = 1:1.
- Goal: "Speaking Part 2 long-turn — describe a place that has affected you. 7 days from test, target Band 7. Coach toward fluency over accuracy, push for cohesive devices and lexical range."
- Exam input: `IELTS Speaking Band 7` (`lesson-plan.html:167-170` accepts free text). Audience auto-derives to `exam_prep` because `trimmedExam.length >= 2` (`profile.js:277`). **This works correctly for Aaron.**

**Marking (post-mock-Speaking, transcript paste):**
- He pastes a mock-test transcript. Marking accelerator output is "warm/direct/rubric-mapped" — rubric-mapped is what he wants because IELTS has a real band descriptor scheme. Section-c notes marking is "suggestion-quality, not authoritative" (`marking.html:63`) — Aaron is a 20-year IELTS examiner, he knows it's a draft tool, he treats it accordingly.
- **Concern:** "Rubric-mapped" output language won't be IELTS-board-accurate even with `exam=IELTS Speaking Band 7` in the input. Aaron will catch the 1-2 phrases per output that misuse band-descriptor terminology and rewrite them. Acceptable tradeoff because it's still 4× faster than from-scratch.

**Slideshow (text-heavy IELTS deck — "discourse markers and cohesive devices"):**
- He clicks "Generate slideshow from this plan" (`lesson-plan.html:180`).
- Audience derives to `exam_prep` (correct). But the slideshow's signature visual hook is **Twemoji illustrations from `assets/illustrations/young-learner/`** — for an exam_prep audience the slideshow is supposed to be text-forward (per Section E §audience). Aaron's output should be all-text; he's expecting bulleted discourse markers ("on the other hand," "in conclusion," "what's more"), not emoji.
- **Critical risk:** Section E §Critical noted `deriveAudience` mis-classifies adults at A1/A2; `exam_prep` itself is fine, but the fallback deck (`functions/api/slideshow.js:124-125` returns `"Look. Say the word."` and a single warmup keyword `'conversation'`) would be embarrassing if Aaron hits the rate limit or Anthropic 5xx. He'd see a generic warmup deck for an IELTS Band-7 prep and immediately lose trust.

**Rates:**
- Country = AU (`countries.js:27`), pair = en-en (`countries.js:36`). Median en-en in AU is A$68/hour (`au.json:78`). He charges A$110/hour for IELTS prep — well above median, defensible because of niche expertise (rates page FAQ even calls this out: "DELE preparation, IELTS band-7+, simultaneous-interpretation training" at `rates.html:79-80`). He's pleased. The platform-net comparison shows him Preply at 33% commission (`au.json:213`) takes him to ~A$73 net — useful confirmation he should stay private.

**Tax (AU GST + sole trader):**
- Tax page reads AU country pack. GST threshold $75,000 (`au.json:85`), ABN registration steps (`au.json:90-97`), self-employment form "Individual tax return + Business and Professional Items schedule" (`au.json:86`). Aaron grosses ~A$95K/year — over GST threshold. He needs the GST registration nudge.
- **Friction:** The AU note at `au.json:87` says "Tutoring services are typically GST-free if you're a recognised education provider; check the ATO ruling for your specific service before charging GST." Aaron, as a sole-trader IELTS coach without RTO accreditation, is **not** a recognised education provider in the ATO sense — so the GST-free carve-out probably doesn't apply to him. The note is technically accurate but the qualifier "if you're a recognised education provider" is exactly what the average IELTS sole-trader will misread as "I'm an education provider, I'm GST-free." Risky copy. Worth tightening: lead with the default ("Independent IELTS coaches usually charge GST above $75K threshold") and put the carve-out as a footnote.

### 4. Slideshow flow (text-heavy IELTS)
Aaron clicks slideshow. Audience=`exam_prep`. He expects:
- 8 slides with discourse markers, sample phrases, transition words, and possibly a short Part 2 cue card per slide
- No emoji illustrations — just text + clean hierarchy
- Speaker notes in PPTX with prompts for tutor

Section E §Important flagged `aria-hidden="true"` on `.slideshow-slide-media` (`slideshow-render.js:130`) — for an exam_prep deck that has zero or minimal images, this is a non-issue. PPTX export at LAYOUT_WIDE 10×5.625 with branded header is fit-for-purpose.

**Friction:** Section E §Important — `metadata.mode` echo not enforced in normalize (`functions/api/slideshow.js:336-337`). If Anthropic returns mode=`"1:1"` (with colon, with space, etc.), validator passes silently and Aaron gets a deck without the per-mode prompt scaffolding. Low-probability for his use case (exam_prep is the dominant signal) but worth fixing.

### 5. Verdict — **YES**
Aaron is the highest-probability power-user conversion in this block. He'd bookmark lesson-plan + marking + tax-page within session 1, link 3-4 students to it within a week, and probably recommend it on a IELTS-coaches Slack he's in. He won't pay for anything (the site is free; he won't sign up for the newsletter because his inbox is at war), but he'll come back daily.

### 6. Score — **9/10**
Strongest persona-tool fit in the block. Country pack has the right thresholds, en-en pair covers his case cleanly, exam_prep audience routes correctly. Half-point off for the GST guidance phrasing risk; half-point off for the slideshow Twemoji-vs-exam_prep visual mismatch concern (the deck *should* go text-only for exam_prep but the user can't be certain it will until they generate one).

### 7. Top friction points
1. **AU GST guidance reads ambiguous for sole-trader IELTS coaches** (`au.json:87`) — "if you're a recognised education provider" carve-out is the wrong default for indie tutors.
2. **No reassurance that exam_prep slideshows are text-only** — the slideshow CTA on lesson-plan (`lesson-plan.html:180`) gives no preview of what shape the deck takes for `exam_prep` audience. A 1-line caption ("Text-forward deck for exam prep — no illustrations") would close the loop.

---

## Persona 10 — Megan, 36, Brisbane primary teacher running LOTE Italian

**Stack:** lesson-plan (target=Italian, mode=classroom for school + 1:1 for adults) → worksheet → slideshow heavily for kids → contract (adults only) → rates

### 1. Landing page
Megan lands from a primary-teachers Facebook group. Her tech bandwidth is limited: department-laptop + Workspace + after-school energy levels. The homepage's editorial-list layout doesn't immediately scream "this works for primary classroom." The country band shows AU but the "for independent language tutors" framing in the footer (`lesson-plan.html:238`) makes her wonder if she's the target user. She's not full-time independent — she runs LOTE inside a school + a tiny private practice on the side.

**Friction:** First-impression copy is tilted toward freelance/independent, not classroom-teacher-with-LOTE. She'd benefit from a one-line "Also: classroom teachers running LOTE / heritage language clubs."

### 2. Profile decision
Megan **skips both profiles** initially. Reason: her department-issued laptop has localStorage policies she's vaguely uncertain about. She's also running this on a shared school iPad in some sessions. She hits Quick Lesson — most of the form is required fields she'd fill in anyway.

**Risk:** Without a saved profile, audience derivation falls back to `deriveAudience({level, mode, exam})` (`profile.js:275`). For her primary-classroom slideshow:
- `level=A1`, `mode=classroom`, `exam=''`
- Path: `lvl === 'A1' || lvl === 'A2'` → `mode === 'tutor' ? 'adult' : 'young_learner'` (`profile.js:281`).
- `mode==='classroom' !== 'tutor'`, so falls through to `'young_learner'`. **This works for the primary kids slideshow.**

For her adult Italian-heritage subjunctive lesson:
- `level=B1` (subjunctive comes in at B1), `mode=one_to_one`, `exam=''`
- Path: B1 → `'teen'` (`profile.js:283`). **BROKEN.** Megan's adult learners will get a teen-targeted slideshow with cartoon Twemoji.
- This is the same root-cause class as Section E §Critical (the `deriveAudience` mode-blindness). It's not just A1/A2 — B1 is the same bug, fired through a different branch.

### 3. Tool walkthrough

**Lesson-plan — kids' "Italian numbers 1-20":**
- Target=Italian (`countries.js:64`), Source=English. Level=A1. Mode=classroom. Goal: "Italian numbers 1-20 for Year 4 — counting games, simple chant, board work, exit ticket via mini-quiz."
- Exam=blank (no LOTE-specific exam).
- Audience derives to `young_learner` (correct).

**Slideshow (kids classroom — critical use case):**
- This is the headline use case. Megan needs a 30-min stand-up deck with numbers 1-20, big Twemoji illustrations, low-text-density slides, classroom-mode visual scaffolding.
- Mode=`classroom` triggers `slideshow--classroom` class (`slideshow-render.js:149`) — body wraps at 60% per Section E. Good.
- Twemoji illustrations from `assets/illustrations/young-learner/` should fire for `young_learner` audience.
- **Friction (Section A §Important):** The slideshow shell uses white surface + grey border + `.btn-ghost` undefined class (`slideshow-render.js:108-109`). For a primary teacher displaying this on the classroom whiteboard, the "Download .pptx" orange button visually dominates the prev/next chevrons — kids and teacher both lose the navigation affordance. Plus the stage min-height 320px with Twemoji at 220px max gives the "stranded image in a void" feel that Section A §Important called out (`styles.css:2492-2497`). Visually this is the persona where the section-a slideshow polish gaps bite hardest.
- **Friction (Section E §Critical):** Preview region not auto-focused after render. Megan generates the deck on her department laptop using a trackpad-only setup. She has to click into the slideshow before arrow-keys work — small but measurable friction in a classroom-prep context where she's already juggling 24 kids' attention.

**Worksheet — printable numbers 1-20 worksheet:**
- Topic="Numbers 1-20 in Italian — match the digit to the word, then write the word for each picture." Format=gap_fill (`worksheet.html:156-157`). Print to PDF works because worksheet has print styles. **This is the right tool for her primary-class worksheets** — no AI illustrations needed; she'll print 24 copies on the school photocopier.

**Slideshow + lesson-plan adult subjunctive — broken audience:**
- Switches form to mode=1:1, level=B1, target=Italian, goal="subjunctive mood in formal/polite contexts (vorrei che, sarebbe meglio se)."
- Generates lesson-plan. Clicks "Generate slideshow from this plan."
- Audience derives to `'teen'`. The slideshow renders with teen-bucket Twemoji illustrations (which exist as a separate manifest per Section E). Her 50-year-old Italian-heritage learner gets a deck of teen avatars.
- **This is a real bug** that lands on her hardest. She'll either (a) blame herself for "picking the wrong setting somewhere," (b) skip slideshow for adult lessons entirely, or (c) discover the Student profile and override audience. Most likely (b) — adult-slideshow becomes a feature she silently disables.

**Contract (adults only):**
- Two private adult students. Builds two A4 contracts. Country=AU. Rate=A$80/hour (above en-it median A$65 at `au.json:55`). She uses the contract for muscle memory + protection in case of late-cancel disputes. **Works as designed.**

**Rates:**
- Country=AU, pair=en-it. Median A$65 (`au.json:55`). She prices A$80 for adults — defensible. Platform-net is irrelevant to her (no platforms). She uses rates page just to confirm she's not under-charging her two adult students.

### 4. Slideshow flow (kids classroom — critical)
Megan generates the numbers 1-20 deck. The Section A §Important slideshow shell issues (white surface, undefined `.btn-ghost`, image-stranding) will be **visible on a classroom projector** — which is the worst place for them to surface. Her kids will see "Download .pptx" as a giant orange button mid-deck. She can drop into PPTX-export mode to remove the controls, but that's an extra step.

For the adult subjunctive deck — the mis-routed `'teen'` audience is the headline issue.

### 5. Verdict — **MAYBE**
Worksheet + lesson-plan are immediate wins for Megan. Slideshow has two strikes (the kids-deck visual polish gaps for projector use; the adult-deck audience mis-routing). She'd use the site weekly for worksheets and bookmark lesson-plan, but the slideshow — Slatework's headline new feature — won't become a habit for her. She'd quietly stop using it for adults after one bad deck.

### 6. Score — **7/10**
Clear "use it 2x a week" persona for worksheets + lesson-plan. The slideshow flow is what's holding her back from a clear Yes. If `deriveAudience` mode-awareness ships AND the slideshow shell gets the slate-aesthetic upgrade in section-a-design.md §Top-3, she's an 8.5.

### 7. Top friction points
1. **`deriveAudience` returns `'teen'` for B1 regardless of mode** (`profile.js:283`) — Megan's adult Italian-heritage subjunctive lesson gets a teen-cartoon deck. Same bug-class as Section E §Critical adult-A1/A2 case but fires through a different branch. Fix: branch on mode first across all CEFR levels, not just A1/A2.
2. **Slideshow shell visual polish gaps surface on classroom projector** (Section A §Important — `.btn-ghost` undefined; orange Download.pptx dominates nav; stage-min-height + Twemoji-stranded). The teacher most likely to display the deck full-screen on a projector is the persona who notices these first.

---

## Persona 11 — Kim, 29, Korean tutor in Auckland NZ (heritage teens + adult travellers)

**Stack:** lesson-plan (target=Korean, source=English) → worksheet → marking (Korean writing critique) → rates

### 1. Landing page
Kim lands from a Korean-heritage Facebook group post linking to the rates calculator. She's tech-fluent (Discord, Notion). The "// COUNTRY-AWARE" band confirms NZ is supported (`index.html:213-215`). Bucket layout is fine; the editorial framing reads as serious and not-LinkedIn — she likes it.

**Friction:** None. She clicks straight into rates because that's what she came for.

### 2. Profile decision
Kim **opts into both Tutor and a Student profile for "Soyeon" (her main heritage teen).** She's used to Notion templates so the per-student profile model is familiar. Country=NZ, target=Korean, source=English.

**Risk:** Section A §Important note about the Delete profile placement (`profile-ui.js:307-316` — leftmost destructive action with `margin-right: auto`). Kim manages 4 students. If she muscle-memories a wrong click while editing Soyeon's profile to swap to Jin's, she could delete the wrong student. Probability low, impact medium (re-typing the profile + losing prior session-count if there is one).

### 3. Tool walkthrough

**Lesson-plan — heritage teen "speech levels":**
- Target=Korean (`countries.js:70`), Source=English. Level=B1. Mode=1:1. Goal: "Korean speech levels — formal -ㅂ니다, polite -아/어요, intimate -아/어, plain. Heritage learner already uses 반말 with family but never formally; goal is making haechero/hapsyo distinctions explicit so she doesn't accidentally use 반말 with a teacher."
- Exam=blank.
- Audience derives to `'teen'` (`profile.js:283`). **This is correct for Soyeon (15).**

**Worksheet — Korean speech-level practice:**
- Target=Korean, level=B1. Topic="Convert sentences between speech levels — given a sentence in 반말, rewrite in 해요체 and 합쇼체."
- Format=short_answer (`worksheet.html:158`).
- **Concern:** The worksheet is Hangul-heavy. Print styles need to render Korean cleanly. The site loads IBM Plex Sans + Plex Mono + Newsreader (`lesson-plan.html:25`); none of these are guaranteed to have full Hangul glyph coverage. Plex Sans actually does have Korean (IBM Plex Sans KR), but the loaded URL only requests Latin variant (`/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700;800`). Browser will fall back to system Korean font — usable in Chrome/Safari but inconsistent on Windows-only browsers. **Worth verifying with a real Hangul render test.**

**Marking — Korean writing critique:**
- Kim pastes a 200-word Korean composition from Soyeon. The marking accelerator does OCR for image input but accepts text paste directly. The model is Anthropic Claude — it has full Korean support. The "warm/direct/rubric-mapped" 3-voice output should work.
- **Risk (Section C-ish):** Marking page FAQ at `marking.html:63` says "Suggestion-quality, not authoritative... It is not a moderated rubric and not exam-board accurate." Kim's heritage-teen students aren't taking a Korean exam — there's no rubric to map to. She uses the "warm" voice for Soyeon. The output will be in English (per the page's source-language assumption). Kim writes feedback in Korean to her students. **She'd want a "translate output to source-language=Korean" toggle**, or at least a clear understanding that the marking output is in English and she needs to translate it. The page doesn't currently address bidirectional or "feedback-language" choice.

**Rates:**
- Country=NZ, pair=en-ko. Median NZ$75 (`nz.json:31`). She charges NZ$60 — under-pricing slightly because she came up through Preply (`nz.json:189-216` — 33% commission for under 20 hours, drops to 25% at 50). Platform-net for italki at 15% (`nz.json:178`) shows NZ$51 net — useful side-by-side. **She bumps her private rate to NZ$70 after this.** Concrete value delivered.

### 4. Slideshow flow
Not in her primary stack. She prefers Discord screen-share + Notion docs for teen lessons. She might try slideshow once for "speech levels visual scaffolding" but the audience routing for her teen learners would derive to `'teen'` (correct), and Twemoji illustrations of speech-level register feel mismatched with the topic (it's a register/sociolinguistic concept, not vocabulary). She'd likely abandon mid-flow and go back to her own slides.

**Not a critical use case for her.**

### 5. Verdict — **YES**
Lesson-plan + worksheet + marking + rates is a solid 4-tool stack. She'd bookmark and return weekly. The Korean-font rendering question is a real concern for the worksheet print path but not a blocker for the AI-output flow.

### 6. Score — **8/10**
Strong fit. Half-point off for the Korean font fallback uncertainty in worksheets (verifiable; might be fine on macOS/Chrome which she uses, but worth a real test). Half-point off for marking-output language always being English when target is Korean — she has to translate feedback for her students.

### 7. Top friction points
1. **Marking output is in English when target language is Korean** — the page doesn't surface a "feedback in source vs target language" choice. For non-Latin-script tutors who give feedback in the target, this is a meaningful gap. (Same friction will hit Aaron less because his target/source are both English.)
2. **Korean font fallback in worksheet print path** — worksheet HTML loads only Latin Plex Sans (`lesson-plan.html:25`, mirrored on `worksheet.html`). Hangul glyphs render via system fallback. Worth a real-browser print test on Windows + macOS to confirm output quality before claiming "country-aware for AU/NZ" includes Korean print fidelity.

---

## Persona 12 — Beatriz, 39, Portuguese tutor in Brisbane AU

**Stack:** lesson-plan (target=Portuguese) → worksheet → marking → rates → payments (AU PayID, BSB) → tax → contract (long-term students)

### 1. Landing page
Beatriz comes from a Brazilian-expats-in-AU Facebook group post about indie business tools. Tech-moderate, English-confident, Portuguese-native. Homepage hierarchy reads cleanly. AU is supported.

**Friction:** None.

### 2. Profile decision
Beatriz **opts into Tutor profile + 2 Student profiles** (her two long-term students for whom she runs contracts). Country=AU. She's exactly the persona the profile feature was designed for: long-term repeat lessons, multiple students, needs continuity.

### 3. Tool walkthrough

**Lesson-plan — "professional emails in Portuguese" weekly series:**
- Target=Portuguese (`countries.js:65`), Source=English. Level=B1. Mode=1:1. Goal: "Professional emails in Portuguese for AU mining-company employee starting Brazil rotation. Week 1: opening salutations, level of formality, common closings. Build vocabulary around mining terminology gradually across the series."
- Exam=blank.
- Audience derives to `'teen'` (B1, `profile.js:283`) — **same bug as Megan's adult subjunctive case.** Her 35-year-old mining engineer gets teen-targeted scaffolding.
- This is the second time the same bug surfaces in this persona block. It's not a one-off — it's **the dominant audience-routing failure** for any adult B1 learner.

**Worksheet:**
- Topic="Professional email — opening, body, closing." Format=gap_fill or short_answer. Output in Portuguese embedded in English instructions. Plex Sans Latin handles Portuguese (with diacritics) fine. **Works.**
- **Brazilian vs European Portuguese:** Country pack `en-pt` doesn't distinguish (`au.json:58-64`). The lesson-plan/worksheet would need her to specify in the goal text "Brazilian Portuguese, formal register" — otherwise the model may default to European Portuguese conventions (você vs tu, gerund vs infinitivo, etc.). For her mining-company student going to Brazil, this distinction is critical. She'll learn to add it manually after the first incorrect output. **One-time learning cost; not blocker.**

**Marking:**
- Pastes student's draft email. Three voices output. "Direct" voice is right for an adult professional. **Works.**

**Rates:**
- Country=AU, pair=en-pt. Median A$60 (`au.json:60`). She charges A$70/hour for both regulars. Platform comparison shows italki at 15% (`au.json:178`) takes her to A$60 net. She's off-platform; this confirms her pricing.

**Payments (AU PayID, BSB):**
- Payments page reads AU country pack: PayID/Osko (free, instant — `au.json:104-109`), bank transfer BSB+account (free, 0-1 day — `au.json:110-115`), Wise, Stripe Link, PayPal, Cash. **PayID is the #1 default for indie AU contractors and the page surfaces it first.** Beatriz already uses PayID with both students; this confirms her setup. **Strong country-pack fidelity.**

**Tax:**
- AU GST threshold $75K (`au.json:85`). Beatriz grosses ~A$45K/year — well under. No GST needed. ABN registration steps (`au.json:90-97`) match her current setup. Self-employment form (`au.json:86`) is correct for sole-trader Individual return. **Works.**

**Contract (long-term students):**
- Builds two AU-jurisdiction A4 contracts for her regulars. Sets weekly cadence, A$70/hour, late-cancel policy (24h), term-break dates. Print to PDF, signs both. **This is the contract-tool's most natural use case.**

### 4. Slideshow flow
Not central to her stack. If she tries it for the "professional emails" series, audience routes to `'teen'` (the bug above). She'd see teen Twemoji illustrations on a slide titled "Saudações em e-mails profissionais." The mismatch is jarring. She'd not use slideshow again for this student.

### 5. Verdict — **YES**
Beatriz is the highest-utilisation persona in this block. Her stack uses 7 tools (lesson-plan, worksheet, marking, rates, payments, tax, contract) — only one she doesn't touch is slideshow. The country-pack-driven tools (rates, payments, tax) are excellent fit for her AU sole-trader setup. PayID surfacing is exactly right.

### 6. Score — **8.5/10**
Half-point off for the same B1-`'teen'` audience-routing bug as Megan. Half-point off for the lack of Brazilian/European Portuguese distinction in country-pack and lesson-plan — workable via goal text, but she'd benefit from an explicit dialect toggle for Portuguese (and arguably Spanish: es-ES vs es-419).

### 7. Top friction points
1. **`deriveAudience` returns `'teen'` for B1 regardless of mode** (`profile.js:283`) — same bug-class as Megan. Adult B1 professional learners get teen-targeted slideshow output. **This is now flagged twice in the AU/NZ block. Fix priority should rise.**
2. **No Brazilian vs European Portuguese distinction** — `en-pt` is single-row in country pack (`au.json:58-64`) and `target='Portuguese'` is single-option in dropdown (`countries.js:65`). Beatriz can work around it via goal text but a dialect-aware split (pt-BR / pt-PT) would meaningfully improve her output quality. Same friction would apply to Spanish-speakers tutoring Spaniards-vs-Latin-Americans.

---

## Section findings

### Block summary
| Persona | Score | Verdict | Top recurring issue |
| --- | --- | --- | --- |
| Aaron (AU IELTS) | 9 | YES | AU GST guidance phrasing risk; slideshow text-only reassurance |
| Megan (AU LOTE Italian) | 7 | MAYBE | `deriveAudience` B1 bug for adult students; slideshow shell polish on projector |
| Kim (NZ Korean) | 8 | YES | Marking output language; Korean font fallback in worksheets |
| Beatriz (AU Portuguese) | 8.5 | YES | Same B1 audience bug; pt-BR vs pt-PT not distinguished |

**Block aggregate: 8.1/10.**

### Critical
- **`deriveAudience` mode-blindness on B1 — second case of the bug-class** (`profile.js:283`). Section E §Critical already flagged this for A1/A2 adults. This block confirms the same root-cause hits B1 too: adult professional learners (B1 mining engineer; adult Italian-heritage subjunctive student) get teen-bucket Twemoji illustrations regardless of mode. Two of four AU/NZ personas (Megan, Beatriz) hit this. Fix: route on `mode` first across **all** CEFR levels, not just A1/A2. Specifically: any `mode==='one_to_one'` with adult-ish exam-context should map to `'adult'` unless explicitly overridden.

### Important
- **Slideshow shell undersold on projector use** (Section A §Important — `slideshow-render.js:108-117`, `styles.css:2462-2542`). Megan's classroom-projector use case is exactly where the white-surface + undefined `.btn-ghost` + orange-Download-button-dominance shows up worst. The Section A §Top-3 recommendation (slate-aesthetic shell + page-indicator dots + slide-frame) directly addresses this persona's failure mode.
- **AU GST guidance reads ambiguous for sole-trader IELTS coaches** (`au.json:87`) — the "if you're a recognised education provider" carve-out leads with the wrong default. Lead with the standard sole-trader case, footnote the carve-out.
- **Marking output language is fixed to source-language English when target is non-Latin-script** — Kim wants to give feedback in Korean; site silently outputs English. No toggle. For Aaron and Beatriz this doesn't bite (their student feedback can sit in English or be hand-translated easily). For Kim and any Mandarin/Japanese/Arabic tutor this is a real gap.

### Nice-to-have
- **No Brazilian vs European Portuguese distinction** (and same gap for es-ES vs es-419). Both are workable via goal text but a dialect toggle would lift output quality for a measurable user slice.
- **Korean font fallback in worksheet print** — worksheet HTML loads only Latin Plex Sans subset. Hangul renders via system fallback. Verifiable via a single browser print-preview test; not currently spec'd.
- **Profile delete-button placement** (Section A §Important duplicate) — Kim manages 4 students and is the persona most likely to mis-click. Two-step in-dialog confirmation safer than `confirm()`.
- **First-impression copy slightly tilted "independent freelancer"** — Megan's classroom-LOTE-teacher case shows the homepage doesn't quite tell her she's the target. One-line addition would close it.

### Top 2 fixes for this block (effort × impact)
1. **`deriveAudience` mode-first refactor across all CEFR levels** (`profile.js:275-286`). 1-hr fix. Eliminates the dominant audience-routing failure across A1/A2 (Section E) and B1 (this block). This is now flagged from two independent persona blocks. Highest-leverage single fix in the audit.
2. **Slideshow shell slate-aesthetic + page-indicator dots + define `.btn-ghost`** (Section A §Top-3 already calls this out). 1.5-hr CSS-only. Megan's persona shows this is most visible on classroom-projector use, which is the exact context where the headline new feature is supposed to shine.
