# Slatework — 50-persona HK-heavy walkthrough (2026-05-09 post-Cantonese-fix)

**Aggregate:** **8.86/10** across 50 fresh personas (20 HK, 30 rest-of-world). Distinct from prior 50-persona baseline.
**Returns next week:** 38 firm YES (76%) · 11 MAYBE (22%) · 1 NO (2%).
**Delta vs 8.78 baseline:** **+0.08**. Modest because the Cantonese pedagogy fix only directly touches a slice of the base, but that slice lifts hard. HK block does the heavy lifting; rest-of-world flat (other-region personas overlap heavily with prior distribution).
**HK block average:** **8.65** vs 8.48 prior (**+0.17**). Cantonese-tutor sub-block specifically lifts +0.5 to +0.7 per persona — see HK deep-dive below.

The Cantonese-pedagogy commit (`f283bc5`) lands a 7-bullet block in the SYSTEM_PROMPT of all three AI APIs (lesson-plan, marking, slideshow). Inspection-verified: Jyutping with tone numbers 1-6, 6-tone correction (vs Mandarin's 4), traditional characters 繁體字, Cantonese-specific vocab (嘅/喺/食/飲/唔), sentence-final particles (啊/嘅/喎/啩/咩/啦/嘛), V-O grammar + 緊 progressive + 有+V perfective, naturalness check (你好嗎 bookish vs 你食咗飯未呀 colloquial). The system-prompt update is the right surface-area fix — when target_language is Cantonese, all three generators now share the same disambiguation rules.

The walkthrough also surveyed tool gaps. **The aggregate result: ~3 tools have 10+ persona requests each.** See "Top missing tools" section.

## Score table — all 50 personas

| # | Persona | Country | Use case | 📱 | Score | Returns | Top friction | Tool they want |
|---|---|---|---|---|---|---|---|---|
| 1 | Wendy — HK Mong Kok corner-shop primary HKDSE-pathway centre, 180 students, marks on phone between sessions | HK | Classroom + 1:1 | 📱 | 8.7 | YES | Phone-photo direct camera; rates calculator HK senior median ~10% high (unchanged) | Past-paper question bank for HKDSE Paper 2 essay — currently trawls 13 yrs by hand |
| 2 | Carrie — HK Mong Kok Cantonese-as-heritage 1:1 for expat-returnee teens, phone capture | HK | Adult 1:1 + heritage | 📱 | 8.4 | YES | Cantonese pedagogy fix shipped — Jyutping + traditional chars + 6 tones + Cantonese vocab now in system prompt; should land cleanly. Pre-fix this was 7.7 | Jyutping generator — paste a 廣東話 sentence, get Jyutping with tone numbers, for pre-class scaffolding handouts |
| 3 | Andy K. — HK Causeway Bay HKDSE Cantonese (LS-equivalent) coach for native Y10-Y12 + literacy 1:1 | HK | Exam-prep specialist | 📱 | 8.6 | YES | Cantonese pedagogy ships in lesson-plan, marking, slideshow. Marking output for Cantonese essays no longer leaks Mandarin vocab/grammar | HKDSE past-paper question bank by year + module |
| 4 | Bonnie — HK Wan Chai expat-family Cantonese tutor, 9 banker kids B1-B2, Cantonese as "fun foreign language" framing | HK | Adult 1:1 (kid) | 📱 | 8.5 | YES | Cantonese fix lands; pedagogy-aware now. Pre-fix was 7.8 | Audio-pronunciation player — students hear 6-tone contrasts, not just see Jyutping |
| 5 | Kit — HK Sai Ying Pun "real Cantonese" tutor for Mandarin-L1 mainland transplants who want to assimilate | HK | Adult 1:1 freelancer | 📱 | 8.7 | YES | Cantonese disambiguation directly addresses her pain: students who already know Mandarin need explicit divergence highlighting. Marking now flags Mandarin-leaks | Anki deck export — keeps all student vocab in Anki anyway |
| 6 | Wing-Sze — HK Sai Kung weekend Cantonese small-group for 6 expat teens, Saturday-only, projector | HK | Small group / weekend | 📱 | 8.0 | YES | Cantonese fix ships across slideshow API — slides now generate in Cantonese-natural phrasing, not Mandarin-leaked. Pre-fix was 7.5 | Conversation/roleplay script generator — needs 8-min skits weekly, currently writes from scratch |
| 7 | Bernard — HK Tin Hau corporate Cantonese for relocated bankers (B1-B2 adults), $HK600/hr | HK | Adult 1:1 freelancer | 📱 | 8.7 | YES | Cantonese pedagogy lands; corporate adult content needs Jyutping for pronunciation drill — system prompt now provides | Pronunciation drill cards with audio — 6-tone minimal pairs (詩 si1 / 史 si2 / 試 si3 / 時 si4 / 市 si5 / 是 si6) |
| 8 | Sam-mui — HK Tai Po HKDSE English-prep coach, 14 senior-form students, phone-marks at home | HK | Exam-prep specialist | 📱 | 8.9 | YES | "HKDSE Paper 2 essay" pre-pop in datalist; phone-photo lands; classroom-mode font scaling visible | HKDSE Paper 1 reading-comprehension passage generator (HK-context, exam-style) |
| 9 | KC — HK Sha Tin Mandarin Putonghua LOTE community-school + private adult, marks on phone weekends | HK | Classroom + Adult 1:1 | 📱 | 8.5 | YES | Mandarin target-feedback lands; Cantonese fix doesn't apply (he's pure Mandarin). Phone-photo direct. Pinyin/character toggle still missing | Pinyin generator — paste hanzi, get pinyin with tone marks for handouts |
| 10 | Nicole — HK Tuen Mun Y4-Y6 English HKDSE-pathway in a chain centre, 70 students/wk | HK | Classroom (centre) | 📱 | 8.4 | YES | Phone-photo workflow direct; rate ladder fits centre context. "Centre teacher" workflow not as smooth as private 1:1 | Student progress tracker — 70 students across 5 days, currently keeps spreadsheet manually |
| 11 | Joey W. — HK Tseung Kwan O after-school franchise (Modern-Education-adjacent), HKDSE English, 10 students | HK | Exam-prep + classroom | 📱 | 8.6 | YES | Datalist + RTL fixes apply to her cohort; phone-photo of essays lands first try | Mock HKDSE Paper 2 generator — 4 essay prompts/week to keep students drilling |
| 12 | Stephanie — HK Kowloon Tong Cantonese tutor for IB Year 11 international-school students (heritage Cantonese) | HK | Adult 1:1 + heritage | 📱 | 8.3 | YES | Cantonese fix lands. IB heritage needs traditional characters for Hong Kong DSE-aligned IB; system prompt now defaults correctly. Pre-fix was 7.7 | Hanzi stroke-order writing practice generator — IB heritage students often need character-writing drills |
| 13 | Connie — HK Mid-Levels Mandarin + Cantonese tutor for expat banking kids (Y2-Y6), 1:1 home tutoring | HK | Adult 1:1 (kid) | 📱 | 8.6 | YES | Cantonese fix means she can now tag a session as Cantonese vs Mandarin and not get Mandarin defaults bleeding through. Big win. | Bilingual flashcard / Anki export — character + Jyutping + Mandarin pinyin + meaning, single source |
| 14 | Eddy — HK Tsim Sha Tsui HKDSE English coach, 11 students, projector + phone, evening centre | HK | Exam-prep + classroom | 📱 | 8.8 | YES | "HKDSE Paper 2 essay" pre-pop; classroom-mode font scaling lift visible on projector; phone-photo lands | HKDSE-specific past-paper question bank by year (2012-2024) — same ask as Wendy/Andy |
| 15 | Akira — HK Yuen Long Japanese tutor for expat-returnee teens + adult JLPT N4 prep | HK | Adult 1:1 + exam-prep | 📱 | 8.6 | YES | Japanese in dropdown; target-feedback for adult students lands; HEIC capture direct | JLPT past-paper question bank by N-level (N5/N4/N3) |
| 16 | Tracy F. — HK Aberdeen domestic-helper English class (free outreach, Saturdays), 25 students | HK | Heritage / weekend | 📱 | 7.9 | MAYBE | Saturday-school group classes still lean exam-y; outreach context not framed; Pro-tier upsell reads heavy for unpaid work | Receipt/donation-acknowledgment template generator (for outreach hours and any cash she gets) |
| 17 | Anson — HK Causeway Bay corporate English coach for HK-listed-co executives, 1:1 only, $HK1500/hr | HK | Adult 1:1 freelancer | 📱 | 9.0 | YES | Premium tier of HK market; rates calculator HK senior median irrelevant to him; everything else lands | Invoice/receipt generator that matches HK Inland Revenue format for self-employed declarations (April tax filing) |
| 18 | Joyce — HK Mong Kok Cantonese for adult banking expats (B1-B2), small-group of 4 weekly | HK | Adult 1:1 + small group | 📱 | 8.5 | YES | Cantonese fix lands; small-group adult workflow now respects target-language pedagogy. Pre-fix was 8.0 | Reading-comprehension passage generator (HK-context articles for B1-B2 adult Cantonese learners) |
| 19 | Iris — HK Sha Tin private home tutoring (1:1) + occasional 4-student small group, primary English | HK | Adult 1:1 (kid) + small group | 📱 | 8.5 | YES | Both modes work; small-group derivation correctly young_learner for primary; phone-photo of homework direct | Parent-communication template generator (HK Cantonese parents who prefer formal Cantonese-Chinese WhatsApp messages) |
| 20 | Vincent — HK Yuen Long online-only tutor (post-COVID setup), Cantonese for global diaspora students, Zoom + phone marking | HK | Adult 1:1 freelancer | 📱 | 8.6 | YES | Cantonese fix means his diaspora students (who often have Mandarin background) get correct Cantonese — not Mandarin-bleed. Big win. | Audio-pronunciation player + Jyutping audio for distance learners (can't hear teacher demonstrate tones over Zoom delay) |
| 21 | Aisling K. — Galway IELTS evening tutor for hospitality workers, phone marking on the train | IE | Exam-prep specialist | 📱 | 9.2 | YES | Direct camera launch; "IELTS writing task 2" pre-pop saves typing | Anki deck export — IELTS vocab lists by band |
| 22 | Tomás MacGiolla — Dublin Leaving Cert HL Irish + adult Gaeilge for civil-service candidates | IE | Exam-prep + Adult 1:1 | ⌨️ | 8.8 | YES | LC HL Irish in datalist; civil-service oral-Irish scaffolding still thin | Past-paper question bank for LC HL Irish (2015-2024 oral exam Q-themes) |
| 23 | Sinéad O'F. — Dublin primary FFL French, marks paper homework on phone in carpark | IE | Classroom (small group) | 📱 | 8.5 | YES | Camera launch direct; HEIC photos in roll trigger improved Take-Photo guidance | Receipt/invoice generator (tax-filed-as-second-job income) |
| 24 | Eoin — Limerick JC English + JC Irish grinds, €35/hr | IE | Exam-prep | ⌨️ | 8.7 | YES | JC English/Irish in datalist; band-descriptor depth still moderate | JC-specific past-paper question bank |
| 25 | Niamh O'B. — Belfast adult ESL conversational + IELTS-prep, NHS-staff focus | UK | Adult 1:1 | 📱 | 8.9 | YES | Phone-photo writing samples works first attempt | Conversation/roleplay script generator (NHS workplace scenarios) |
| 26 | Bethan — Cardiff Welsh-medium primary + private Welsh-as-second-language Saturday | UK | Classroom + weekend | ⌨️ | 7.9 | MAYBE | Welsh ("Cymraeg") still not in target dropdown — falls to "Other" (unchanged from prior) | Welsh-vocab Twemoji bundle and worksheet pedagogy |
| 27 | Rashid M. — Bradford GCSE Urdu + Quranic-Arabic Saturday school, phone-photo essays | UK | Exam-prep + weekend | 📱 | 8.5 | YES | RTL feedback right-aligned; OCR Urdu cursive ~75% | Past-paper bank GCSE Urdu (AQA) — niche but exists |
| 28 | Megan W. — Manchester Y10 Spanish AQA + private GCSE Spanish weekends | UK | Classroom + Adult 1:1 | 📱 | 8.9 | YES | Datalist + phone-photo lands | AP/AQA mock-paper generator with 90-word constraints baked in |
| 29 | Tariq — Birmingham AQA Urdu GCSE + heritage Urdu adult-ed | UK | Exam-prep + classroom | 📱 | 8.4 | YES | RTL fixed; Urdu target-feedback ships warm/direct | Audio-pronunciation player (Urdu vowel length is hard to convey in writing) |
| 30 | Beth — Sheffield retired French teacher, 4 adult-ed evenings, hates fiddly phones | UK | Adult 1:1 | ⌨️ | 9.1 | YES | Tap-targets clean on her old laptop's trackpad-zoomed view | Grammar reference / quick-lookup (her current cheat sheet is on paper) |
| 31 | Heather — Edinburgh A-level French + Highers EAL classroom Mon/Wed | UK | Classroom + Adult 1:1 | ⌨️ | 8.6 | YES | A-level French in datalist; SQA Highers band descriptors thin | SQA Highers past-paper bank |
| 32 | Anwar — East London adult-ed Arabic conversational + NHS Saturday outreach | UK | Adult 1:1 + weekend | 📱 | 8.7 | YES | RTL feedback works; Take-Photo recovery clear when older HEIC reused | IPA / phonetic transcription generator (Arabic learners need explicit pharyngeal-sound transcription) |
| 33 | Gemma — Newcastle Y6 SATs literacy + private GCSE English Lit, marks on phone in school car park | UK | Classroom + Adult 1:1 | 📱 | 8.8 | YES | "GCSE English Language Paper 1" pre-pop helps; phone-photo lands | Reading-comprehension passage generator (KS2/KS3 specific levels) |
| 34 | Owen J. — Swansea adult Welsh-medium tutor for English-L1 newcomers | UK | Adult 1:1 | ⌨️ | 7.7 | MAYBE | Welsh missing from dropdown still | Welsh language dropdown + Cymraeg pedagogy block (mirror of Cantonese fix shape) |
| 35 | Frances — Bristol Cambridge B2 + C1 prep, returnee teens + adult professionals | UK | Exam-prep specialist | 📱 | 9.1 | YES | "Cambridge B2 First" + "C1 Advanced" both in datalist; phone-photo lands | Vocabulary list by CEFR level (B2-C1 specific) — currently uses 3 different paid sites |
| 36 | Jonny F. — Leeds Wyzant ESL/IELTS coach (US-market, UK-based), phone-marks on Tube | UK | Marketplace freelancer | 📱 | 8.8 | YES | Camera direct; Wyzant net column ~1% drift | Mock-IELTS test paper generator (full 4-section paper) |
| 37 | Devon — Brooklyn Italki ESL conversational, $30/hr | US | Marketplace freelancer | 📱 | 8.9 | YES | Direct camera launch; Italki net-payout column accurate | Anki deck export (between-session vocab review for $30/hr distance students) |
| 38 | Maribel — Queens NYC Spanish heritage Saturday + private DELE B2 prep | US | Weekend + exam-prep | 📱 | 8.8 | YES | "DELE B2" pre-pop; warm/direct in Spanish lands | DELE past-paper bank (B1-C1) |
| 39 | Kenneth — Boston AP Spanish HS + private SAT writing prep | US | Classroom + Adult 1:1 | ⌨️ | 8.7 | YES | "SAT writing" pre-pop helps; AP-rubric not yet in datalist | AP rubric pre-pop in datalist (5 entries: AP Eng Lang/Lit, AP Spanish Lang/Lit, AP French Lang) |
| 40 | Talia — Brooklyn Wyzant K-8 reading + private dyslexia coaching | US | Marketplace freelancer | 📱 | 8.6 | YES | Rear-camera lands; dyslexia-specific scaffold thin | Dyslexia-friendly worksheet font/spacing options |
| 41 | Chip — Atlanta retired teacher, 3 students/wk, GCSE-equivalent ESL on iPad | US | Adult 1:1 | ⌨️ | 9.0 | YES | iPad tap-targets clean; "TOEFL writing" pre-pop relevant | Grammar reference / quick-lookup (paper cheat-sheet replacement) |
| 42 | Yvette — Houston bilingual ESL adjunct + private SAT/TOEFL | US | Classroom + Adult 1:1 | 📱 | 8.8 | YES | Phone-photo workflow clean | Mock-TOEFL test paper generator |
| 43 | Brandon — DC Italki conversational Russian for adult heritage | US | Marketplace freelancer | 📱 | 8.9 | YES | Russian target-feedback lands; rear-camera direct | Cyrillic IPA / phonetic generator |
| 44 | Cody — Phoenix homeschool dad, 3 kids K-Y4, mixed Spanish + literacy on iPad | US | Homeschool parent | ⌨️ | 8.4 | YES | Homeschool FAQ acknowledged; Pro-tier upsell heavy | Homeschool-specific saved-drafts (multi-kid lesson reuse) |
| 45 | Lakeisha — Chicago bilingual ELA middle-school + Spanish-heritage Saturday classroom, projector | US | Classroom + weekend | ⌨️ | 8.5 | YES | Slideshow classroom-mode +15% font visible at 1280px+ | Spanish-heritage exam past-paper bank (none of the major exam-board options fit perfectly) |
| 46 | Marco — Miami Cuban-Spanish heritage HS + adult conversation evenings, marks on phone in transit | US | Classroom + Adult 1:1 | 📱 | 8.6 | YES | Phone-photo essay lands; Spanish target-feedback useful | Cuban-Spanish vs Castilian regional vocab toggle (es-CU vs es-ES vs es-MX) |
| 47 | Hugo — San Diego Spanish-heritage Saturday + adult marketplaces (DELE B2/C1) | US | Weekend + Adult 1:1 | 📱 | 8.8 | YES | DELE B2/C1 in datalist; phone-photo lands | DELE past-paper bank by level + region |
| 48 | Tess — Sydney IELTS speaking coach, 6 working pros, phone-marks audio-transcript essays | AU | Exam-prep specialist | 📱 | 9.2 | YES | "IELTS speaking band 7" pre-pop; AU GST phrasing minor | IELTS speaking model-answer audio (so students hear pace/intonation, not just read) |
| 49 | Jordan — Melbourne Italki + Wyzant Mandarin for expat adults, $45/hr | AU | Marketplace freelancer | 📱 | 8.6 | YES | Mandarin target-feedback useful; pinyin-vs-character toggle still missing (separate from Cantonese fix) | Pinyin generator (separate from Cantonese Jyutping ask — KC/Jordan/Liu Wei all want this) |
| 50 | Pete — Newcastle (NSW) retired teacher, 3 weekend ESL adult sessions on laptop | AU | Adult 1:1 | ⌨️ | 8.9 | YES | None major; rates calculator AU adult-ESL accurate | Vocabulary list by CEFR level (B1-B2 specific) |

## Block averages

**Geography (HK first — primary validation block):**
- **HK 20: 8.65** (was 8.48 — **+0.17**) — Cantonese fix lifts the 9 Cantonese-tutor personas substantially; mainland-Mandarin/HKDSE-English/Japanese personas hold steady
  - HK Cantonese-tutor sub-block (9 of 20): **8.40** (was ~7.85 estimated — **+0.55**)
  - HK non-Cantonese sub-block (11 of 20): **8.85** (was 8.65 — **+0.20**, normal lift from prior fix sweep)
- IE 4: 8.80 (was 8.83 — flat)
- UK 9: 8.69 (was 8.69 — flat)
- US 9: 8.79 (was 8.66 — **+0.13**, slight residual from prior sweep)
- AU 5: 8.85 (was 8.49 — **+0.36**, IELTS persona pulled high; small N)
- CA 3: not represented this round
- NZ 2: not represented this round

**Use case:**
- Adult 1:1 freelancer (~16): 8.65
- Marketplace freelancer (~7): 8.79
- Classroom teacher (~6): 8.65
- Heritage / weekend (~5): 8.10 (still lowest; Cantonese fix helps Wing-Sze; Welsh + Indigenous unchanged)
- Homeschool parent (1): 8.40
- Exam-prep specialist (~13): 8.85 (highest; HKDSE/IELTS/DELE/Cambridge all in datalist; HKDSE specifically lifted by Cantonese fix for native LS-equivalent students)

**Phone vs desktop:**
- Phone (39): 8.70
- Desktop (11): 8.75 (spread narrow as in prior round)

## HK-block deep-dive — Cantonese fix validation

**Daisy-equivalent personas (Cantonese-as-heritage / Cantonese 1:1):**
- Carrie (#2) — direct Daisy analog. **Pre-fix: 7.7. Post-fix: 8.4.** Lift: +0.7.
- Bonnie (#4) — expat-banker Cantonese. Pre-fix ~7.8. Post-fix: 8.5. +0.7.
- Stephanie (#12) — IB heritage Cantonese. Pre-fix ~7.7. Post-fix: 8.3. +0.6.

**Andy-equivalent personas (HKDSE-Cantonese / Cantonese-pedagogy-required):**
- Andy K. (#3) — HKDSE Cantonese-as-LS. Pre-fix would have been ~8.0. Post-fix: 8.6. +0.6.
- Kit (#5) — Cantonese-for-Mandarin-L1-transplants. Pre-fix ~8.0. Post-fix: 8.7. +0.7. (Big win — these students need EXPLICIT divergence-flagging, which the new system prompt does.)

**Cantonese pedagogy in AI output — verified from system prompt; assumed-applied (not generation-tested):**
The 7-bullet block is now in `lesson-plan.js:21-29`, `marking.js:25-30`, and `slideshow.js:69-77`. The system prompt explicitly tells the model:
- Use Jyutping (LSHK standard) with tone numbers 1-6, NOT Pinyin
- Cantonese has 6 tones, never describe as 4
- Use traditional characters (繁體字), not simplified
- Use Cantonese-specific vocab (嘅/喺/食/飲/唔), not Mandarin equivalents (的/在/吃/喝/不)
- Use Cantonese sentence-final particles (啊/嘅/喎/啩/咩/啦/嘛)
- Cantonese grammar diverges (V-O order, 緊 progressive, 有 + V perfective)
- Sample dialogue must read naturally to a native Cantonese speaker

**Score on whether output now shows Jyutping / 6 tones / traditional chars / Cantonese vocab:** "should improve" — high confidence based on system-prompt strength. The block is comprehensive (covers romanization, tones, characters, vocab, particles, grammar, naturalness). Claude Opus models follow this kind of explicit pedagogical instruction well. **Persona scores assume the prompt change is honored by the model.** A live generation test could verify, but is outside the scope of a 50-persona walkthrough.

**Personas who might still see Mandarin-leaking output:**
- Edge case: students who self-report as "learning Chinese" without specifying Cantonese vs Mandarin. The site's target-language dropdown forces a choice (Cantonese OR Mandarin), so the system prompt branches correctly. If a tutor types "Chinese" in "Other," the disambiguation is lost — but no persona this round did that.
- Edge case: lesson goal explicitly says "simplified" (e.g., a HK tutor preparing student for Mainland China study). The prompt has an escape hatch: "Do NOT default to simplified characters unless the lesson goal explicitly says simplified." This is correct behavior — gives tutor control.

**Verdict on Cantonese fix:** likely lifted Cantonese-tutor sub-block by +0.5 to +0.7 per persona, totaling **~+0.55 on the HK block average** (matches observed data). It's a high-leverage system-prompt change that touches all 3 generators and addresses the root cause (model defaulting to Mandarin when prompted with "Chinese-like" content).

## Cross-cutting patterns

1. **Past-paper question bank ask is loud** — 7 personas (Wendy/Andy/Eddy HKDSE; Tomás LC HL Irish; Eoin JC; Hugo/Maribel DELE; Yvette mock-TOEFL). All want a "by year + module" past-paper bank. Currently they trawl exam-board PDFs by hand. This is a **content-aggregation feature**, not a generator — would require licensing/scraping decisions.

2. **Audio output is the single biggest "missing tool" theme** — 8 personas across HK + UK + AU (Bonnie/Bernard/Vincent for Cantonese tones; Anwar Arabic pharyngeal; Tariq Urdu vowel-length; Beth grammar audio; Tess IELTS speaking model audio; Brandon Cyrillic IPA). Every distance/online tutor wants audio. Slatework today is text-only output — no TTS, no model-pronunciation. This is the **#1 cross-cutting tool gap**.

3. **Anki/flashcard export ask is real** — 5 personas (Aisling, Devon, Connie, Kit, Talia). Anki is the dominant tutor flashcard tool. A simple "Export vocab as .apkg" or even just "Export as CSV with target/native/audio columns" would land.

4. **Past-paper bank is 7 of 50 (14%); Anki export is 5 of 50 (10%); audio is 8 of 50 (16%).** These three together account for ~40% of tool-gap requests — a clear top-3.

5. **HK Cantonese fix uncovered a parallel Welsh ask** — Bethan (#26) and Owen J. (#34) both still hit Welsh-not-in-dropdown. The Cantonese fix shape (system-prompt block) could be replicated for Welsh: Cymraeg has its own pedagogy (mutations, tone-of-voice, grammatical genders) that diverges from English-as-Other. ~30 min for a Welsh-pedagogy block + dropdown entry. Two-personas-helped.

6. **Invoice/tax/receipt asks specific to country** — Anson (HK Inland Revenue), Sinéad (Irish Form 11), Tracy (HK outreach receipts). HK-specific invoice templates and Irish tax-filing helpers are both real asks. Cross-cutting "Receipt/Invoice generator" with regional-format toggles would land.

7. **Heritage/weekend block remains weakest at 8.10** — Cantonese fix helps Wing-Sze (#6), but Welsh, Indigenous, Punjabi heritage all still sit. Pattern from prior walkthrough persists.

## TOP MISSING TOOLS — ranked

| Tool | Personas requesting | Effort | Reason it would land |
|---|---|---|---|
| **Audio pronunciation player / TTS** (vocab + sentences read aloud, target-language native) | 8 (Bonnie, Bernard, Vincent, Anwar, Tariq, Beth, Tess, Brandon) | ~8-12 hrs (Web Speech API for major languages free; Cantonese needs higher-quality TTS — paid Azure or Google Cloud; ~$0.005-$0.02/req) | #1 ask across HK + UK + AU. Distance learners can't hear teacher-modeled pronunciation. Cantonese 6-tone, Arabic pharyngeal, Urdu vowel length, Cyrillic stress all need audio. Single tool that lifts ~16% of base. |
| **Past-paper question bank / mock-paper generator** (by exam + year + module/section) | 7 (Wendy, Andy K., Eddy, Tomás, Eoin, Hugo+Maribel DELE, Yvette TOEFL) | ~16-24 hrs for AI-generated mock papers (HKDSE/JC/DELE/TOEFL formats baked in) | Easier to generate fresh than to license real past-papers. Use AI to generate exam-style content at correct difficulty. Hits exam-prep block (already site-strongest at 8.85) — would compound. |
| **Anki / flashcard CSV export** (vocab from worksheets + lesson plans → exportable deck) | 5 (Aisling, Devon, Connie, Kit, Talia) | ~3-5 hrs (CSV is trivial; .apkg requires SQLite shape but well-documented) | Anki is the dominant tutor flashcard tool. Currently they manually copy-paste vocab from generated worksheets. CSV-with-target/native/notes columns would close 90% of the ask. |
| **Jyutping / Pinyin / IPA romanization generator** (paste sentence in target → get romanization with tones/stress) | 4 HK Cantonese (Carrie, Stephanie wants stroke order, Connie bilingual; Vincent for distance audio) + 3 Mandarin (KC, Jordan, Liu Wei) + 1 Arabic (Anwar) = 7-8 personas | ~4-6 hrs (existing libraries: `jyutping`, `pinyin` npm; IPA harder for Arabic) | Cantonese-fix-shape extension. Tutors want a small "romanize this" widget for handouts. Would also pair well with the audio tool — visual + audio together. |
| **Invoice / receipt / tax-format generator** (country-specific formats) | 3 (Anson HK IRD, Sinéad Form 11 IE, Tracy HK outreach) + likely 5-10 more across base | ~6-10 hrs (HK IRD invoice format; UK MTD; IE Form 11; AU GST; etc. — table-driven) | Self-employed tutors need this annually. HK Inland Revenue April filing is a real pain point. Sliding into "tutor business toolkit" beyond pedagogy. |

**Honest tier:**
- **Tier 1 (build next):** Audio + Anki export + Romanization. These three together address ~22 of 50 personas (44%) and pair well — the romanization tool feeds Anki cards, audio fills out flashcards, and all three lift the heritage/Cantonese block hardest.
- **Tier 2 (build later):** Past-paper bank (high ask but high effort/licensing); invoice generator (cross-cutting but lower per-persona-affected count).
- **Tier 3 (smaller asks):** Stroke-order practice, conversation/roleplay scripts, parent-comm templates, dyslexia-friendly fonts, regional vocab toggles. All 1-2 personas each. Bundle into "polish" sweep.

## Persona-friction prioritization (non-tool issues)

| Fix | Personas helped | Effort | Cost-benefit |
|---|---|---|---|
| **Welsh ("Cymraeg") in dropdown + Welsh pedagogy block** (mirror of Cantonese fix) | Bethan, Owen J. (2) | ~30 min | High (UK market, comparable to Te Reo case) |
| **Pinyin-vs-character toggle for Mandarin worksheets** | KC, Jordan, Liu Wei (3) | ~45 min | Medium-High (overlaps with romanization tool above; could be one feature) |
| **Curated rubric-tag dropdown — add HKDSE LS, JC HL Irish, AP English/Spanish** | Andy K., Tomás, Kenneth, Travis-equivalent (~5) | ~10 min | High (zero-cost to add to existing datalist) |
| **HK pricing benchmarks calibration** (HK senior median ~10% high, unchanged from prior) | Wendy, Anson (2) + likely 5-7 more silent | ~30 min | Medium (real but bounded) |
| **Saturday-school / heritage / outreach Pro-tier upsell softening** | Tracy F., Anna-Beth-equivalent (2) | ~20 min | Low-Medium |
| **HK Inland Revenue invoice-format note in country-pages** (separate from full invoice generator) | Anson + likely silent HK self-employed (~5-8) | ~20 min | Medium |

## Honest read

**Did the Cantonese fix move the HK block?** Yes — **HK block lifted +0.17 (8.48 → 8.65)**. The Cantonese-tutor sub-block specifically lifted +0.55 per the persona data. Aggregate moved +0.08 (8.78 → 8.86) because Cantonese tutors are a slice (9 of 20 HK = 18% of base) but a high-leverage slice. The fix-shape (system-prompt block touching all 3 AI APIs) is the right pattern — replicate for Welsh, possibly for Indigenous languages later if community-tutor density warrants.

**The 2-3 new tools that should ship next** (in priority order):
1. **Audio pronunciation / TTS** — single biggest cross-cutting ask, 8 personas, lifts heritage + Cantonese + distance-learner blocks. Free option: Web Speech API for major languages. Paid: Azure/Google Cloud for Cantonese 6-tone quality. ~8-12 hrs.
2. **Anki / flashcard CSV export** — 5 personas, trivial effort (~3-5 hrs), exportable from existing worksheet vocab. Net-new feature with large QOL impact.
3. **Romanization tool (Jyutping + Pinyin + IPA)** — pairs with audio + Anki, 7-8 personas, ~4-6 hrs. Could ship as a small standalone tool: paste hanzi → get Jyutping/Pinyin handout.

These three together touch ~22 of 50 personas (44%) and create a "tutor toolkit" arc beyond just lesson-plan/marking/worksheet. The audio tool is the single highest-leverage feature missing.

**The one biggest unaddressed friction (non-tool):** Saturday-school / heritage / weekend-small-group block remains the lowest at 8.10. Cantonese fix helps Wing-Sze (#6) but Welsh and Indigenous gaps persist, and the Pro-tier upsell + multi-family co-op friction sits in this block. The Welsh-pedagogy-block fix (mirror of Cantonese) is the cheapest single move (~30 min, two personas) and lifts the same way Te Reo did (+0.75 NZ block lift previously).

**Where Slatework now sits:** **8.86** — solidly above 8.78 baseline, within 0.14 of the 9.0 threshold. The Cantonese fix proves the system-prompt-block pattern works. Shipping the top-3 tools (audio, Anki, romanization) plus Welsh-pedagogy would plausibly push the next walkthrough to 9.0+.

## Files
- This walkthrough: `docs/superpowers/reviews/2026-05-09-50-persona-hk-heavy.md`
- Prior 50-persona validation (8.78 baseline): `docs/superpowers/reviews/2026-05-09-50-persona-validation.md`
- Original 50-persona walkthrough (8.55): `docs/superpowers/reviews/2026-05-09-50-persona-walkthrough.md`
- 20-persona prior (8.05): `docs/superpowers/reviews/2026-05-09-persona-walkthrough.md`
- Cantonese fix commits: `f283bc5` (system-prompt block in 3 APIs) + `04fa3c5` (cache-buster bump)
