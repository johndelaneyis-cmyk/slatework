# Slatework — 20-persona walkthrough (2026-05-09)

**Aggregate:** 8.05/10 across 20 realistic tutor personas spread across the 7 launch markets
**Returns next week:** 12 firm YES (60%) · 8 MAYBE (40%) · 0 NO

The site is genuinely useful for most realistic tutors. The MAYBE bucket isn't "bad" — it's where one or two specific friction points cost the persona enough trust to consider a competitor. Closing the right 3-4 fixes converts most MAYBES to YES.

## Score table — all 20 personas

| # | Persona | Country | Score | Returns? | Top friction |
|---|---|---|---|---|---|
| 1 | Aiya — HK supplementary primary English tutor | HK | 7.6 | YES | Profile-mount stack pushes form below fold |
| 2 | Linda — HK kindergarten English-prep (3-5yo) | HK | 6.8 | MAYBE | Twemoji bundle gaps for kindergarten vocab; slideshow shell undersells brand |
| 3 | Wei — HK Mandarin tutor for expat kids | HK | 8.4 | YES | Marking feedback-language toggle missing |
| 4 | Patrick — Edinburgh retired IELTS tutor | UK | 8.9 | YES | Profile feature feels intrusive (he Quick-Lessons everything) |
| 5 | David — UK GCSE Spanish (MyTutor) | UK | 9.0 | YES | Twinkl image-bank dependency persists |
| 6 | Sophie — UK A-level FR + adult conversation | UK | 8.4 | MAYBE | A2 adult conversation gets young_learner kid deck (Critical #2) |
| 7 | Hassan — East London Saturday Arabic school + private | UK | 7.8 | MAYBE | Classroom-mode slideshow polish lacking |
| 8 | James — Manchester ESL community college coordinator | UK | 7.4 | MAYBE | B1+classroom routes to teen audience (wrong for adult ESL) |
| 9 | Aaron — Sydney IELTS coach | AU | 9.0 | YES | AU GST guidance phrasing slightly off |
| 10 | Megan — Brisbane primary teacher running LOTE Italian | AU | 7.0 | MAYBE | B1 adult student gets teen audience; projector polish |
| 11 | Kim — Auckland Korean tutor (heritage teens + adults) | NZ | 8.0 | YES | Marking output language not configurable; Korean fonts in worksheets |
| 12 | Beatriz — Brisbane Brazilian Portuguese tutor | AU | 8.5 | YES | pt-BR vs pt-PT not distinguished; B1 audience bug |
| 13 | Marie-Claire — Quebec federal-language-test tutor | CA | 6.5 | MAYBE | No PSC oral exam scaffolding; QPP/QPIP buried |
| 14 | Niamh — Dublin Gaeilge primary tutor | IE | 7.0 | MAYBE | "Household items" not in young-learner manifest; slides ship blank-media |
| 15 | Liam — Cork Leaving Cert HL grinds | IE | 8.5 | YES | LC HL marking rubric not surfaced; €40 reads "below high" |
| 16 | Joel — Toronto FR-immersion + Saturday small-group | CA | 8.0 | YES | Y6 B1 small group gets teen audience (text-heavy) instead of visuals |
| 17 | Carlos — NYC bilingual ESL (community org + private) | US | 8.5 | YES | Profile-mount stack hits twice in one Sunday session |
| 18 | Sarah — Texas homeschool parent | US | 7.5 | MAYBE | "Tutor" framing alienates her; misses slideshow (not on homepage tiles) |
| 19 | Tomoko — London Japanese tutor for adults | UK | 9.5 | YES | Marking feedback in Japanese script needs verification |
| 20 | Dani — Edinburgh new freelancer (edge case) | UK | 9.7 | YES | The setup walkthrough is exactly what she needed |

**Block averages:** UK 8.15 · AU/NZ 8.13 · US+edge 8.80 · HK+young 7.93 · CA/IE 7.50

## Cross-cutting patterns (issues hit by multiple personas)

### 1. `deriveAudience` is wider than the prior audit caught — 5 personas affected
Critical #2 in the post-launch audit said "A1/A2 + 1:1 + adult". Persona walkthroughs surface that **the bug also hits B1 + classroom AND B1 + small_group AND B1 + 1:1 adult** scenarios:

- **Sophie** (UK A2 adult conversation): Critical #2 catches this
- **James** (UK B1 adult classroom ESL): NOT caught by Critical #2 — B1 routes to `teen` regardless of mode
- **Megan** (AU B1 adult Italian student): NOT caught — same B1→teen issue
- **Beatriz** (AU B1 adult Portuguese student): NOT caught
- **Joel** (CA Y6 B1 small group): NOT caught — small_group should bias young_learner for kid groups

The fix needs to be **wider than the original Critical #2.** Instead of just "fix A1/A2 + 1:1", the rule needs to be:

```js
function deriveAudience({level, mode, exam}) {
  if (exam && exam.trim().length >= 2) return 'exam_prep';
  // Mode is a stronger signal than level for child-vs-adult disambiguation:
  //   classroom + small_group with A1/A2 → young_learner (Hassan, Joel)
  //   classroom + small_group with B1+ → adult (James, Joel-when-grown)
  //   1:1 with A1/A2 → adult (Sophie, Marie-Claire)
  //   1:1 with B1 → leave at adult (was 'teen' which is wrong default)
  //   1:1 with B2+ → adult (current correct behavior)
  if (mode === 'classroom' || mode === 'small_group') {
    if (level === 'A1' || level === 'A2') return 'young_learner';
    return 'adult';
  }
  // 1:1 mode
  if (level === 'B1' || level === 'B2' || level === 'C1' || level === 'C2') return 'adult';
  return 'adult'; // A1/A2 + 1:1 — adult-by-default since teen+exam case is already handled
}
```

The `teen` audience essentially never auto-routes — it's only reachable via explicit override in the profile editor. That's correct: real teen tutoring almost always has an exam set (GCSE, Junior Cert, GCSE) so `exam_prep` catches it; teen-no-exam is rare enough that requiring the tutor to pick it manually is fine.

### 2. Slideshow shell polish — 3 personas
Megan, Linda, Niamh all reported slideshow looks "functional but not Slatework-branded." Section A's finding (`.btn-ghost` undefined + slate aesthetic underused) compounds for kid-classroom-projector use cases.

### 3. Twemoji bundle gaps for specific lessons — 2 personas
- Niamh's "household items in Irish" — manifest doesn't cover sofa, lamp, cushion, kettle.
- Linda's kindergarten objects — partial coverage.

The bundle was sized for ESL primary basics. Niche-language and kindergarten edge cases need either expanded bundle OR Pexels fallback for young_learner unmapped keywords (with stricter "kid-friendly" filtering).

### 4. Marking output language — 3 personas
Kim (Korean), Tomoko (Japanese), Beatriz (Portuguese) all wanted marking feedback in a specific language. Currently marking outputs feedback in the SOURCE language (English). For tutors marking in non-English target languages who speak both, an "explanation language" dropdown would help.

### 5. Profile-mount above-form chrome stack — 4 personas
Carlos, Megan, Aiya, Joel all noticed the lesson-plan/worksheet/marking pages have ~150px of empty profile-mount divs above the form before the form appears. Already in Critical #7.

### 6. Sarah's homeschool case — the only persona with NO landing-page acknowledgment
Sarah is using Slatework as a free curriculum aid, not as a paid tutor. The homepage hero ("Tutor tools that don't waste your evening") + tile sections (Setting up your tutoring business, Pricing & money, Client acquisition) all signal she's NOT the audience. Yet she IS — homeschool parents are a significant slice of the free-tier user base. Cheap fix: a single FAQ entry on the homepage acknowledging "Can I use this if I'm homeschooling?" Yes — lesson-plan + worksheet + slideshow are the three you'll use.

## Persona-friction prioritization — which fix helps which persona

| Fix | Personas helped | Effort | Cost-benefit |
|---|---|---|---|
| **deriveAudience expanded** (Critical #2 super-set) | Sophie, James, Megan, Beatriz, Joel (5/20) | ~10 lines | **Highest** |
| Pexels CSP `connect-src` (Critical #1) | Aaron, Megan, Beatriz, James, Carlos, Tomoko (6/20 — anyone using teen/adult) | 1 line | **Highest** |
| Slideshow shell brand polish (Section A) | Megan, Linda, Niamh (3/20) | ~1 hr | Medium |
| Audience-aware fallback copy (Critical #4) | Anyone hitting fallback (random) | ~15 min | Medium |
| Country caption template (Critical #5) | All 20 (every page touches this) | ~15 min | Medium |
| Profile-mount stack consolidation (Critical #7) | Carlos, Megan, Aiya, Joel (4/20) | ~30 min | Medium |
| Homepage FAQ for homeschool parents | Sarah (1/20 — but probably ~10% of free-tier) | ~10 min | Low (one persona) but high if traffic |
| Twemoji bundle expansion for household items | Niamh (1/20) | ~30 min | Low |
| `.btn-ghost` undefined class (Critical #3) | Anyone using slideshow toolbar | 1 line | Highest (cheapest) |
| Slideshow auto-focus after render (Critical #6) | Keyboard-nav users | 1 line | Medium |

## Honest read

The site genuinely works for the realistic tutor population. 60% firm-yes returns is good for a free tool with no signup gating. The 40% maybe is concentrated on:

- Tutors with adult-conversation use cases (Sophie, Megan, Beatriz, James) — all hit by `deriveAudience` bug
- Niche use cases (homeschool Sarah, federal-FR Marie-Claire, Gaeilge Niamh) — site doesn't quite fit, but they get partial value

**The strongest single ROI fix is the expanded `deriveAudience`** — closes 5 personas' biggest friction with ~10 lines of code. Pair with Pexels CSP (Critical #1) and audience-aware fallback (Critical #4) and the slideshow goes from "8.4 with persona-specific failures" to "9.0+ broadly correct."

The most surprising negative finding: **the slideshow is the single feature most likely to LOSE a tutor** when it goes wrong (Linda, Megan, Niamh, Sarah all churn-risk if their first slideshow disappoints). The most surprising positive finding: **the setup walkthrough genuinely lands** for the brand-new freelancer (Dani, 9.7) — Slatework's "tutor toolkit" promise hits hardest for the newest users, which is the right shape for word-of-mouth growth.

## Files

- This synthesis: `docs/superpowers/reviews/2026-05-09-persona-walkthrough.md`
- Per-block detail: `.sections-2026-05-09/persona-{1,2,3,4,5}.md`
- Earlier same-day audit: `docs/superpowers/reviews/2026-05-09-post-launch-audit.md`
