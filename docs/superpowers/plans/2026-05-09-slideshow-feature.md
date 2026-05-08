# Slideshow Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the lesson-plan slideshow extension feature (Phase G of the 2026-05-09 spec) that turns a generated lesson plan into an 8-slide audience-tailored deck previewable in-browser and exportable as `.pptx`.

**Architecture:** A single Cloudflare Pages Function (`functions/api/slideshow.js`) calls Anthropic to convert a lesson-plan markdown into structured slide JSON containing the primary audience deck plus `alt_audiences` overrides. Client-side rendering and audience switching happen with vanilla JS + scoped CSS. Images come from a curated SVG bundle for `young_learner` audiences (no external API), Pexels search for `teen`/`adult`, and minimal images for `exam_prep`. Export uses PptxGenJS loaded via cdnjs `<script>` tag with SRI hash, mirroring the mammoth.js@1.7.2 pattern at `src/lib/file-extract.js:14-20` (commit `3c8ffc0`).

**Tech Stack:** Vanilla HTML/CSS/JS, Cloudflare Pages Functions, Anthropic API, PptxGenJS (cdnjs+SRI), Pexels API

**Prerequisites:** Phases A–F of `2026-05-09-profile-and-ux-cleanup.md` plan complete and deployed. Specifically:
- `src/lib/profile.js` exists exposing `SW.Profile.getCurrentStudent()`, `SW.Profile.deriveAudience({level, mode, exam})`, and the rest of the profile API.
- `lesson-plan.html` is profile-aware (Phase C) and the result panel `#result` contains a `<section class="extensions" hidden></section>` placeholder block that this plan will populate.
- `src/lib/page-lesson-plan.js` already wires the lesson-plan POST and renders Markdown into `#result`.
- `_headers` already contains `script-src 'self' 'inline-speculation-rules' https://static.cloudflareinsights.com https://cdnjs.cloudflare.com https://unpkg.com`. This plan adds **only** to `connect-src` and `img-src` (it does NOT loosen `script-src`; PptxGenJS is added under the existing cdnjs allowance).

---

## File structure

| File | Action | Responsibility |
|---|---|---|
| `functions/api/slideshow.js` | Create | POST endpoint: validates input, applies rate-limit, calls Anthropic with the slideshow system prompt, validates response shape, falls back to a static default deck on validation failure, returns slide JSON + `alt_audiences`. |
| `src/lib/slideshow-render.js` | Create | Client-side renderer: parses server response, builds slide DOM, runs the audience switcher (uses `alt_audiences` — no second API call), keyboard nav (← → Space Enter Esc), respects `prefers-reduced-motion`, exposes `Slatework.Slideshow.render(container, response, opts)`. |
| `src/lib/slideshow-images.js` | Create | Image source resolver: matches slide `image_keywords` to local SVG bundle for `young_learner` (uses `manifest.json`); calls Pexels `/v1/search` for `teen`/`adult`; returns empty for `exam_prep`. Also exposes a tutor swap-out hook re-using the `attachFileDrop` flow from `src/lib/file-extract.js`. |
| `src/lib/slideshow-export.js` | Create | PptxGenJS loader (cdnjs `<script>` tag with SRI) + `export(response, audience, opts)` that maps slide JSON → PptxGenJS API calls → triggers a `.pptx` download. |
| `functions/api/pexels.js` | Create | Server-side Pexels proxy: keeps `PEXELS_API_KEY` off the client, applies its own per-IP/global rate limit, returns `{photos:[{id,src,alt,photographer,photographer_url}]}`. |
| `assets/illustrations/young-learner/manifest.json` | Create | Maps lowercase keyword → relative SVG file path. |
| `assets/illustrations/young-learner/CREDITS.md` | Create | Storyset attribution + per-illustration license note. |
| `assets/illustrations/young-learner/*.svg` | Create | Curated SVG bundle: animals (~20), food (~15), family (~10), body parts (~12), action verbs (~15), school objects (~12), weather (~6), numbers/colors (~10) — total ~100 files. |
| `lesson-plan.html` | Modify | Inject the extension button block + slideshow render slot inside `#result`. Add the `slideshow-render.js` / `slideshow-export.js` / `slideshow-images.js` script tags. |
| `src/lib/page-lesson-plan.js` | Modify | Wire the extension buttons after a successful lesson-plan generation; cache last-generated plan markdown in module-scope variable; call `Slatework.Slideshow.generate(...)` → `Slatework.Slideshow.render(...)`. |
| `_headers` | Modify | Add `https://images.pexels.com` to `img-src`. Add cache-immutable rule for `/assets/illustrations/young-learner/*`. (NO change to `script-src`; cdnjs is already allowed.) |
| `privacy.html` | Modify | Augment the existing AI-tool privacy section: a single sentence explaining that slide image keywords (NOT student data) are sent to Pexels for adult/teen audiences. |

---

## Phase G.1 — Server-side slideshow endpoint

### Task 1: Anthropic system prompt + endpoint scaffold

**Files:**
- Create: `functions/api/slideshow.js`

- [ ] **Step 1: Write the failing integration test (browser console assert)**

Open the deployed site (or `wrangler pages dev`) in a browser. Open DevTools console. Paste:

```js
(async () => {
  const r = await fetch('/api/slideshow', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      lesson_plan_markdown: '## Lesson at a glance\nA1 farm animals — vocabulary practice.\n\n## Warmup (5 min)\nShow flashcards.',
      audience_profile: 'young_learner',
      target_language: 'English',
      source_language: 'Cantonese',
      level: 'A1',
      mode: 'one_to_one',
      exam: ''
    })
  });
  const data = await r.json();
  console.assert(r.ok, 'expected 200, got', r.status, data);
  console.assert(Array.isArray(data.slides) && data.slides.length === 8, 'expected 8 slides, got', data.slides && data.slides.length);
  console.assert(data.metadata && data.metadata.inferred_audience === 'young_learner', 'metadata audience missing/wrong');
  console.assert(data.alt_audiences && data.alt_audiences.adult, 'alt_audiences.adult missing');
  console.log('OK', data);
})();
```

Expected: assertion fails with `404` because the endpoint doesn't exist yet.

- [ ] **Step 2: Run to verify failure**

Reload page. Run the snippet. Confirm `r.status === 404`.

- [ ] **Step 3: Write the minimal endpoint**

Create `functions/api/slideshow.js`:

```js
// POST /api/slideshow
// Turns a generated lesson-plan markdown into a structured slide deck.

import { jsonResponse, ipHash, rateCheck, callClaude, corsPreflight, methodNotAllowed, userFacingClaudeError } from "../_lib.js";

export const onRequestOptions = () => corsPreflight('POST');
export const onRequest = () => methodNotAllowed('POST');

const SYSTEM_PROMPT = [
  "You are a senior language teacher and presentation designer. Given a generated lesson-plan markdown, an audience profile (young_learner / teen / adult / exam_prep), the target/source languages, the CEFR level, and (optionally) an exam target, produce an 8-slide deck JSON for a 60-minute lesson.",
  "",
  "Output STRICT JSON only — no Markdown, no commentary, no code fences. The shape is:",
  "",
  "{",
  '  "slides": [Slide, Slide, ...8 slides total],',
  '  "metadata": {',
  '    "inferred_audience": "young_learner" | "teen" | "adult" | "exam_prep",',
  '    "inferred_image_density": "high" | "medium" | "low" | "minimal",',
  '    "deck_style": "primary" | "teen" | "adult" | "exam"',
  '  },',
  '  "alt_audiences": {',
  '    "young_learner": { "tone_overrides": {...by-slide-id}, "image_density": "high" },',
  '    "teen":          { "tone_overrides": {...by-slide-id}, "image_density": "medium" },',
  '    "adult":         { "tone_overrides": {...by-slide-id}, "image_density": "low" },',
  '    "exam_prep":     { "tone_overrides": {...by-slide-id}, "image_density": "minimal" }',
  '  }',
  "}",
  "",
  "Slide shape:",
  "{",
  '  "id": "title" | "at_a_glance" | "warmup" | "core" | "practice" | "wrapup" | "exit_ticket" | "differentiation",',
  '  "type": "title" | "objectives" | "vocab" | "teach" | "practice" | "wrapup" | "exit" | "notes",',
  '  "title": "slide title (<=80 chars)",',
  '  "subtitle": "optional sub-headline (<=120 chars)",',
  '  "body": "string with \\n line-breaks; for vocab slides, one item per line",',
  '  "image_keywords": ["1-3 simple nouns suitable for image search; empty array for text-only slides"],',
  '  "duration_min": 0 | 5 | 10 | 20',
  "}",
  "",
  "Slide order is fixed:",
  "1. title             — Lesson title + level badge + tutor name placeholder",
  "2. at_a_glance       — objectives + 60-min split",
  "3. warmup            — 5 min, content + image",
  "4. core              — 20 min, teaching block + image",
  "5. practice          — 20 min, production task + image",
  "6. wrapup            — 10 min, recap + assignment (text)",
  "7. exit_ticket       — single check-for-understanding question (text)",
  "8. differentiation   — tutor-only notes for adjustment up/down (text)",
  "",
  "Audience rules:",
  "- young_learner: simple words (CEFR A1 wordlist), short sentences (<=8 words), warm/friendly tone, image_keywords MUST be concrete nouns suited to a primary classroom (cow, apple, family, jump, school bag, sun, three, red).",
  "- teen: tone is direct and slightly playful; image_keywords lean toward photo subjects (school, friends, sports, music, city).",
  "- adult: tone is professional and concise; image_keywords lean abstract or workplace (meeting, coffee, travel, office).",
  "- exam_prep: image_keywords MUST be EMPTY for every slide except 'warmup' (which gets ONE keyword). Prioritise model answers, prompt cards, scoring rubric language.",
  "",
  "alt_audiences MUST contain tone_overrides keyed by slide id, only for slides whose body would change wording for that audience. Keep each override short — a substitute body string. Image density tells the client how many image_keywords to render per slide for that audience.",
  "",
  "If a mode of 'classroom' is provided, increase font scale planning notes appear in differentiation slide; do not change other slides.",
  "",
  "If an exam target is provided, calibrate vocabulary, rubric language, and warmup style to that exam.",
  "",
  "Do NOT include student names, locations, or anything resembling PII anywhere in the deck."
].join("\n");

const DEFAULT_MODEL = "claude-sonnet-4-6";
const PER_IP_DAILY = 20;
const GLOBAL_DAILY = 1500;

const VALID_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const VALID_MODES  = ['one_to_one', 'small_group', 'classroom'];
const VALID_AUDIENCES = ['young_learner', 'teen', 'adult', 'exam_prep'];
const REQUIRED_SLIDE_IDS = ['title','at_a_glance','warmup','core','practice','wrapup','exit_ticket','differentiation'];
const MAX_PLAN_LEN = 12000; // hard cap on lesson-plan markdown body

// Static fallback deck used when the model output fails validation. Generic
// enough to be safe at A1; the client overlays the actual lesson title.
function fallbackDeck(audience, target, level, lessonTitle) {
  const mk = (id, type, title, body, kw = [], dur = 0, sub = '') => ({
    id, type, title, subtitle: sub, body, image_keywords: kw, duration_min: dur
  });
  const tone = audience === 'young_learner' ? 'high'
             : audience === 'teen' ? 'medium'
             : audience === 'adult' ? 'low' : 'minimal';
  return {
    slides: [
      mk('title','title', lessonTitle || `${target} lesson — ${level}`,
         '', [], 0, `${target} · ${level}`),
      mk('at_a_glance','objectives','Today we will',
         '• Warm up\n• Learn new words\n• Practise\n• Wrap up', [], 0),
      mk('warmup','vocab','Warm-up',
         'Look. Say the word.', audience === 'young_learner' ? ['hello','smile'] :
         audience === 'exam_prep' ? ['notebook'] : ['classroom'], 5),
      mk('core','teach','New words / new structure',
         'Listen. Repeat. Try.', audience === 'young_learner' ? ['teacher','student'] :
         audience === 'exam_prep' ? [] : ['discussion'], 20),
      mk('practice','practice','Your turn',
         'Work in pairs. Share an example.', audience === 'young_learner' ? ['friends'] :
         audience === 'exam_prep' ? [] : ['pair work'], 20),
      mk('wrapup','wrapup','Wrap-up',
         'What did we learn?\nHomework: write 3 sentences.', [], 10),
      mk('exit_ticket','exit','Exit ticket',
         'Write one sentence using today\'s structure.', [], 0),
      mk('differentiation','notes','Tutor notes',
         'If too easy: add a tense.\nIf too hard: model two more examples.', [], 0),
    ],
    metadata: {
      inferred_audience: audience,
      inferred_image_density: tone,
      deck_style: audience === 'young_learner' ? 'primary' :
                  audience === 'exam_prep' ? 'exam' : audience
    },
    alt_audiences: VALID_AUDIENCES.reduce((acc, a) => {
      acc[a] = { tone_overrides: {}, image_density:
        a === 'young_learner' ? 'high' :
        a === 'teen' ? 'medium' :
        a === 'adult' ? 'low' : 'minimal'
      };
      return acc;
    }, {}),
    fallback_used: true
  };
}

// Validate the model's JSON shape. Returns null on success, or a string
// reason on failure (used to log + decide on fallback).
function validateDeck(deck) {
  if (!deck || typeof deck !== 'object') return 'not an object';
  if (!Array.isArray(deck.slides) || deck.slides.length !== 8) return 'slides must be array of length 8';
  for (let i = 0; i < 8; i++) {
    const s = deck.slides[i];
    if (!s || typeof s !== 'object') return `slide ${i} not object`;
    if (s.id !== REQUIRED_SLIDE_IDS[i]) return `slide ${i} id is "${s.id}", expected "${REQUIRED_SLIDE_IDS[i]}"`;
    if (typeof s.title !== 'string') return `slide ${i} title not string`;
    if (typeof s.body !== 'string') return `slide ${i} body not string`;
    if (!Array.isArray(s.image_keywords)) return `slide ${i} image_keywords not array`;
    if (s.image_keywords.length > 5) return `slide ${i} too many image_keywords`;
    for (const k of s.image_keywords) {
      if (typeof k !== 'string' || k.length > 40) return `slide ${i} bad keyword`;
    }
  }
  if (!deck.metadata || !VALID_AUDIENCES.includes(deck.metadata.inferred_audience)) return 'metadata.inferred_audience invalid';
  if (!deck.alt_audiences || typeof deck.alt_audiences !== 'object') return 'alt_audiences missing';
  for (const a of VALID_AUDIENCES) {
    if (!deck.alt_audiences[a]) return `alt_audiences.${a} missing`;
  }
  return null;
}

// Trim whitespace + strip code fences if the model wrapped JSON in ```json blocks.
function extractJson(raw) {
  const t = (raw || '').trim();
  const fence = t.match(/^```(?:json)?\s*([\s\S]*?)```$/);
  return fence ? fence[1].trim() : t;
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); }
  catch { return jsonResponse({ error: 'Invalid request format.' }, 400); }

  const planMd = String(body.lesson_plan_markdown || '').trim();
  const audience = String(body.audience_profile || '').trim();
  const target = String(body.target_language || '').trim();
  const source = String(body.source_language || 'English').trim();
  const level = String(body.level || '').trim().toUpperCase();
  const mode = String(body.mode || 'one_to_one').trim();
  const exam = String(body.exam || '').trim();

  if (!planMd || planMd.length < 50) return jsonResponse({ error: 'lesson_plan_markdown missing or too short.' }, 400);
  if (planMd.length > MAX_PLAN_LEN) return jsonResponse({ error: `lesson_plan_markdown too long (max ${MAX_PLAN_LEN} chars).` }, 400);
  if (!VALID_AUDIENCES.includes(audience)) return jsonResponse({ error: 'audience_profile must be one of young_learner / teen / adult / exam_prep.' }, 400);
  if (!target) return jsonResponse({ error: 'Missing target_language.' }, 400);
  if (!VALID_LEVELS.includes(level)) return jsonResponse({ error: 'Level must be one of A1, A2, B1, B2, C1, C2.' }, 400);
  if (!VALID_MODES.includes(mode)) return jsonResponse({ error: 'Mode must be one_to_one, small_group, or classroom.' }, 400);
  if (exam.length > 200) return jsonResponse({ error: 'Exam / curriculum target too long (200 chars max).' }, 400);

  if (!env.ANTHROPIC_API_KEY) return jsonResponse({ error: 'Service is being configured. Try again in a few minutes.' }, 503);

  const fp = await ipHash(request);
  const rate = await rateCheck(env, fp, 'slideshow', PER_IP_DAILY, GLOBAL_DAILY);
  if (!rate.ok) {
    const headers = rate.retryAfterSec ? { 'Retry-After': String(rate.retryAfterSec) } : {};
    return jsonResponse({ error: rate.reason }, rate.status || 429, headers);
  }

  const userMsgLines = [
    `Audience profile: ${audience}`,
    `Target language: ${target}`,
    `Source language: ${source}`,
    `CEFR level: ${level}`,
    `Mode: ${mode.replace('_', ' ')}`,
  ];
  if (exam) userMsgLines.push(`Exam / curriculum target: ${exam}`);
  userMsgLines.push('', 'Lesson plan markdown:', planMd);

  // Try a guessed lesson title for the fallback deck (parsed from the first H2).
  const titleMatch = planMd.match(/^##\s+(.+)$/m);
  const lessonTitle = titleMatch ? titleMatch[1].trim().slice(0, 80) : `${target} lesson`;

  try {
    const model = env.ANTHROPIC_MODEL || DEFAULT_MODEL;
    const raw = await callClaude(env, {
      model,
      system: SYSTEM_PROMPT,
      user: userMsgLines.join('\n'),
      max_tokens: 3000
    });
    let deck;
    try { deck = JSON.parse(extractJson(raw)); }
    catch (e) {
      console.error('[slideshow] JSON.parse failed:', e.message, 'rawHead=', (raw || '').slice(0, 200));
      return jsonResponse(fallbackDeck(audience, target, level, lessonTitle), 200);
    }
    const reason = validateDeck(deck);
    if (reason) {
      console.error('[slideshow] validation failed:', reason);
      return jsonResponse(fallbackDeck(audience, target, level, lessonTitle), 200);
    }
    return jsonResponse(deck, 200);
  } catch (err) {
    const { error, status } = userFacingClaudeError(err, 'generate the slideshow');
    return jsonResponse({ error }, status);
  }
}
```

- [ ] **Step 4: Run integration test, expect pass**

Reload page. Run the snippet from Step 1. Verify the assert lines all pass and `data.slides.length === 8`.

If `wrangler pages dev` is the runtime, set `ANTHROPIC_API_KEY` in `.dev.vars` first. If KV `RATE_LIMITS` is unbound locally, `_lib.js` already returns `{ok:true, reason:'KV not configured (dev)'}`.

- [ ] **Step 5: Commit**

```bash
git add functions/api/slideshow.js
git commit -m "feat(slideshow): add /api/slideshow endpoint with shape validation and fallback deck"
```

### Task 2: Server-side validation rejection paths

**Files:**
- Modify: `functions/api/slideshow.js` (no code change — exercise existing validators)

- [ ] **Step 1: Write failing test for short input rejection**

Browser console:

```js
(async () => {
  const r = await fetch('/api/slideshow', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      lesson_plan_markdown: 'too short',
      audience_profile: 'young_learner',
      target_language: 'English',
      level: 'A1',
      mode: 'one_to_one'
    })
  });
  const data = await r.json();
  console.assert(r.status === 400, 'expected 400, got', r.status);
  console.assert(/too short/i.test(data.error), 'expected "too short" in error, got', data.error);
})();
```

- [ ] **Step 2: Run, expect pass on first try (validators already in code)**

Confirm both asserts pass.

- [ ] **Step 3: Write failing test for invalid audience**

```js
(async () => {
  const r = await fetch('/api/slideshow', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      lesson_plan_markdown: 'a'.repeat(80),
      audience_profile: 'banana',
      target_language: 'English',
      level: 'A1',
      mode: 'one_to_one'
    })
  });
  console.assert(r.status === 400, 'expected 400, got', r.status);
})();
```

- [ ] **Step 4: Run, confirm 400.**

- [ ] **Step 5: No new commit (validation paths already covered by Task 1 commit).**

---

## Phase G.2 — Curated illustration bundle (young learner)

### Task 3: Bundle download + manifest

**Files:**
- Create: `assets/illustrations/young-learner/manifest.json`
- Create: `assets/illustrations/young-learner/CREDITS.md`
- Create: `assets/illustrations/young-learner/*.svg` (~100 files)

- [ ] **Step 1: Write the failing test for manifest existence**

Save to `tests/slideshow-bundle.test.js` (a new file — Slatework's existing browser-runnable smoke pattern):

```js
// Browser console smoke test for the young-learner bundle.
(async () => {
  const m = await fetch('/assets/illustrations/young-learner/manifest.json').then(r => r.json());
  console.assert(m && typeof m === 'object', 'manifest is not an object');
  console.assert(Array.isArray(m.illustrations), 'manifest.illustrations not array');
  console.assert(m.illustrations.length >= 80, `expected >=80 illustrations, got ${m.illustrations.length}`);
  // Spot-check the structure of one entry.
  const sample = m.illustrations[0];
  console.assert(sample.file && sample.keywords && Array.isArray(sample.keywords), 'bad entry shape');
  // HEAD-check that the file resolves.
  const head = await fetch('/assets/illustrations/young-learner/' + sample.file, { method: 'HEAD' });
  console.assert(head.ok, `missing svg file ${sample.file}`);
  console.log('OK', m.illustrations.length, 'illustrations');
})();
```

Save the snippet to `tests/slideshow-bundle.test.js` so future hands can re-run it. Run by pasting into DevTools.

- [ ] **Step 2: Run test, expect 404 on manifest.json**

Confirm fail.

- [ ] **Step 3: Source illustrations from Storyset (default per spec §6.3)**

Procedure:
1. Visit `https://storyset.com` → People pack OR Illustrations pack with consistent style. Pick ONE pack to keep style coherent.
2. Download SVG files individually for the categories listed in the spec. Targets:
   - Animals (~20): cat, dog, cow, pig, sheep, chicken, duck, horse, rabbit, mouse, bird, fish, bear, lion, tiger, elephant, monkey, frog, bee, butterfly
   - Food (~15): apple, banana, orange, bread, milk, water, rice, noodle, soup, cake, egg, cheese, chocolate, ice cream, pizza
   - Family (~10): mother, father, sister, brother, baby, grandmother, grandfather, family, friend, teacher
   - Body parts (~12): head, hair, eye, nose, mouth, ear, hand, foot, arm, leg, finger, tooth
   - Action verbs (~15): run, jump, walk, sit, stand, sleep, eat, drink, read, write, sing, dance, play, smile, listen
   - School (~12): pencil, pen, paper, book, notebook, ruler, eraser, scissors, glue, bag, desk, chair
   - Weather (~6): sun, cloud, rain, snow, wind, rainbow
   - Numbers + colors (~10): one, two, three, four, five, red, blue, yellow, green, black
4. Rename each file to `kebab-case.svg` (e.g. `farm-cow.svg`, `school-pencil.svg`). Strip embedded CSS where it conflicts with site styles (Storyset SVGs may carry `<style>` blocks — keep them, the `<script>` tags must be removed).
5. Drop into `assets/illustrations/young-learner/`.

If you choose Open Doodles (CC0, no attribution) instead, skip the pack-coherence rule and pull what you need from `https://www.opendoodles.com/`. Default is Storyset for breadth.

- [ ] **Step 4: Generate `manifest.json`**

Schema:

```json
{
  "schema": 1,
  "illustrations": [
    { "file": "farm-cow.svg",       "keywords": ["cow", "farm", "animal"]      },
    { "file": "farm-pig.svg",       "keywords": ["pig", "farm", "animal"]      },
    { "file": "food-apple.svg",     "keywords": ["apple", "fruit", "food"]     },
    { "file": "family-mother.svg",  "keywords": ["mother", "mom", "family"]    },
    { "file": "school-pencil.svg",  "keywords": ["pencil", "school", "write"]  },
    { "file": "weather-sun.svg",    "keywords": ["sun", "weather", "hot"]      },
    { "file": "color-red.svg",      "keywords": ["red", "color"]               }
    /* ... ~100 entries total */
  ]
}
```

Generate the manifest by `Set-Location 'C:\Users\darre\slatework\assets\illustrations\young-learner'`, then `Get-ChildItem *.svg | ForEach-Object { $_.Name }` — pipe the list into a small Node/PowerShell script that emits the JSON. Author keywords manually (the file name gives one; add 1–2 synonyms).

- [ ] **Step 5: Write `CREDITS.md`**

```markdown
# Young-learner illustration bundle — credits

Source: Storyset (https://storyset.com/) — free with attribution.

Pack used: [exact pack name + URL].

Per Storyset's terms (https://storyset.com/terms), Slatework displays the
attribution string "Illustrations by Storyset" in:
1. The visible footer of the in-browser slideshow preview.
2. The notes section of every exported `.pptx` file.
3. This `CREDITS.md` file.

If a future maintainer swaps the bundle for Open Doodles (CC0), this file
should still list the source for documentation, even though attribution is
not legally required.
```

- [ ] **Step 6: Run smoke test, expect pass**

Re-run the Step 1 snippet in DevTools. Expect `OK <N> illustrations` where N >= 80.

- [ ] **Step 7: Commit**

```bash
git add assets/illustrations/young-learner/
git commit -m "feat(slideshow): add curated young-learner SVG bundle (Storyset) with manifest + credits"
```

### Task 4: `_headers` cache + img-src additions

**Files:**
- Modify: `_headers`

- [ ] **Step 1: Failing test — bundle should be cached immutable**

Browser DevTools, Network tab. Reload the page after navigating to a tutor-test URL that lazy-loads a bundle SVG (we have none yet, so this asserts via `curl`):

```bash
curl -sI https://slatework.tools/assets/illustrations/young-learner/farm-cow.svg | grep -i "cache-control"
```

Expected (failing): no rule yet → returns the default Pages 5-min cache. We want immutable.

- [ ] **Step 2: Add cache rule + Pexels CSP allowance**

Edit `_headers` two places:

(a) Top CSP line — add `https://images.pexels.com` to `img-src`:

Current:
```
img-src 'self' data: blob:;
```
New:
```
img-src 'self' data: blob: https://images.pexels.com;
```

(b) Add a new rule block at the bottom:

```
/assets/illustrations/young-learner/*
  Cache-Control: public, max-age=86400, stale-while-revalidate=604800, immutable
```

- [ ] **Step 3: Re-run header test**

After deploy/preview:
```bash
curl -sI https://slatework.tools/assets/illustrations/young-learner/farm-cow.svg | grep -i "cache-control"
```
Expected: `cache-control: public, max-age=86400, stale-while-revalidate=604800, immutable`

- [ ] **Step 4: Commit**

```bash
git add _headers
git commit -m "chore(headers): cache young-learner bundle immutable; allow images.pexels.com in CSP img-src"
```

---

## Phase G.3 — Client-side rendering

### Task 5: Slideshow render module

**Files:**
- Create: `src/lib/slideshow-render.js`

- [ ] **Step 1: Failing browser test**

Save to `tests/slideshow-render.test.js`:

```js
// Browser console smoke test. Run AFTER lesson-plan.html is updated to
// load slideshow-render.js (Task 8). Until then this fails on
// Slatework.Slideshow.render === undefined.
(async () => {
  console.assert(window.Slatework && window.Slatework.Slideshow, 'Slatework.Slideshow missing');
  const fakeResponse = {
    slides: [
      {id:'title', type:'title', title:'Farm animals', subtitle:'A1', body:'', image_keywords:[], duration_min:0},
      {id:'at_a_glance', type:'objectives', title:'Today', subtitle:'', body:'• Warm up\n• Learn\n• Practise\n• Wrap up', image_keywords:[], duration_min:0},
      {id:'warmup', type:'vocab', title:'Warm-up', subtitle:'', body:'Look. Say.', image_keywords:['cow'], duration_min:5},
      {id:'core', type:'teach', title:'Core', subtitle:'', body:'Listen.', image_keywords:['farm'], duration_min:20},
      {id:'practice', type:'practice', title:'Practice', subtitle:'', body:'Pair work.', image_keywords:['friends'], duration_min:20},
      {id:'wrapup', type:'wrapup', title:'Wrap-up', subtitle:'', body:'What did we learn?', image_keywords:[], duration_min:10},
      {id:'exit_ticket', type:'exit', title:'Exit ticket', subtitle:'', body:'Write one sentence.', image_keywords:[], duration_min:0},
      {id:'differentiation', type:'notes', title:'Tutor notes', subtitle:'', body:'If too easy: ...', image_keywords:[], duration_min:0},
    ],
    metadata: { inferred_audience: 'young_learner', inferred_image_density: 'high', deck_style: 'primary' },
    alt_audiences: {
      young_learner: { tone_overrides: {}, image_density: 'high' },
      teen:          { tone_overrides: {}, image_density: 'medium' },
      adult:         { tone_overrides: {}, image_density: 'low' },
      exam_prep:     { tone_overrides: {}, image_density: 'minimal' }
    }
  };
  const host = document.createElement('div');
  document.body.appendChild(host);
  await window.Slatework.Slideshow.render(host, fakeResponse, { tutorName: 'Sarah' });
  const slides = host.querySelectorAll('.slideshow-slide');
  console.assert(slides.length === 8, `expected 8 slides, got ${slides.length}`);
  // Audience switcher present
  console.assert(host.querySelector('.slideshow-audience'), 'audience switcher missing');
  // Keyboard nav
  host.querySelector('.slideshow').focus();
  host.querySelector('.slideshow').dispatchEvent(new KeyboardEvent('keydown', {key:'ArrowRight', bubbles:true}));
  console.assert(host.querySelector('.slideshow-slide.is-active').dataset.idx === '1', 'arrow-right did not advance');
  host.remove();
  console.log('OK render smoke');
})();
```

- [ ] **Step 2: Run test, expect failure on `Slatework.Slideshow undefined`.**

- [ ] **Step 3: Write `src/lib/slideshow-render.js`**

```js
// Self-installing slideshow render module. Loads via <script> tag from
// lesson-plan.html (added in Task 8). Exposes:
//   Slatework.Slideshow.render(container, response, opts)
//   Slatework.Slideshow.generate(payload)  (calls /api/slideshow)
//
// `opts` accepted: { tutorName?: string, attributionText?: string, onAudienceChange?: fn }
//
// Audience switching uses the cached `alt_audiences` overrides from the
// response — no second API call.
//
// Image source delegated to slideshow-images.js (Task 6).

(() => {
  const SW = (window.Slatework = window.Slatework || {});
  const Slideshow = (SW.Slideshow = SW.Slideshow || {});

  const AUDIENCE_LABELS = {
    young_learner: 'Young learner',
    teen: 'Teen',
    adult: 'Adult',
    exam_prep: 'Exam prep'
  };

  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function bodyToHtml(body) {
    // Simple newline → <br/> + bullet detection. Markdown is intentionally
    // not full-fat here — slide bodies are short and the model emits plain
    // strings.
    const lines = String(body || '').split('\n');
    const parts = [];
    let inList = false;
    for (const line of lines) {
      const m = line.match(/^\s*[•\-\*]\s+(.+)$/);
      if (m) {
        if (!inList) { parts.push('<ul>'); inList = true; }
        parts.push('<li>' + escHtml(m[1]) + '</li>');
      } else {
        if (inList) { parts.push('</ul>'); inList = false; }
        if (line.trim()) parts.push('<p>' + escHtml(line) + '</p>');
      }
    }
    if (inList) parts.push('</ul>');
    return parts.join('');
  }

  function applyOverride(slide, override) {
    if (!override) return slide;
    return Object.assign({}, slide, override);
  }

  // Decide how many image keywords to actually render based on density.
  function keywordsForDensity(slide, density) {
    if (!Array.isArray(slide.image_keywords)) return [];
    const all = slide.image_keywords;
    switch (density) {
      case 'high':    return all.slice(0, 3);
      case 'medium':  return all.slice(0, 2);
      case 'low':     return all.slice(0, 1);
      case 'minimal': return slide.id === 'warmup' ? all.slice(0, 1) : [];
      default:        return all.slice(0, 1);
    }
  }

  async function renderSlideMedia(slideEl, slide, audience, density) {
    const kw = keywordsForDensity(slide, density);
    if (!kw.length || !SW.SlideshowImages) return;
    const media = slideEl.querySelector('.slideshow-slide-media');
    media.innerHTML = '';
    for (const k of kw) {
      try {
        const url = await SW.SlideshowImages.resolve({ keyword: k, audience });
        if (!url) continue;
        const img = document.createElement('img');
        img.src = url.href;
        img.alt = url.alt || k;
        img.loading = 'lazy';
        img.decoding = 'async';
        if (url.attribution) img.dataset.attribution = url.attribution;
        media.appendChild(img);
      } catch (e) {
        // Silent: a missing image must never break the deck.
        console.warn('[slideshow] image resolve failed', k, e);
      }
    }
  }

  function buildShellHtml(audience, audiences, attributionText) {
    const opts = audiences.map(a =>
      `<option value="${a}"${a === audience ? ' selected' : ''}>${AUDIENCE_LABELS[a]}</option>`
    ).join('');
    return `
      <div class="slideshow" tabindex="0" role="region" aria-roledescription="slideshow" aria-label="Lesson slideshow preview">
        <header class="slideshow-controls">
          <label class="slideshow-audience">
            <span>Audience</span>
            <select aria-label="Audience profile">${opts}</select>
          </label>
          <span class="slideshow-counter" aria-live="polite">1 / 8</span>
          <div class="slideshow-actions">
            <button type="button" class="slideshow-prev btn btn-ghost" aria-label="Previous slide">&larr;</button>
            <button type="button" class="slideshow-next btn btn-ghost" aria-label="Next slide">&rarr;</button>
            <button type="button" class="slideshow-export btn btn-primary">Download .pptx</button>
          </div>
        </header>
        <div class="slideshow-stage" aria-live="polite"></div>
        <footer class="slideshow-attribution">
          <small>${escHtml(attributionText || 'Illustrations by Storyset.')}</small>
        </footer>
      </div>`;
  }

  function buildSlideHtml(slide, idx) {
    const dur = slide.duration_min ? `<span class="slideshow-slide-duration">${slide.duration_min} min</span>` : '';
    const sub = slide.subtitle ? `<p class="slideshow-slide-sub">${escHtml(slide.subtitle)}</p>` : '';
    return `
      <article class="slideshow-slide${idx === 0 ? ' is-active' : ''}" data-idx="${idx}" data-id="${escHtml(slide.id)}" aria-hidden="${idx === 0 ? 'false' : 'true'}">
        <div class="slideshow-slide-text">
          <h3 class="slideshow-slide-title">${escHtml(slide.title)}${dur}</h3>
          ${sub}
          <div class="slideshow-slide-body">${bodyToHtml(slide.body)}</div>
        </div>
        <div class="slideshow-slide-media" aria-hidden="true"></div>
      </article>`;
  }

  Slideshow.render = async function render(container, response, opts) {
    opts = opts || {};
    if (!container || !response || !Array.isArray(response.slides)) {
      throw new Error('Slatework.Slideshow.render: bad arguments');
    }
    const audiences = ['young_learner','teen','adult','exam_prep'];
    let audience = (response.metadata && response.metadata.inferred_audience) || 'adult';
    container.innerHTML = buildShellHtml(audience, audiences, opts.attributionText);
    const stage = container.querySelector('.slideshow-stage');
    const counter = container.querySelector('.slideshow-counter');
    const root = container.querySelector('.slideshow');

    function densityFor(a) {
      const m = response.metadata || {};
      if (a === m.inferred_audience) return m.inferred_image_density;
      return (response.alt_audiences && response.alt_audiences[a] && response.alt_audiences[a].image_density) || 'low';
    }

    async function renderForAudience(a) {
      audience = a;
      stage.innerHTML = response.slides.map((s, i) => {
        const override = response.alt_audiences && response.alt_audiences[a] &&
                         response.alt_audiences[a].tone_overrides &&
                         response.alt_audiences[a].tone_overrides[s.id];
        const slide = applyOverride(s, override);
        return buildSlideHtml(slide, i);
      }).join('');
      const slideEls = stage.querySelectorAll('.slideshow-slide');
      const density = densityFor(a);
      // Resolve images in parallel, but don't block the main render — slides
      // appear immediately, images fade in as they resolve.
      response.slides.forEach((s, i) => {
        const override = response.alt_audiences && response.alt_audiences[a] &&
                         response.alt_audiences[a].tone_overrides &&
                         response.alt_audiences[a].tone_overrides[s.id];
        const slide = applyOverride(s, override);
        renderSlideMedia(slideEls[i], slide, a, density);
      });
      idx = 0;
      updateActive();
      if (typeof opts.onAudienceChange === 'function') opts.onAudienceChange(a);
    }

    let idx = 0;
    function updateActive() {
      stage.querySelectorAll('.slideshow-slide').forEach((el, i) => {
        const active = (i === idx);
        el.classList.toggle('is-active', active);
        el.setAttribute('aria-hidden', active ? 'false' : 'true');
      });
      counter.textContent = `${idx + 1} / ${response.slides.length}`;
    }
    function move(delta) {
      idx = Math.min(response.slides.length - 1, Math.max(0, idx + delta));
      updateActive();
    }

    container.querySelector('.slideshow-prev').addEventListener('click', () => move(-1));
    container.querySelector('.slideshow-next').addEventListener('click', () => move(+1));
    container.querySelector('.slideshow-audience select').addEventListener('change', (e) => {
      renderForAudience(e.target.value);
    });
    container.querySelector('.slideshow-export').addEventListener('click', async () => {
      if (SW.SlideshowExport && typeof SW.SlideshowExport.exportPptx === 'function') {
        try {
          await SW.SlideshowExport.exportPptx({
            response, audience,
            tutorName: opts.tutorName || '',
            attributionText: opts.attributionText || 'Illustrations by Storyset.'
          });
        } catch (e) {
          alert('Could not generate the .pptx file. ' + (e && e.message ? e.message : ''));
        }
      } else {
        alert('Export module not loaded.');
      }
    });

    root.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter' || e.key === 'PageDown') { e.preventDefault(); move(+1); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); move(-1); }
      else if (e.key === 'Home') { e.preventDefault(); idx = 0; updateActive(); }
      else if (e.key === 'End') { e.preventDefault(); idx = response.slides.length - 1; updateActive(); }
    });

    await renderForAudience(audience);
    return { setAudience: renderForAudience };
  };

  Slideshow.generate = async function generate(payload) {
    const r = await fetch('/api/slideshow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.error || `Slideshow API ${r.status}`);
    }
    return r.json();
  };
})();
```

- [ ] **Step 4: Add scoped CSS to `src/lib/styles.css`**

Append a new section at the end of `styles.css`:

```css
/* ----- Slideshow preview (lesson-plan extension) ----------------------- */
.slideshow {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: var(--surface);
  margin: 1.25rem 0;
  outline: none;
}
.slideshow:focus-visible { box-shadow: 0 0 0 3px var(--ring); }
.slideshow-controls {
  display: flex; flex-wrap: wrap; gap: .75rem; align-items: center;
  padding: .75rem 1rem; border-bottom: 1px solid var(--line);
  justify-content: space-between;
}
.slideshow-audience { display: flex; gap: .5rem; align-items: center; font-size: .9rem; }
.slideshow-counter { font-variant-numeric: tabular-nums; color: var(--ink-muted); }
.slideshow-actions { display: flex; gap: .5rem; }
.slideshow-stage {
  position: relative; min-height: 320px; padding: 1.5rem;
  display: grid;
}
.slideshow-slide {
  grid-area: 1 / 1; display: none;
  grid-template-columns: 1fr 1fr; gap: 1.25rem;
  align-items: start;
}
.slideshow-slide.is-active { display: grid; }
@media (max-width: 640px) {
  .slideshow-slide { grid-template-columns: 1fr; }
}
.slideshow-slide-title {
  font-size: 1.5rem; margin: 0 0 .25rem 0; display: flex; gap: .75rem; align-items: baseline;
}
.slideshow-slide-duration {
  font-size: .75rem; padding: .15rem .5rem; border-radius: 999px;
  background: var(--surface-2); color: var(--ink-muted);
}
.slideshow-slide-sub { color: var(--ink-muted); margin: 0 0 .75rem 0; }
.slideshow-slide-body p { margin: 0 0 .5rem 0; }
.slideshow-slide-body ul { margin: 0; padding-left: 1.25rem; }
.slideshow-slide-media { display: flex; flex-wrap: wrap; gap: .5rem; }
.slideshow-slide-media img {
  max-width: 100%; height: auto; max-height: 220px;
  border-radius: var(--radius-sm);
}
.slideshow-attribution {
  padding: .5rem 1rem; border-top: 1px solid var(--line);
  color: var(--ink-faint); font-size: .8rem;
}

/* Reduced-motion: do not animate slide changes. The base CSS has none, but
   any future transitions must respect this. */
@media (prefers-reduced-motion: reduce) {
  .slideshow-slide, .slideshow-slide.is-active { transition: none !important; }
}
```

- [ ] **Step 5: Bump `styles.css` version param wherever loaded**

Search the repo for `/src/lib/styles.css?v=14` and bump to `?v=15` in every HTML file. (Required because `_headers` caches CSS aggressively.)

```bash
grep -rl 'styles.css?v=14' .  # produces a list of HTML files
# Edit each file, replacing v=14 with v=15.
```

- [ ] **Step 6: Run smoke test, expect pass**

After Task 8 wires `<script src=".../slideshow-render.js?v=15">` into `lesson-plan.html`, re-run the Step 1 snippet on a real `/lesson-plan` page. For now defer to Task 8.

- [ ] **Step 7: Commit**

```bash
git add src/lib/slideshow-render.js src/lib/styles.css *.html
git commit -m "feat(slideshow): client renderer with audience switcher, keyboard nav, scoped styles"
```

### Task 6: Image source resolver

**Files:**
- Create: `src/lib/slideshow-images.js`

- [ ] **Step 1: Failing test**

Add to `tests/slideshow-images.test.js`:

```js
(async () => {
  console.assert(window.Slatework && window.Slatework.SlideshowImages, 'SlideshowImages missing');
  // young_learner → bundle hit
  const cow = await Slatework.SlideshowImages.resolve({ keyword: 'cow', audience: 'young_learner' });
  console.assert(cow && /\/assets\/illustrations\/young-learner\//.test(cow.href), 'expected bundle URL for cow young_learner, got', cow);
  // young_learner miss → null
  const miss = await Slatework.SlideshowImages.resolve({ keyword: 'qwertyzz', audience: 'young_learner' });
  console.assert(miss === null, 'expected null for miss');
  // exam_prep → null (minimal)
  const ex = await Slatework.SlideshowImages.resolve({ keyword: 'cow', audience: 'exam_prep' });
  console.assert(ex === null || /\/api\/pexels\?/.test(ex.href) === false, 'exam_prep should not pull Pexels images');
  console.log('OK images smoke');
})();
```

- [ ] **Step 2: Run, expect fail (module missing).**

- [ ] **Step 3: Write `src/lib/slideshow-images.js`**

```js
// Slatework.SlideshowImages — resolve a slide keyword to an image URL based
// on audience profile.
//   - young_learner: lookup in /assets/illustrations/young-learner/manifest.json
//   - teen / adult:  call /api/pexels with the keyword
//   - exam_prep:     return null (no images for non-warmup slides)
//
// Returns { href, alt, attribution } or null. Never throws.

(() => {
  const SW = (window.Slatework = window.Slatework || {});
  const Images = (SW.SlideshowImages = SW.SlideshowImages || {});

  let manifestPromise = null;
  function loadManifest() {
    if (!manifestPromise) {
      manifestPromise = fetch('/assets/illustrations/young-learner/manifest.json', {
        cache: 'force-cache'
      }).then(r => r.ok ? r.json() : { illustrations: [] }).catch(() => ({ illustrations: [] }));
    }
    return manifestPromise;
  }

  // Cache Pexels lookups within the page to avoid burning the per-IP quota.
  const pexelsCache = new Map();
  async function lookupPexels(keyword) {
    if (pexelsCache.has(keyword)) return pexelsCache.get(keyword);
    const p = (async () => {
      const r = await fetch('/api/pexels?q=' + encodeURIComponent(keyword) + '&per_page=1');
      if (!r.ok) return null;
      const data = await r.json().catch(() => null);
      const photo = data && data.photos && data.photos[0];
      if (!photo) return null;
      return {
        href: photo.src,
        alt: photo.alt || keyword,
        attribution: photo.photographer ? `Photo by ${photo.photographer} on Pexels` : 'Photo by Pexels'
      };
    })();
    pexelsCache.set(keyword, p);
    return p;
  }

  function matchManifest(manifest, keyword) {
    const k = String(keyword || '').toLowerCase().trim();
    if (!k) return null;
    const list = (manifest && manifest.illustrations) || [];
    // Prefer exact keyword match, then substring match.
    let hit = list.find(e => e.keywords && e.keywords.includes(k));
    if (!hit) hit = list.find(e => e.keywords && e.keywords.some(x => x.includes(k) || k.includes(x)));
    return hit || null;
  }

  Images.resolve = async function resolve({ keyword, audience }) {
    if (!keyword) return null;
    if (audience === 'young_learner') {
      const manifest = await loadManifest();
      const hit = matchManifest(manifest, keyword);
      if (!hit) return null;
      return {
        href: '/assets/illustrations/young-learner/' + hit.file,
        alt: hit.keywords[0] || keyword,
        attribution: 'Illustrations by Storyset'
      };
    }
    if (audience === 'teen' || audience === 'adult') {
      return lookupPexels(keyword);
    }
    // exam_prep: caller already gates by density, but defend anyway.
    return null;
  };

  // Tutor swap-out: lets the renderer hand off to file-extract drop UI.
  // Reuses the existing file-extract pattern from src/lib/file-extract.js.
  Images.swapHandler = function swapHandler(slideEl, onPicked) {
    const drop = document.createElement('div');
    drop.className = 'slideshow-swap-drop';
    drop.tabIndex = 0;
    drop.textContent = 'Drop an image here, or click to pick a file.';
    slideEl.querySelector('.slideshow-slide-media').appendChild(drop);
    if (SW.attachFileDrop) {
      SW.attachFileDrop({
        zone: drop,
        accept: 'image/*',
        imageHandler: ({ blob }) => {
          const url = URL.createObjectURL(blob);
          if (typeof onPicked === 'function') onPicked({ href: url, alt: 'tutor-supplied image', attribution: '' });
        }
      });
    }
  };
})();
```

- [ ] **Step 4: Run smoke test, expect pass for young_learner case (with bundle), null for missing, and either null or a valid `/api/pexels?...`-fetched image for adult.**

- [ ] **Step 5: Commit**

```bash
git add src/lib/slideshow-images.js
git commit -m "feat(slideshow): image resolver — bundle for young_learner, Pexels for teen/adult, null for exam_prep"
```

---

## Phase G.4 — Pexels integration

### Task 7: Pexels server-side proxy

**Files:**
- Create: `functions/api/pexels.js`

- [ ] **Step 1: Failing browser test**

```js
(async () => {
  const r = await fetch('/api/pexels?q=classroom&per_page=1');
  console.assert(r.ok, '/api/pexels failed', r.status);
  const data = await r.json();
  console.assert(Array.isArray(data.photos), 'photos not array');
  if (data.photos.length) {
    const p = data.photos[0];
    console.assert(/^https:\/\/images\.pexels\.com\//.test(p.src), 'src must be images.pexels.com URL');
    console.assert(p.photographer, 'photographer missing');
  }
  console.log('OK', data.photos.length);
})();
```

- [ ] **Step 2: Run, expect 404 (endpoint missing).**

- [ ] **Step 3: Write `functions/api/pexels.js`**

```js
// GET /api/pexels?q=<keyword>&per_page=<1..5>
// Server-side proxy to the Pexels search API. Keeps PEXELS_API_KEY off the
// client and applies a per-IP / global rate limit. Pexels' own free quota is
// 200/hr/IP — our cap is well below that.

import { jsonResponse, ipHash, rateCheck, corsPreflight, methodNotAllowed } from "../_lib.js";

export const onRequestOptions = () => corsPreflight('GET');
export const onRequest = () => methodNotAllowed('GET');

const PER_IP_DAILY = 80;     // 8 keywords * ~10 slideshow generations
const GLOBAL_DAILY = 4000;
const MAX_PER_PAGE = 5;

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim();
  let perPage = parseInt(url.searchParams.get('per_page') || '1', 10);
  if (!Number.isFinite(perPage) || perPage < 1) perPage = 1;
  if (perPage > MAX_PER_PAGE) perPage = MAX_PER_PAGE;

  if (!q) return jsonResponse({ error: 'Missing q parameter.' }, 400);
  if (q.length > 80) return jsonResponse({ error: 'Query too long.' }, 400);
  if (!env.PEXELS_API_KEY) return jsonResponse({ photos: [] }, 200);

  const fp = await ipHash(request);
  const rate = await rateCheck(env, fp, 'pexels', PER_IP_DAILY, GLOBAL_DAILY);
  if (!rate.ok) {
    const headers = rate.retryAfterSec ? { 'Retry-After': String(rate.retryAfterSec) } : {};
    // Soft-fail: still return an empty list so the slideshow renders.
    return jsonResponse({ photos: [], rate_limited: true }, 200, headers);
  }

  const apiUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=${perPage}&orientation=landscape&size=medium`;
  let r;
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 8000);
    r = await fetch(apiUrl, {
      headers: { Authorization: env.PEXELS_API_KEY },
      signal: ctl.signal
    });
    clearTimeout(timer);
  } catch (e) {
    return jsonResponse({ photos: [], upstream: 'network_error' }, 200);
  }
  if (!r.ok) {
    return jsonResponse({ photos: [], upstream_status: r.status }, 200);
  }
  const data = await r.json().catch(() => ({}));
  const photos = (data.photos || []).slice(0, perPage).map(p => ({
    id: p.id,
    src: p.src && (p.src.medium || p.src.large || p.src.original),
    alt: p.alt || q,
    photographer: p.photographer || '',
    photographer_url: p.photographer_url || ''
  }));
  return jsonResponse({ photos }, 200, {
    // Edge cache: keywords repeat across users; safe to cache moderately.
    'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400'
  });
}
```

- [ ] **Step 4: Set the `PEXELS_API_KEY` Pages secret**

Get a free key from `https://www.pexels.com/api/`. Then:

```bash
cd C:/Users/darre/slatework
echo 'PEXELS_API_KEY="<paste-key-here>"' >> .dev.vars  # local dev
# Production:
npx wrangler pages secret put PEXELS_API_KEY
# (paste when prompted)
```

- [ ] **Step 5: Run smoke test, expect pass**

Either against the deployed site or via `npx wrangler pages dev .`. Confirm the keyword `classroom` returns at least one Pexels photo with the assertions passing.

- [ ] **Step 6: Connect-src CSP**

`api.pexels.com` is fetched server-side (no client `connect-src` change needed). `images.pexels.com` was already added to `img-src` in Task 4. Re-confirm by inspecting `_headers` — no further change.

- [ ] **Step 7: Commit**

```bash
git add functions/api/pexels.js
git commit -m "feat(slideshow): Pexels search proxy with rate limiting and soft-fail"
```

---

## Phase G.5 — PptxGenJS export

### Task 8: PptxGenJS loader + export

**Files:**
- Create: `src/lib/slideshow-export.js`

- [ ] **Step 1: Failing test**

Add to `tests/slideshow-export.test.js`:

```js
(async () => {
  console.assert(window.Slatework && window.Slatework.SlideshowExport, 'SlideshowExport missing');
  const fakeResp = window.__fakeSlideshow; // manually set in test page; same shape as Task 5
  // Hook download into a blob URL we can verify exists.
  const beforeAnchors = document.querySelectorAll('a[download]').length;
  await Slatework.SlideshowExport.exportPptx({
    response: fakeResp, audience: 'young_learner',
    tutorName: 'Sarah', attributionText: 'Illustrations by Storyset.',
    _testReturnBlob: true  // see implementation
  }).then(blob => {
    console.assert(blob && blob.size > 1000, 'expected non-empty .pptx blob, got size ' + (blob && blob.size));
    console.log('OK pptx size', blob.size);
  });
})();
```

- [ ] **Step 2: Run, expect fail.**

- [ ] **Step 3: Compute SRI hash for PptxGenJS**

The mammoth.js precedent at `src/lib/file-extract.js:14-20` uses cdnjs + `integrity="sha384-..."`. We do the same for PptxGenJS.

Pick the latest stable cdnjs build of pptxgenjs — at the time of writing the latest stable on cdnjs is `4.0.1`. Confirm by visiting `https://cdnjs.cloudflare.com/ajax/libs/pptxgenjs/`. Then compute the SRI:

```bash
curl -fsSL https://cdnjs.cloudflare.com/ajax/libs/pptxgenjs/4.0.1/pptxgen.bundle.min.js \
  | openssl dgst -sha384 -binary \
  | openssl base64 -A
# Outputs the base64 — prefix with "sha384-" to use in `integrity`.
```

Record the version + hash in a comment block in the export file (next step). If the version differs, swap accordingly.

- [ ] **Step 4: Write `src/lib/slideshow-export.js`**

```js
// Slatework.SlideshowExport.exportPptx({ response, audience, tutorName, attributionText })
// Lazy-loads PptxGenJS from cdnjs with SRI hash, then converts the slide
// JSON into a .pptx and triggers a download.
//
// Version-pinning convention (mirrors mammoth.js@1.7.2 in src/lib/file-extract.js:14-20):
// Update both the URL and the `integrity` attribute together when bumping.
//
//   PptxGenJS: 4.0.1
//   SRI:       sha384-REPLACE_WITH_COMPUTED_HASH_FROM_TASK_8_STEP_3

(() => {
  const SW = (window.Slatework = window.Slatework || {});
  const Export = (SW.SlideshowExport = SW.SlideshowExport || {});

  const PPTX_VERSION = '4.0.1';
  const PPTX_URL = `https://cdnjs.cloudflare.com/ajax/libs/pptxgenjs/${PPTX_VERSION}/pptxgen.bundle.min.js`;
  const PPTX_SRI = 'sha384-REPLACE_WITH_COMPUTED_HASH_FROM_TASK_8_STEP_3';

  let pptxPromise;
  function loadPptx() {
    if (!pptxPromise) {
      pptxPromise = new Promise((resolve, reject) => {
        if (window.PptxGenJS || window.pptxgen) return resolve(window.PptxGenJS || window.pptxgen);
        const s = document.createElement('script');
        s.src = PPTX_URL;
        s.integrity = PPTX_SRI;
        s.crossOrigin = 'anonymous';
        s.referrerPolicy = 'no-referrer';
        s.onload = () => resolve(window.PptxGenJS || window.pptxgen);
        s.onerror = () => reject(new Error('Could not load PptxGenJS — check CDN/SRI.'));
        document.head.appendChild(s);
      });
    }
    return pptxPromise;
  }

  // Convert "Bullet line\n• item\n• item" into PptxGenJS bullet text array.
  function bodyToPptxText(body) {
    const lines = String(body || '').split('\n').filter(l => l.trim());
    const out = [];
    for (const line of lines) {
      const m = line.match(/^\s*[•\-\*]\s+(.+)$/);
      if (m) out.push({ text: m[1], options: { bullet: true, fontSize: 18 } });
      else   out.push({ text: line, options: { fontSize: 20, breakLine: true } });
    }
    return out.length ? out : [{ text: '', options: { fontSize: 18 } }];
  }

  // Slide layout numbers tuned for 10×5.625 in widescreen (default).
  function addSlide(pres, slide, audience, opts) {
    const s = pres.addSlide();
    s.background = { color: 'FFFFFF' };
    // Header strip
    s.addShape('rect', { x: 0, y: 0, w: '100%', h: 0.55, fill: { color: '0F172A' } });
    s.addText(slide.title || '', {
      x: 0.4, y: 0.05, w: 9.0, h: 0.45,
      fontSize: 22, fontFace: 'Calibri', color: 'F8FAFC', bold: true
    });
    if (slide.duration_min) {
      s.addText(`${slide.duration_min} min`, {
        x: 8.4, y: 0.1, w: 1.4, h: 0.35,
        fontSize: 14, fontFace: 'Calibri', color: 'FDE68A', align: 'right'
      });
    }
    // Subtitle
    if (slide.subtitle) {
      s.addText(slide.subtitle, {
        x: 0.4, y: 0.7, w: 9.0, h: 0.4,
        fontSize: 16, fontFace: 'Calibri', color: '475569'
      });
    }
    // Body — 60% width when an image is present, 100% otherwise.
    const hasImage = slide._imageDataUrl;
    const bodyW = hasImage ? 5.6 : 9.2;
    s.addText(bodyToPptxText(slide.body), {
      x: 0.4, y: 1.2, w: bodyW, h: 3.8,
      fontSize: 18, fontFace: 'Calibri', color: '020617', valign: 'top'
    });
    if (hasImage) {
      s.addImage({
        data: slide._imageDataUrl,
        x: 6.2, y: 1.2, w: 3.4, h: 3.4
      });
    }
    // Tutor name + attribution footer
    const footerParts = [];
    if (opts.tutorName) footerParts.push(`Prepared by ${opts.tutorName}`);
    footerParts.push('Made with Slatework');
    s.addText(footerParts.join(' · '), {
      x: 0.4, y: 5.1, w: 9.2, h: 0.3,
      fontSize: 10, fontFace: 'Calibri', color: '94A3B8', align: 'left'
    });
    // Notes — attribution + slide id for tutor reference
    s.addNotes(`Slide id: ${slide.id}\nAudience: ${audience}\n${opts.attributionText || ''}`);
  }

  // Fetch a same-origin or HTTPS image and return a data: URL. PptxGenJS
  // accepts data: URLs directly. Failures are silent — we ship the slide
  // text-only.
  async function imgUrlToDataUrl(url) {
    try {
      const r = await fetch(url, { credentials: 'omit' });
      if (!r.ok) return null;
      const blob = await r.blob();
      return await new Promise((resolve) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.onerror = () => resolve(null);
        fr.readAsDataURL(blob);
      });
    } catch { return null; }
  }

  Export.exportPptx = async function exportPptx({ response, audience, tutorName, attributionText, _testReturnBlob }) {
    const PptxGenJS = await loadPptx();
    if (!PptxGenJS) throw new Error('PptxGenJS not available.');
    const pres = new PptxGenJS();
    pres.title = (response.slides[0] && response.slides[0].title) || 'Slatework lesson';
    pres.author = tutorName || 'Tutor';
    pres.layout = 'LAYOUT_WIDE';

    // Resolve images first so each slide knows its image data URL.
    const overrides = (response.alt_audiences && response.alt_audiences[audience] && response.alt_audiences[audience].tone_overrides) || {};
    const density = (audience === (response.metadata && response.metadata.inferred_audience))
      ? response.metadata.inferred_image_density
      : (response.alt_audiences && response.alt_audiences[audience] && response.alt_audiences[audience].image_density);

    for (const baseSlide of response.slides) {
      const slide = Object.assign({}, baseSlide, overrides[baseSlide.id] || {});
      // Decide whether to attach an image based on density.
      const want = (density === 'high') ? 1
                 : (density === 'medium') ? 1
                 : (density === 'low') ? (slide.image_keywords && slide.image_keywords.length ? 1 : 0)
                 : (slide.id === 'warmup' && slide.image_keywords && slide.image_keywords.length ? 1 : 0);
      if (want && SW.SlideshowImages) {
        try {
          const url = await SW.SlideshowImages.resolve({ keyword: slide.image_keywords[0], audience });
          if (url && url.href) {
            slide._imageDataUrl = await imgUrlToDataUrl(url.href);
          }
        } catch { /* silent */ }
      }
      addSlide(pres, slide, audience, { tutorName, attributionText });
    }

    const fileName = `slatework-lesson-${audience}-${new Date().toISOString().slice(0,10)}.pptx`;

    if (_testReturnBlob) {
      // PptxGenJS supports outputType "blob".
      return pres.write({ outputType: 'blob' });
    }
    return pres.writeFile({ fileName });
  };
})();
```

- [ ] **Step 5: Run smoke test, expect pass**

Open the test page, set `window.__fakeSlideshow` to the payload from Task 5 step 1, run the snippet. Expect a blob > 1000 bytes.

- [ ] **Step 6: Manual verification — open the .pptx**

Trigger the real export (button on the lesson-plan page after Task 9). Open the resulting `.pptx` in PowerPoint AND Google Slides AND Keynote. Confirm:
- 8 slides, in the correct order.
- Header strip, slide titles, body text legible.
- Tutor name appears in footer.
- Notes pane includes the attribution string.

- [ ] **Step 7: Commit**

```bash
git add src/lib/slideshow-export.js
git commit -m "feat(slideshow): PptxGenJS export pinned to 4.0.1 with SRI hash, full slide layout + notes"
```

---

## Phase G.6 — Lesson-plan integration

### Task 9: Wire extension button + render slot

**Files:**
- Modify: `lesson-plan.html`
- Modify: `src/lib/page-lesson-plan.js`

- [ ] **Step 1: Failing manual test**

Open `/lesson-plan`, generate a plan. Currently no slideshow button appears. Goal: after Task 9 lands, a `[Generate slideshow from this plan]` button appears in the result panel and clicking it renders an 8-slide preview.

- [ ] **Step 2: Edit `lesson-plan.html` — add the new script tags + render slot**

Find the bottom `<script src="...page-lesson-plan.js?v=14">` block. Insert these BEFORE `page-lesson-plan.js` and bump versions to `?v=15`:

```html
<script src="/src/lib/slideshow-images.js?v=15" defer></script>
<script src="/src/lib/slideshow-render.js?v=15" defer></script>
<script src="/src/lib/slideshow-export.js?v=15" defer></script>
```

Also bump every `?v=14` on this page to `?v=15`. The existing `<section id="result" class="result" role="region" aria-live="polite" hidden></section>` is the render target — no markup change needed there; `page-lesson-plan.js` will append the extension block dynamically.

- [ ] **Step 3: Edit `src/lib/page-lesson-plan.js` — append the extension block on success**

Modify the success branch (after `result.innerHTML = '<div id="md">' + ...`). Replace it with:

```js
const profile = (window.Slatework && Slatework.Profile) ? Slatework.Profile.getCurrentStudent() : null;
const tutorName = (window.Slatework && Slatework.Profile && Slatework.Profile.getTutor && (Slatework.Profile.getTutor() || {}).name) || '';
const audience = profile ? profile.audience_profile :
  (Slatework.Profile && Slatework.Profile.deriveAudience
    ? Slatework.Profile.deriveAudience({
        level: $('level').value,
        mode: $('mode').value,
        exam: $('exam').value
      })
    : 'adult');
const planMd = data.markdown || '';

result.innerHTML =
  '<div id="md">' + renderMarkdown(planMd) + '</div>' +
  '<p class="small mt-1">Tip: select all and paste into your notes; the formatting comes through.</p>' +
  '<section class="extensions" aria-label="Extension actions">' +
    '<h3>Take this further</h3>' +
    '<div class="extensions-buttons">' +
      '<button type="button" id="gen-slideshow" class="btn btn-primary">Generate slideshow from this plan</button>' +
      '<a class="btn btn-secondary" href="/worksheet.html?from=lesson-plan&topic=' + encodeURIComponent($('goal').value.slice(0,120)) + '">Generate worksheet for this plan</a>' +
      '<a class="btn btn-secondary" href="/marking.html?from=lesson-plan">Mark a student response to this plan</a>' +
    '</div>' +
    '<section id="slideshow-host" class="slideshow-host" hidden></section>' +
  '</section>';

const slideshowBtn = document.getElementById('gen-slideshow');
const slideshowHost = document.getElementById('slideshow-host');
let slideshowResponse = null;

slideshowBtn.addEventListener('click', async () => {
  slideshowBtn.disabled = true;
  const originalText = slideshowBtn.textContent;
  slideshowBtn.textContent = 'Generating slideshow…';
  slideshowHost.hidden = false;
  slideshowHost.innerHTML = '<div class="slate-loading"><p class="mono-caption"><span class="dot"></span>BUILDING DECK</p><p class="slate-loading-sub">10–30 seconds. Don\'t refresh.</p></div>';
  try {
    if (!slideshowResponse) {
      slideshowResponse = await Slatework.Slideshow.generate({
        lesson_plan_markdown: planMd,
        audience_profile: audience,
        target_language: resolveLang('target', 'target_other'),
        source_language: resolveLang('source', 'source_other'),
        level: $('level').value,
        mode: $('mode').value,
        exam: $('exam').value
      });
    }
    await Slatework.Slideshow.render(slideshowHost, slideshowResponse, {
      tutorName,
      attributionText: 'Illustrations by Storyset · Photos by Pexels'
    });
    slideshowBtn.textContent = 'Regenerate slideshow';
  } catch (e) {
    slideshowHost.innerHTML = '<p class="error">' + escapeHtml(e.message || 'Slideshow failed.') + '</p>';
    slideshowBtn.textContent = originalText;
  } finally {
    slideshowBtn.disabled = false;
  }
});
```

Also add a small block of CSS to `styles.css` (append):

```css
.extensions { margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--line); }
.extensions h3 { margin: 0 0 .5rem 0; font-size: 1.1rem; }
.extensions-buttons { display: flex; flex-wrap: wrap; gap: .5rem; margin-bottom: 1rem; }
```

- [ ] **Step 4: Manual test on `/lesson-plan`**

1. Generate a plan with `target=Spanish, level=A1, goal="Practise farm vocabulary"`.
2. Verify the three extension buttons appear under the rendered Markdown.
3. Click `Generate slideshow from this plan`.
4. Verify an 8-slide preview renders. Confirm:
   - Audience selector is set to `Young learner` (auto-derived from A1).
   - Switching to `Adult` re-renders the deck instantly with no network call.
   - Arrow keys advance/retreat slides.
   - "Download .pptx" downloads a working file.
5. Open DevTools network tab. Confirm only one POST to `/api/slideshow` happened across the audience-switching flow.

- [ ] **Step 5: Bump cache-busting `?v=14` → `?v=15` everywhere on `lesson-plan.html`** (already done in Step 2 — sanity-check).

- [ ] **Step 6: Commit**

```bash
git add lesson-plan.html src/lib/page-lesson-plan.js src/lib/styles.css
git commit -m "feat(lesson-plan): wire slideshow + worksheet + marking extension buttons on result panel"
```

---

## Phase G.7 — Privacy & acceptance

### Task 10: Privacy disclosure for Pexels

**Files:**
- Modify: `privacy.html`

- [ ] **Step 1: Failing test**

Read `privacy.html`. Confirm there is no mention of Pexels. After the change, the page must include a single sentence about image keyword forwarding.

- [ ] **Step 2: Add the disclosure**

Find the existing AI-tool disclosure section (the part discussing Anthropic). Append this paragraph at the end of that section:

```html
<p>For slideshow image illustrations: when you generate a slideshow with the
<em>teen</em> or <em>adult</em> audience profile, single-word image keywords
(e.g. "classroom", "coffee") that the slideshow generator extracts from the
lesson plan are sent to <a href="https://www.pexels.com/" rel="noopener">Pexels</a>
to fetch matching photos. No student details, lesson goals, or profile data
are sent — only the keywords. Slideshows for the <em>young learner</em>
audience use a curated illustration bundle that ships with Slatework and
makes no external image request.</p>
```

- [ ] **Step 3: Verify by reload + inspect.**

- [ ] **Step 4: Commit**

```bash
git add privacy.html
git commit -m "docs(privacy): disclose Pexels image-keyword forwarding for teen/adult slideshows"
```

### Task 11: Run all spec §12 acceptance checks for slideshow

**Files:** none (verification only)

- [ ] **Step 1: Acceptance — slideshow extension button**

On `/lesson-plan`, generate a plan. Confirm `[Generate slideshow from this plan]` appears in the result panel. Click it. Confirm 8 slides appear.

- [ ] **Step 2: Acceptance — young_learner uses bundle, not photos**

Set student profile audience to `young_learner` (or generate without profile at A1, which auto-derives). Generate a slideshow. Open DevTools network tab. Confirm:
- Image requests go to `/assets/illustrations/young-learner/*.svg`
- NO requests go to `/api/pexels` or `https://images.pexels.com`

- [ ] **Step 3: Acceptance — adult/teen uses Pexels photos**

Set audience to `adult`. Generate a slideshow. Confirm image requests go to `https://images.pexels.com/...`.

- [ ] **Step 4: Acceptance — audience switcher re-renders without API call**

Generate, then switch audience selector. DevTools network tab: confirm zero new `/api/slideshow` requests.

- [ ] **Step 5: Acceptance — PptxGenJS export valid in PowerPoint, Keynote, Google Slides**

Click `Download .pptx`. Open the file in:
- Microsoft PowerPoint (any version 2016+)
- Apple Keynote
- Google Slides (drag-drop into a new presentation)

Verify all 8 slides render with text and any images. Verify notes pane on slide 1 contains the attribution + slide id.

- [ ] **Step 6: Acceptance — strict CSP unchanged**

Run:
```bash
curl -sI https://slatework.tools/lesson-plan | grep -i "content-security-policy"
```
Confirm `script-src` still does NOT contain `unsafe-inline`. Confirm `img-src` includes `https://images.pexels.com`.

- [ ] **Step 7: Acceptance — keyboard navigation**

On the rendered slideshow:
- Tab into the slideshow region
- Press → and ← — confirm slide advances/retreats
- Press Home / End — confirm jump to first / last
- Press Esc — confirm focus returns to the trigger button
- Press Tab through controls — confirm the audience select, prev, next, export are all reachable in order
- Verify aria-hidden toggles correctly per slide (use the accessibility tree in DevTools)

- [ ] **Step 8: Acceptance — prefers-reduced-motion**

In DevTools → Rendering → "Emulate CSS media feature prefers-reduced-motion: reduce". Switch slides. Confirm no animations occur (all slide transitions should be instant — the base CSS uses `display:none/grid` only, so this is automatic; the CSS rule is defense in depth).

- [ ] **Step 9: Acceptance — Lighthouse parity**

Run Lighthouse on `/lesson-plan` (after loading the slideshow extension). Compare against the pre-change baseline (A11y 9.4, Perf 9.0). Confirm both scores are >= the baseline. The extension JS is `defer`-loaded so should not impact LCP.

- [ ] **Step 10: Acceptance — fallback deck on validation failure**

Force a validation failure manually: in DevTools, override the response. Or, deploy a temporary change that injects malformed JSON into the system prompt. Confirm the endpoint returns the static fallback deck (not a 500), and the renderer renders 8 slides with the warmup keyword `hello/smile`. Revert the temporary change.

- [ ] **Step 11: Acceptance — single Anthropic call per slideshow**

Open DevTools network tab. Generate a slideshow. Confirm exactly one POST to `/api/slideshow`. Switch audience three times. Confirm zero additional POSTs.

- [ ] **Step 12: Update `manual-todo.md` with deferrals if any.**

If any acceptance check fails and is not blocked, log it as a follow-up in `~/.claude/manual-todo.md`. If everything passes, no follow-up needed.

- [ ] **Step 13: Final commit**

If any minor copy/style fixes were applied during acceptance:

```bash
git add -p   # review changes
git commit -m "polish(slideshow): acceptance-pass fixes"
```

---

## Self-review

### 1. Spec coverage

Walking spec §6 + §12 line by line:

- §6.1 Entry point button on `/lesson-plan` result → Task 9 (Step 3)
- §6.1 Visible only after a plan generated → Task 9 wires it inside the post-generation `result.innerHTML` block
- §6.2 `POST /api/slideshow` — request body shape → Task 1 (Step 3)
- §6.2 Response shape with `slides`, `metadata`, `alt_audiences` → Task 1 (Step 3, system prompt + validator)
- §6.2 Single Anthropic call per generation → Task 1; validated in Task 11 Step 11
- §6.2 Rate limit via `_lib.js rateCheck()` → Task 1 (Step 3)
- §6.2 JSON-shape validation server-side, fallback to default deck → Task 1 (`validateDeck` + `fallbackDeck`)
- §6.3 Young learner: curated bundle at `/assets/illustrations/young-learner/`, ~80–120 SVGs across 8 categories → Task 3
- §6.3 Storyset attribution surfaced in preview footer + .pptx notes → Task 5 (`buildShellHtml` includes footer); Task 8 (`addNotes` includes attribution)
- §6.3 Teen/Adult: Pexels API, CSP `img-src` allowance → Task 7 (proxy) + Task 4 (CSP) + Task 6 (resolver)
- §6.3 Tutor swap-out via `/marking` drop-zone pattern → Task 6 (`Images.swapHandler`)
- §6.3 Exam prep: minimal images, only warmup → Task 1 system prompt rule + Task 5 `keywordsForDensity` + Task 8 `want` calculation
- §6.4 Preview rendering, audience switcher, keyboard nav, `prefers-reduced-motion` → Task 5 + Task 11 Step 7-8
- §6.4 Audience switcher uses cached `alt_audiences` (no second API call) → Task 5 `renderForAudience` reads from response, no fetch
- §6.5 PptxGenJS via cdnjs `<script>` with SRI → Task 8 Step 3-4
- §6.5 PDF deferred — explicitly out of scope, not handled
- §6.6 Default 8-slide section-mirror deck → Task 1 system prompt enumerates the 8 ids in order; validator enforces
- §6.6 Mode=classroom font scale increase — note: handled by spec as model-side instruction in Task 1's system prompt ("If a mode of 'classroom' is provided"). PptxGenJS export inherits the same body; explicit font-size scaling is left to the model's word choice in the body text. (If we want hard CSS/PPTX font scaling for classroom, that would be additional work; for now the spec section §6.6 reads "font scale increases ~20% across all slides" — implementation note: consider adding `if (audience-mode === 'classroom') fontSize *= 1.2` to `addSlide` / `bodyToPptxText`. **Action:** task added below.)
- §12 Slideshow extension button appears → Task 11 Step 1
- §12 Generated decks for `young_learner` use bundle → Task 11 Step 2
- §12 Generated decks for `teen/adult` use Pexels → Task 11 Step 3
- §12 Audience switcher re-renders client-side without second API call → Task 11 Step 4 + Step 11
- §12 PptxGenJS valid in PPT/Keynote/Slides → Task 11 Step 5
- §12 Strict CSP unchanged, no `unsafe-inline` → Task 4 + Task 11 Step 6
- §12 WCAG 2.2 AA on new UI atoms → Task 11 Step 7-8
- §12 Lighthouse parity → Task 11 Step 9

**Gap detected:** classroom-mode font scaling. Adding follow-up task.

### Task 12: Classroom-mode font scaling

**Files:**
- Modify: `src/lib/slideshow-render.js`
- Modify: `src/lib/slideshow-export.js`

- [ ] **Step 1: Failing test**

```js
(async () => {
  const fakeResp = window.__fakeSlideshow; // see Task 5 fixture
  fakeResp.metadata.deck_style = 'classroom'; // tag for the renderer
  fakeResp.metadata.mode = 'classroom';        // tag for the export
  const host = document.createElement('div');
  document.body.appendChild(host);
  await Slatework.Slideshow.render(host, fakeResp, { tutorName: 'Sarah' });
  const titleSize = parseFloat(getComputedStyle(host.querySelector('.slideshow-slide-title')).fontSize);
  console.assert(titleSize >= 25, `expected classroom title >= 25px, got ${titleSize}px`);
  host.remove();
})();
```

- [ ] **Step 2: Run, expect fail**

(Default size is 24px (1.5rem); classroom should bump to ~28.8px.)

- [ ] **Step 3: Edit `slideshow-render.js`**

Inside `Slideshow.render`, add at the top of the function body, right after argument validation:

```js
const isClassroom = response.metadata && (response.metadata.mode === 'classroom' || response.metadata.deck_style === 'classroom');
if (isClassroom) container.classList.add('slideshow--classroom');
```

Append CSS:

```css
.slideshow--classroom .slideshow-slide-title { font-size: 1.8rem; }
.slideshow--classroom .slideshow-slide-body  { font-size: 1.2rem; }
.slideshow--classroom .slideshow-slide-sub   { font-size: 1.05rem; }
```

- [ ] **Step 4: Edit `slideshow-export.js` `addSlide`**

Add a `mode` arg threaded through `Export.exportPptx`. Where the mode is `classroom`, multiply title/body font sizes by 1.2:

```js
function addSlide(pres, slide, audience, opts) {
  const scale = (opts.mode === 'classroom') ? 1.2 : 1.0;
  // ...
  s.addText(slide.title || '', {
    x: 0.4, y: 0.05, w: 9.0, h: 0.45,
    fontSize: Math.round(22 * scale), fontFace: 'Calibri', color: 'F8FAFC', bold: true
  });
  // ... apply scale to body fontSize and bullet fontSize too
}
```

And update `bodyToPptxText` to accept a `scale` arg (or pass via the option object). Wire `opts.mode` from `exportPptx({ mode: ... })`. The mode is already in `response.metadata` (the server sends it back via `metadata.mode` once we update the system prompt to copy the user-supplied mode through; if not present, fall back to `'one_to_one'`).

- [ ] **Step 5: Re-run test, expect pass.**

- [ ] **Step 6: Wire `mode` from `page-lesson-plan.js` into the export call**

In Task 9's `slideshow-host` button handler, when invoking `exportPptx`, pass:

```js
mode: $('mode').value
```

via `opts`. Adjust `slideshow-render.js`'s `exportPptx` invocation similarly:

```js
await SW.SlideshowExport.exportPptx({
  response, audience, mode,
  tutorName: opts.tutorName || '',
  attributionText: opts.attributionText || ''
});
```

Pass `mode` through `Slideshow.render(container, response, opts)` by accepting `opts.mode`. Update Task 9 to pass `mode: $('mode').value` to render.

- [ ] **Step 7: Commit**

```bash
git add src/lib/slideshow-render.js src/lib/slideshow-export.js src/lib/styles.css src/lib/page-lesson-plan.js
git commit -m "feat(slideshow): classroom-mode 1.2x font scaling for projector legibility"
```

### 2. Placeholder scan

Searched plan body for: `TBD`, `TODO`, `FIXME`, `[FULL`, `[INSERT`, `placeholder`, `similar to`, `implement later`, `add error handling` (without code).

- One literal `placeholder` text appears in `Task 8 Step 3`'s SRI comment block: `sha384-REPLACE_WITH_COMPUTED_HASH_FROM_TASK_8_STEP_3`. This is **intentional**: the SRI must be computed at build time against the exact cdnjs build the implementer pulls. The plan tells the implementer to compute and replace in the same step before commit. This mirrors the mammoth.js pattern in `src/lib/file-extract.js:14-20`. Acceptable.
- No other placeholders. All Anthropic system prompts, Pexels fetches, PptxGenJS calls, error paths, and validation rules are written out fully.

### 3. Type consistency

- Slide JSON shape: `{id, type, title, subtitle, body, image_keywords, duration_min}` — used identically in:
  - server (Task 1 system prompt)
  - server validator (Task 1 `validateDeck`)
  - server fallback (Task 1 `fallbackDeck`)
  - client renderer (Task 5 `buildSlideHtml`)
  - client images resolver (Task 6 — only consumes `image_keywords`)
  - PptxGenJS export (Task 8 `addSlide`)
- Response shape `{slides, metadata, alt_audiences}` consistent across all consumers.
- `alt_audiences[a].tone_overrides` keyed by slide id (`'title'/'at_a_glance'/...`); validated against `REQUIRED_SLIDE_IDS` server-side; consumed by client `applyOverride` correctly.
- `audience_profile` enum is consistent: `young_learner | teen | adult | exam_prep` (matches spec §3.5).
- `image_density` enum is consistent: `high | medium | low | minimal` (Task 1 prompt and Task 5 `keywordsForDensity` agree).
- `density === 'minimal'` only renders an image on `slide.id === 'warmup'` — same rule in `keywordsForDensity` (Task 5) and the `want` calc (Task 8).
- Profile API references: `Slatework.Profile.getCurrentStudent()`, `Slatework.Profile.getTutor()`, `Slatework.Profile.deriveAudience({level, mode, exam})` — all from prerequisites Phase A. No invented method names.
- Image resolver returns `{href, alt, attribution} | null` — used identically in renderer (Task 5 `renderSlideMedia`) and exporter (Task 8 `imgUrlToDataUrl` consumes `href`).

### 4. Dependency check

- Task 1 (server endpoint) — no client dependencies.
- Task 2 (validator paths) — depends on Task 1.
- Task 3 (illustration bundle) — independent.
- Task 4 (`_headers`) — depends on Task 3 (path) and Task 7 (CSP for Pexels). Task 4 lands before Task 7 — but the CSP `img-src` change is only used by Task 6's downstream `<img>` rendering, which only fires after the renderer runs. Order is fine.
- Task 5 (renderer) — depends on Task 6 (`SlideshowImages`) at runtime, but renderer guards via `if (!SW.SlideshowImages) return;`. Task 6 is built right after.
- Task 6 (image resolver) — depends on Task 3 (manifest) and Task 7 (Pexels endpoint). Manifest is committed in Task 3; Pexels runs Task 7. If Task 6 ships before Task 7, `lookupPexels` returns null gracefully. Acceptable order.
- Task 7 (Pexels proxy) — depends on `PEXELS_API_KEY` secret. Step 4 in Task 7 sets this. If unset, the endpoint returns `{photos: []}` (graceful).
- Task 8 (export) — depends on Task 5 (rendered response) and Task 6 (`SlideshowImages.resolve`).
- Task 9 (lesson-plan integration) — depends on Tasks 5/6/8 (all client modules), and on Task 1 (server endpoint).
- Task 10 (privacy) — independent.
- Task 11 (acceptance) — depends on everything above.
- Task 12 (classroom font scale) — depends on Tasks 5/8/9.

All prerequisite chains are satisfied by the linear order presented.

---

## Done definition

The slideshow feature is shipped when:

1. All checkboxes in Tasks 1–12 are ticked.
2. All §12 acceptance items in Task 11 pass.
3. The plan file (this file) is moved (or its summary added) to `docs/superpowers/reviews/2026-05-09-slideshow-postmortem.md` if any deviations from spec were made — otherwise no postmortem is required.
4. `_headers` includes `https://images.pexels.com` in `img-src` and the immutable cache rule for `/assets/illustrations/young-learner/*`.
5. `/privacy` mentions Pexels image-keyword forwarding.
6. `lesson-plan.html` renders the extension button block on every successful generation, regardless of profile state.

**End of plan.**
