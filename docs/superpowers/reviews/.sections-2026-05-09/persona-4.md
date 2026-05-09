# Persona Block 4 — Canada / Ireland (2026-05-09)

Walk-through audit of 4 CA/IE tutor personas through Slatework. No live API calls — all friction inferred from source. Cross-references `.sections-2026-05-09/section-{a,b,c,d,e,f}.md` where relevant.

**Block summary:** CA/IE coverage is genuinely good for the high-volume cases (Liam, Joel) but reveals two structural gaps neither US/UK/AU block surfaced — Quebec-specific tax data hides inside a one-line note in `data/countries/ca.json:87,96`, and the young-learner illustration manifest (`assets/illustrations/young-learner/manifest.json`) is missing the household-items category Niamh's lesson literally requires. Marie-Claire (federal-language test prep) is the persona Slatework is least sized for, and her experience exposes the limits of generic level-bands when the user is targeting a named, scored, pass/fail exam (PSC oral interaction B/C).

| Persona | Verdict | Score | Top friction |
|---|---|---|---|
| Marie-Claire (QC federal FR) | Maybe | 6.5/10 | No PSC oral exam scaffolding; Quebec QPP/QPIP buried in a note |
| Niamh (Dublin Gaeilge primary) | Maybe | 7.0/10 | "Household items" → no manifest matches, slides ship blank-media |
| Liam (Cork LC HL FR) | Yes | 8.5/10 | LC HL marking rubric isn't surfaced; €40 below "high €65" reads off |
| Joel (Toronto FR-immersion small group) | Yes | 8.0/10 | Y6 B1-productive group gets `teen` audience (text-leaning), not visuals he expects |

**Block average: 7.5/10.** Lower than the typical NA/UK block by ~0.5 because two of these four personas have edge-case needs Slatework's content layer doesn't quite reach yet.

---

## Persona 13 — Marie-Claire, 41, Quebec federal-language-test tutor

**Snapshot:** Bilingual Montrealer teaching B/C-oral French to anglophone civil servants in Ottawa via Zoom. High tech proficiency, no patience for marketing fluff. Tuesday evening session: subjunctive in formal contexts for a DOJ analyst going for promotion. Her benchmark is the Public Service Commission's Second Language Evaluation (SLE) oral interaction test.

### 1. Landing page

Hits `/` (Home). Mono-caption opener (`// FREE · NO ACCOUNT · NO PLATFORM FEE`) + `Tutor tools that don't waste your evening.` reads sharp and not-AI-app to her. The hero live-preview widget (`index.html:178-207`) auto-defaults to US + en-es; she switches Country → Canada and language pair → French → English (`fr-en`). Median rate flips to CA$48 for early-career — she's mid (1-3yr+ federal contract experience), and the Experience selector lifts to mid (×1.2) → ~CA$58. She finds that under-priced for federal-civil-servant tutoring at her level (real-world rate is closer to CA$80-110) but acknowledges the tool is calibrated to "private tutoring," not specialised B2B. Mild credibility hit but not a blocker.

The country band (`index.html:212-216`) shows `// COUNTRY-AWARE FOR US · UK · CA · AU · NZ · IE · HK` — sees CA, comfortable. Scrolls to bucket 02 (lesson delivery & grading). Doesn't read the FAQ, immediately clicks `// lesson-plan`.

**Landing assessment:** Aesthetic lands as "this person actually tutors, not a SaaS founder." 8.5/10 from her.

### 2. Profile decision

She lands on lesson-plan and sees three above-form chrome rows (per Section A finding — `lesson-plan.html:108-112` + `profile-ui.js:78-148`): tutor-strip, student-strip, save-link. Marie-Claire prefers stateless tools — she runs different students back-to-back and doesn't want a profile that pre-fills the wrong one. **She skips the profile entirely.** She'll re-key the form for each session. The "+ Save my setup" link reads as opt-in friction, not value.

This is the right call for her workflow but means she misses the rates-page country binding, the audience auto-derive on slideshow, and the worksheet pre-fill. She'd benefit from a *session-only* "use these settings for the next 3 tabs" rather than a saved profile. Out of scope to fix; flag for v0.2.

### 3. Tool walkthrough

**`lesson-plan.html`** (her primary)

- Target language: French. Source: English. Both on the dropdowns at `page-lesson-plan.js:13-22, 29-32` — no friction.
- Level: B1 selected by default — she changes to **B2** for her DOJ analyst (federal B-level oral test maps loosely to B2/C1 depending on department). Level dropdown gloss `B2 — Confident at work / study, idioms still hard` (`lesson-plan.html:144`) reads OK but doesn't acknowledge the federal-test reality where B-oral is *specifically* about formal register and unprepared interaction.
- Mode: 1:1 — selected.
- **Goal field (`lesson-plan.html:161-163`):** she types "Practise the subjunctive in formal contexts (subordonnées de but, doute, opinion) for a federal civil servant prepping the PSC SLE oral B-level test, focusing on unprepared formal-register Q&A." Within the 600-char limit.
- **Exam field (`lesson-plan.html:167-169`):** she types "PSC SLE oral interaction (Government of Canada Public Service Commission)." Placeholder lists `GCSE / HKDSE / SAT / IELTS` — no Canadian federal test. Mild "is this going to land?" anxiety. The model receives the string and the system prompt does say (per Section E) the goal narrows the deck — but Slatework has no PSC-specific scaffolding (no `data/exams/psc-sle.json`, no rubric file). She's relying entirely on Anthropic's model knowledge of the PSC SLE.
- Submit. Slate-loading state ("Don't refresh. 10-30 seconds.") — she likes that copy. Plan returns. Quality (inferred from prompt design): probably solid on subjunctive structure, generic on PSC scoring conventions (B level: vocab range, accuracy, fluency, interaction). She'd need to add the rubric layer manually.

**Friction:** No exam-rubric awareness for PSC. Not a defect of Slatework — it's a coverage gap. Same gap applies to Cambridge YLE, OPI, NCLB, etc. v0.3 territory (per-exam JSON pack).

**`worksheet.html`** (secondary, same evening)

- She wants a 10-question subjunctive-in-context drill for the analyst's homework. Same target/level. Topic: "Formal-register subjunctive: doubt, opinion, purpose." Format: gap-fill + short-answer. Count: 10. Submits.
- Worksheet generator (`page-worksheet.js`) is profile-blind for her since she skipped — fine. URL params + form values flow direct.

**`marking.html`** (Tuesday next-week, after analyst submits the worksheet)

- She'll use marking on his returned writing. Target: French, level: B2. Pastes his 200-word response. Marking returns rubric-style feedback. Would be more useful if she could pin "PSC SLE B-oral rubric" but again — no specific rubric scaffolding. She'll accept generic CEFR feedback and translate manually to PSC scoring categories.

**`rates.html`**

- Country: Canada. Pair: fr-en (`data/countries/ca.json:46-50` median CA$48/hr). She enters mid + 5 yrs + federal-spec context — the page doesn't have a "specialised B2B" multiplier. Her real billing is ~CA$95-110/hr. Mild calibration miss; she scrolls past.

**`tax.html`** — **biggest CA/IE-specific friction**

- Country: Canada. Page renders `T2125 (Statement of Business or Professional Activities)` from `ca.json:86`. Threshold callout: GST/HST registration at CA$30,000.
- She is **Quebec-resident** so she also needs:
  - Revenu Québec separate registration (not just CRA)
  - QPP (Quebec Pension Plan) instead of CPP — different rates, different remittance
  - QPIP (Quebec Parental Insurance Plan) — applies to self-employed
  - QST (Quebec Sales Tax) — 9.975%, threshold also CA$30k but separate filing
- The current `ca.json:96` has *one line*: `"Province-level: Quebec runs its own tax system (Revenu Québec); register separately if QC-resident."` That's the entire QC scaffolding.
- She closes the tab knowing she'll Google QPP self-employed contribution rate herself. Slatework didn't help on the QC-specific path but didn't *mislead* her either — the one-line note is honest about the gap.

**`contract.html`**

- Quick render. Country: Canada. Doesn't use Quebec-civil-law specific clauses (Civil Code of Québec vs common-law provinces). She'll use it as a starter and have her own template anyway.

### 4. Slideshow flow

She clicks **"Generate slideshow from this plan"** (`lesson-plan.html:180`). Hits `/api/slideshow` with audience auto-derived: B2 → `adult` (per `profile.js:284`). Subjunctive lesson + adult deck = mostly text slides, Pexels photo lookups for keywords like "office," "meeting," "presentation." Per Section E §important #2, fallback warmup body *for adult* is `"Look. Say the word."` — that's a Section E known issue and would land badly here. Actual happy-path output: should be fine, photo of an office/meeting. Acceptable for her.

Per Section E §critical #2, the slideshow region doesn't auto-focus after render — she has to tab in to use keyboard nav. Mild but real.

**She probably exports to .pptx** to share with the analyst as pre-class prep. PPTX path works (a92dc38, per Section E). Twemoji not relevant here (adult deck → Pexels).

### 5. Verdict

**Maybe.** Slatework gives her ~70% of what she needs. The lesson-plan output is structurally sound; tax doesn't go deep enough on QC; rates underprice her market. She'd come back for the lesson-plan + worksheet weekly but wouldn't recommend it as a *complete* toolkit to a colleague specialising in federal-language tests. **6.5/10.**

### Top friction

1. **No PSC SLE / federal-language exam scaffolding** — Slatework has CEFR but not the Canadian federal "A/B/C oral level + reading + writing." A `data/exams/psc-sle.json` with the rubric, banned topics, and scored dimensions would unlock the federal-tutor segment (real TAM in Ottawa-Gatineau-Montreal). v0.3.
2. **Quebec tax separation lives in one note line** (`data/countries/ca.json:87,96`). Suggested fix: add a `province_overrides: { QC: { ... } }` field to ca.json with QPP/QPIP/QST forms, thresholds, and Revenu Québec URL, and a one-paragraph callout in `tax.html` when the user's profile (or country select) explicitly indicates Quebec. ~2 hr data + 1 hr UI.

---

## Persona 14 — Niamh, 38, Dublin primary Irish (Gaeilge) tutor

**Snapshot:** After-school grinds for Year 4-6 (8-12yo) prepping for Sciath na Scol (primary-school Irish quiz competition). Moderate tech — uses Padlet + WhatsApp daily; comfortable opening tabs but doesn't want a 12-step setup. Wednesday afternoon: vocabulary lesson on "household items in Irish" for a 9-year-old, image-heavy because the kid won't sit through text.

### 1. Landing page

Hits `/`. The mono-caption + chalk-mark headline reads professional but not stuffy. She likes that the country band lists IE explicitly. Scrolls past the hero (no live preview interest — she doesn't price-shop). Lands on bucket 02 lesson delivery & grading. Sees lesson-plan + cefr + worksheet + slideshow tiles.

She *also* sees the slideshow tile — and the description "from a saved lesson plan, the slideshow is image-heavy and audience-aware" is exactly what she needs for a 9-year-old. **She actually clicks lesson-plan first** because slideshow needs a plan first.

**Landing assessment:** 9/10 for her. The "ten free tools" + visual rhythm convinces her in <10 seconds.

### 2. Profile decision

She has **regular students** (3-4 kids weekly), so a profile *would* save her time. She clicks "+ Save my setup," opens the editor (`profile-ui.js:307-316`). Sets:
- Tutor: name "Niamh", country "Ireland"
- Student 1: "Aisling, age 9, Year 4, target Irish (Gaeilge), source English, level A1, mode 1:1, audience young_learner"

This works. She also notices the audience profile picker has `young_learner (image-heavy, big fonts)` — perfect, she manually pins it (not auto). The dialog is clean (per Section A line 16 — solid editor polish 8.5/10). She does flinch at the Delete-profile-leftmost placement (Section A important finding) but no near-miss.

She hits Save. The student-strip below the form now shows "Aisling · A1 · Irish/Eng · 1:1." She'll come back to this profile every Wednesday.

### 3. Tool walkthrough

**`lesson-plan.html`** (the moment of truth)

- Target language dropdown shows `Irish (Gaeilge)` (`countries.js:72`, `page-lesson-plan.js:22` — both list "Irish") — **she's relieved**. She had been on toolkits where Irish wasn't even a target option.
- Source: English. Pre-filled from profile.
- Level: A1 (pre-filled). Mode: 1:1 (pre-filled).
- Goal: "Vocabulary on household items (table, chair, bed, lamp, sofa, fridge, kitchen). Image-heavy presentation, then a matching activity. Aiming for 8 new words at the end of the lesson."
- Exam: she leaves it blank — Sciath na Scol isn't really an exam, it's a quiz competition. She doesn't try to enter it. Audience profile in her saved student is `young_learner` (manual override). 
- Submit. Slate-loading. Plan returns. Likely: warmup with greeting, drill section with the household-items vocabulary, matching activity, exit ticket. Quality should be solid — the model handles A1 vocab decks well. She's happy.

**Then the slideshow.** This is where the audit gets sharp.

### 4. Slideshow flow — the headline finding

She clicks "Generate slideshow from this plan." Audience auto-derives to `young_learner` (level A1 + no exam, per `profile.js:280-281`, since `mode === 'one_to_one'` not `'tutor'`). Manual override from her saved profile is also `young_learner`. Per Section E §critical #1, the auto-derive bug doesn't bite her because she pinned it manually.

The slideshow tries to resolve image keywords for each slide via `slideshow-images.js:70-87`. For `young_learner`, it loads `/assets/illustrations/young-learner/manifest.json` and matches keywords against entries.

**Critical finding:** the manifest covers `farm-*, wild-*, food-*, family-*, body-*, school-*, weather-*, numbers, colors, verb-*, greet-*` — confirmed via directory listing of `assets/illustrations/young-learner/`. There is **no household-items category**. No `lamp.svg`, `bed.svg`, `sofa.svg`, `fridge.svg`, `table.svg` (the closest match is `school/desk.svg` which won't substring-match "table"), `chair.svg` (school/chair.svg exists but is captioned for classroom not home), `kitchen.svg`, `bathroom.svg`.

The model's slide payload comes back with `image_keywords: ["table", "chair", "bed", "lamp", "kitchen"]` for each vocab slide. `slideshow-images.js:58-67` does exact-then-substring matching:
- `table` → no manifest hit (school/desk.svg has keywords `["desk", "table-desk"]`? — depends on actual entries; from manifest sample only `desk` is listed)
- `chair` → school/chair.svg has keyword `chair` (probably matches as classroom chair, visually wrong but at least loads)
- `bed` → no match
- `lamp` → no match
- `kitchen` → no match

Result: **most slides ship with empty `.slideshow-slide-media`** (`slideshow-render.js:86-88` swallows misses silently — by design, "a missing image must never break the deck"). Niamh sees a slideshow that's *supposed to be image-heavy for a 9-year-old* but is mostly text on the right side of the 1fr 1fr grid (per Section A line 15 — stage min-height 320px with stranded text). 

The visual signal she relies on for kid attention is missing exactly when she needs it most. She'll notice immediately. The deck is still teachable, but it's the failure mode the slideshow feature was *built to prevent*.

She'll either:
- Tutor swap-out: use the per-slide swap drop (`slideshow-images.js:92-111`) to manually drag in 8 PNGs from a Google search. Fine but tedious — defeats the point.
- Or fall back to her own Padlet board.

**This is the headline persona-block finding.** The young-learner manifest is missing the most-taught primary-school vocab category outside the existing food/animals/family axis: **household / rooms / furniture**. Sciath na Scol vocabulary banks heavily on this category (typical lists: `teach`, `seomra leapa`, `cathaoir`, `bord`, `leaba`, `cuisneoir`, `cistin` — household is ~20% of Year 4-6 Irish vocabulary).

**Per-tool note:** Twemoji *does* cover all of these (🛏️ bed, 🪑 chair, 🛋️ couch, 🚿 shower, 🍳 kitchen-pan, 🍽️ plates, 🚽 toilet, 🛁 bathtub, 🪟 window, 🚪 door). The young-learner illustration set is *Storyset*, not Twemoji (`slideshow-images.js:79`). Section A line 15 and the brief both refer to Twemoji — but the audit shows the young-learner path uses Storyset SVGs and only the *adult/teen via Pexels* path uses photos. Twemoji *does* appear in the .pptx export rasterizer (Section E line 17) for the export, but the in-page young-learner deck is Storyset. So Niamh's slideshow has neither route to "household lamp" working.

### 5. Verdict

**Maybe.** Lesson-plan output is good. Profile flow saved her time. But the slideshow — the one feature that would make Slatework *better* than her Padlet for a 9-year-old — fails the household-items lesson silently. She'd use it for *animals* lessons, *food* lessons, *family* lessons (where the manifest is rich) and would skip it for everything else. **7.0/10.**

### Top friction

1. **`assets/illustrations/young-learner/` has no household / rooms / furniture category.** Lessons on "house," "rooms," "furniture," "kitchen items" — bread-and-butter A1/A2 primary vocab — return empty media slots. Fix: add ~20 SVGs across `household/` (bed, chair, table, sofa, lamp, fridge, oven, sink, mirror, window, door, bathroom, kitchen, bedroom, living-room, dining-room, toilet, shower, curtain, rug) and update `manifest.json` with keyword coverage. Same artist as existing Storyset set if possible. ~2 hr data work, no code change.
2. **Three above-form chrome rows on lesson-plan** (per Section A important finding — `lesson-plan.html:108-112`) — for a moderate-tech parent doing a Wednesday-afternoon prep, the visual density of three grey-rectangle cards before the first input reads as setup-heavy. Section A's recommended fix (collapse to a single mono-caption strip when both tutor and student exist) directly helps her workflow. 30-min CSS.

---

## Persona 15 — Liam, 33, Cork LC HL French/Spanish grinds

**Snapshot:** Full-time secondary teacher in Cork; runs €40/hr private grinds on weekday evenings + Saturday mornings for Junior Cert and Leaving Cert students. High tech proficiency, uses Notion + Google Drive for everything. Saturday session: LC HL French comparative essays for a 6th-year (Year 13) student going for H1.

### 1. Landing page

Hits `/`. Sees IE in the country band immediately. Scrolls hero. Live-preview widget already shows en-es default — he changes Country → Ireland, pair → fr-en, Experience → mid (5 yrs, even though he's a full-time teacher running grinds, the multiplier system is ×1.2). Median rate = **€42/hr** for IE fr-en at mid (`data/countries/ie.json:121-127` shows en-fr median €42; fr-en is at lines 186-192 median €35). His actual €40/hr lands right in band. ✓.

He scrolls to bucket 02. Clicks lesson-plan.

**Landing assessment:** 9/10. The rate-calibration matches his lived experience; that's the credibility hook for him.

### 2. Profile decision

He has rotating LC + JC students every weekday + Saturday — different levels, different exams (LC HL FR, LC OL FR, LC HL ES, JC HL FR). A single profile won't cover his portfolio. He **opts in to tutor profile** (Ireland) but skips student profile — he'll re-key per session. The save-link prompt isn't loud; he ignores it.

Tutor strip now shows "You are: tutor in Ireland" on every tool page. Worth the ~10s onboarding.

### 3. Tool walkthrough

**`lesson-plan.html`** (Saturday morning prep, Friday night)

- Target: French. Source: English. Level: **C1** (LC HL year-13 strong students sit at low-C1). Mode: 1:1.
- Goal: "Comparative essay structure for LC HL French Section II Q.4 — argument essays. 60-min session covering: (1) conjonctions de subordination de comparaison (alors que, tandis que, par contre), (2) connector phrases (en revanche, néanmoins, toutefois), (3) thesis-antithesis-synthesis structure, (4) past-paper Q on '*La technologie nous éloigne-t-elle des autres?*'"
- **Exam: "Leaving Cert HL French (Higher Level) — State Examinations Commission Ireland."** Triggers `exam_prep` audience for the slideshow downstream (per `profile.js:277`).
- Submits. Plan returns. Per Section E §important #4, the prompt explicitly takes exam strings seriously and narrows the deck. Lesson plan should land near 80% useful — comparative-essay structure is well-trodden, model knowledge of LC HL is medium (it's not Cambridge / IELTS, but the `Higher Level` + `State Examinations Commission Ireland` string is enough specificity to anchor).

**`marking.html`** (Saturday afternoon, after student submits practice essay)

- Pastes 350-word student essay. Target: French. Level: C1. The marking output (`page-marking.js`) returns rubric-style feedback. **Friction:** Slatework's marking is generic-CEFR; LC HL French marking has 5 specific assessment dimensions (Comprehension 30%, Production 30%, Communication 20%, Style 10%, Mechanics 10%) that aren't present. He'll use the output as a base layer and rewrite the rubric annotations manually.
- He still uses the tool because it gets him 60% of the way there in 30s vs. 40min by hand.

**`worksheet.html`**

- Generates a 5-question past-paper-style comparative-essay scaffolding worksheet (planning grid, connector bank, intro template). Level C1. Format: "structured planning template + reference card." Useful enough for the cohort. ✓.

**`rates.html`**

- He confirms €40/hr is below the IE fr-en "high" tier (€65). The page surfaces median €35, his rate is €5 above. He's been running flat for 3 years; he raises eyebrows but realistically agrees with the data. **Mild dissonance:** LC HL grinds in Cork command €45-€60/hr at peak (Sept-May) — the IE data pack at lines 113-198 doesn't differentiate "exam-prep Higher Level" from "private conversation tutoring." ie.json could split rates per level/exam but currently doesn't. v0.2 polish.

### 4. Slideshow flow

He clicks "Generate slideshow from this plan." `exam` field non-empty → audience derives to `exam_prep` (per `profile.js:276-277`). Per Section E line 25, exam_prep returns null images by default (per `slideshow-images.js:85-87`) — "prompt cards, model answers" style, mostly text with structure overlays. **This is correct for him** — LC HL essay prep doesn't need cartoon images. The deck reads as prompt-card / model-answer / structure-template. Quality depends on prompt + model. Should be solid.

Per Section E §critical #2 (region not auto-focused after render), he tabs in once and is fine.

PPTX export: he likely exports for his Saturday-morning student to download from email. .pptx works (per Section E §sub-score 8 PPTX export quality 8). LC HL student receives a usable file. ✓.

### 5. Verdict

**Yes.** Liam is exactly the kind of secondary-teacher-running-grinds tutor Slatework is built for. He'll use lesson-plan + marking + worksheet + slideshow weekly during Sept-May LC season. **8.5/10.**

### Top friction

1. **No LC/JC marking rubric scaffolding.** LC HL French marking has 5 weighted dimensions (per State Examinations Commission). Slatework returns CEFR-band feedback. Fix: a `data/exams/ie-leaving-cert.json` with marking schemes for HL/OL French, Spanish, German, Italian, Irish (the LC modern-language papers) — the marking tool reads from this when `exam` matches an LC HL string. ~3 hr data + 1 hr glue. Unlocks the IE secondary-teacher segment more cleanly.
2. **IE rates pack doesn't differentiate exam-prep premium.** LC HL grinds run 25-50% above general en-fr conversation tutoring. `ie.json:121-127` (en-fr) and `:186-192` (fr-en) are flat across use-cases. Fix: add `exam_prep_multiplier: 1.3` to ie.json (or per-pair) and surface it on rates.html when user indicates LC/JC context. Light data + UI.

---

## Persona 16 — Joel, 47, Toronto FR-immersion + Saturday tutor

**Snapshot:** Full-time French-immersion teacher in a TDSB (Toronto District School Board) elementary school. Saturdays runs paid small-group tutoring (4 kids) for his own school's struggling Y5-Y6s — French-immersion native English speakers, B1 productive but reading toward B2. High tech proficiency. Saturday session: passé composé vs imparfait for 4 struggling Y6s.

### 1. Landing page

Hits `/`. Country band shows CA. Hero live-preview: he switches to Canada, pair en-fr (`countries.js:34`), mid experience (he's been teaching 18 years — the multiplier caps at senior ×1.5). Median displays CA$50/hr (per `ca.json:34-39` median CA$50). His Saturday rate is CA$60/hr × 4 students = CA$240/hr aggregate, splits as CA$60/student/hr. Realistic for the market. ✓.

Clicks lesson-plan.

**Landing assessment:** 9/10.

### 2. Profile decision

He has the same 4-kid Saturday group every week and prefers consistency. He **opts in to tutor + student profile**:
- Tutor: "Joel" + Canada
- Student: name "Saturday Y6 group", target French, source English, level B1, mode small_group, audience profile manually pinned to `young_learner` (because per Section E §critical #1, B1 + small_group + no-exam auto-derives to `teen` via `profile.js:283`, but his Y6s are 11-12yo who absolutely need `young_learner` deck density).

He'll reuse this profile every Saturday morning. ~15s setup.

### 3. Tool walkthrough

**`lesson-plan.html`** (Friday night prep)

- Target: French. Source: English. Level: B1 (pre-filled from profile). Mode: small_group (pre-filled).
- Goal: "Distinguishing passé composé vs imparfait. Group of 4 Y6 French-immersion students, B1 productive. Need: (1) two contexts side-by-side (completed action vs habitual / ongoing), (2) signal-word list (hier, soudain, tout à coup, d'habitude, autrefois), (3) error-correction round on common L1-transfer mistakes, (4) Kahoot-style quick-fire for warmup."
- Exam: blank — TDSB doesn't run a formal external exam at this level.
- Submits. Plan returns. Mode=small_group is well-supported in the prompt (per Section E §sub-score 9 mode discipline). Plan should be solid.

**Friction:** Per Section A line 14, the lesson-plan above-form chrome stack is heavy — but Joel is high-tech and won't be put off. Fine.

**`worksheet.html`** (printable, for handout)

- He generates a 12-question worksheet (gap-fill + signal-word matching + 2 short-answer "tell me about a Saturday last winter"). Level B1. Format: printable. He prints 4 copies. ✓.

**`slideshow.html` extension** (the moment of truth for him)

He clicks "Generate slideshow from this plan." Mode=small_group → per `slideshow-render.js:142-149`, classroom is detected via `mode === 'classroom'` so small_group does NOT trigger the `slideshow--classroom` CSS hook (per `slideshow-render.js:149`). Audience: he manually pinned `young_learner` on his student profile, so override applies. Manifest match for keywords:
- `verb-jump`, `verb-run`, `verb-walk` (passé composé action verbs) — manifest has these (confirmed in directory listing).
- `weather-sun`, `weather-rain` (imparfait setting context) — manifest has weather.
- `family-mother`, `family-father` (typical "ma mère cuisinait") — manifest has family.
- `food-egg`, `food-bread` (breakfast as ongoing imparfait context) — manifest has food.

**Joel's slideshow lands well.** Visual coverage is strong for this lesson. The B1-mode + young_learner-override gives him the kid-friendly density he wants without the auto-derive bug biting (Section E §critical #1 — which he sidestepped by pinning manually).

### 4. Slideshow flow — the small-group classroom gap

Per Section E classroom-mode CSS hook (`slideshow-render.js:149`) and PPTX export 1.2× scaling for classroom mode (Section E §sub-score 8), **small_group is treated identically to one_to_one for visual scaling.** Joel projects from his laptop onto the classroom screen for the Saturday group of 4 — slide font size is 1:1-tutor-sized, not 1.2× classroom. He'll squint or zoom the browser. Fix would be: small_group also gets `slideshow--small_group` CSS hook with a 1.1× scale (subtle enough it doesn't break 1:1 while improving 4-person group readability).

Alternatively, the small_group case is a known weakness: classroom is sized for 25, 1:1 is sized for over-the-shoulder — small_group is the in-between case at 3-6 students, and Slatework's renderer doesn't have a specific style for it.

PPTX export works. 4 students, 1 deck, projector or shared screen. ✓.

### 5. Verdict

**Yes.** Joel is the second-most-aligned persona in this block (after Liam). Saturday tutoring + B1-immersion target + young-learner deck override = exactly the use case the Plan-2 slideshow was built for. **8.0/10.**

### Top friction

1. **`small_group` mode has no visual scaling between 1:1 and classroom** (`slideshow-render.js:142-149` only handles classroom). 4-kid groups projected on a screen need 1.1× font scaling; Slatework gives him 1:1 size. Fix: add `slideshow--small_group` CSS hook with a 1.1× type-scale, mirror in PPTX export. ~30 min CSS + 10 min export module.
2. **`deriveAudience` for B1 + small_group returns `teen`** (`profile.js:283`) — for FR-immersion Y6s (B1 productive but 11yo), the auto-derive misclassifies. Joel pinned manually, so he avoided it; another teacher in the same workflow without that knowledge would get a text-leaning deck for kids. Section E §critical #1 already covers this; flagging that the small_group + 11yo case is its own variant of the bug. Fix: branch `deriveAudience` on mode AND age-hint (or add an "ages of students" hint to the form). Same fix scope as Section E.

---

## Block-level patterns

### What CA/IE coverage gets right

- **fr-en + en-fr is a first-class pair**, not buried under generic en-* entries. `ca.json:34-50` and `ie.json:113-197` give Liam and Marie-Claire confident anchoring on rates.
- **Tax forms are accurate per country** — T2125 for CA, Form 11 / ROS for IE. Both URLs present. Last-verified timestamp is honest.
- **Garda Vetting + Vulnerable Sector Check** are surfaced in `ie.json:107-112` and `ca.json:253-258` — Niamh and Joel both teach kids; this is exactly the credential they'd ask Slatework about.
- **SEPA Instant + Interac e-Transfer + Revolut + Wise** are all listed first in payment_methods for IE/CA — domestic-first ranking. Marie-Claire and Niamh both default to these.

### What this block exposes

- **Sub-national tax** (Quebec for CA) is a structural gap. Same pattern likely applies to AU (state-level WCC vs federal tax) and US (state income tax). v0.3 work to extend the schema.
- **Exam-rubric scaffolding** is the missing layer for 3 of 4 personas. PSC SLE (Canada federal), Sciath na Scol (IE primary), LC HL (IE secondary) — none have JSON packs. This is the highest-ROI extension because it converts "lesson-plan generic" → "lesson-plan exactly for *my* exam."
- **Young-learner manifest gaps** (household/rooms/furniture) is a specific content fix, not a structural one. ~2 hours of artist + JSON work.
- **`small_group` mode** is treated as 1:1 visually but priced differently in tutor reality. Two fixes (CSS scale + audience auto-derive on small_group + young age) close it.

### Cross-block recurring friction

- **Above-form chrome stack** on lesson-plan / worksheet / marking (Section A important finding) — every persona in this block notices it. Even high-tech Liam reads it as "something to scroll past." Section A's collapse-to-one-strip recommendation is the single highest-leverage fix for this block's first-impression scores.
- **Auto-focus after slideshow render** (Section E §critical #2) — silently affects all 4. None of these personas would *say* "the keyboard nav doesn't work" because they all have mice; but tab-order opacity is a polish gap.

### What would push this block to 9+/10

1. Quebec province pack inside ca.json (Marie-Claire +1.0)
2. Household-items category in young-learner manifest (Niamh +1.0)
3. LC/JC marking rubric pack for ie.json (Liam +0.5)
4. small_group CSS scale + audience auto-derive fix for B1+young students (Joel +0.5)

Total block lift: ~+0.75 average → **8.25/10 block average**.
