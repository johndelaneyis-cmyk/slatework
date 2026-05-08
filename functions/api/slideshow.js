// POST /api/slideshow
// Turns a generated lesson-plan markdown into a structured 8-slide deck JSON
// containing the primary audience deck plus alt_audiences overrides.

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
  '    "deck_style": "primary" | "teen" | "adult" | "exam",',
  '    "mode": "one_to_one" | "small_group" | "classroom"',
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
  "If a mode of 'classroom' is provided, increase font scale planning notes appear in differentiation slide; do not change other slides. Echo the mode value back in metadata.mode so the client can apply classroom font scaling.",
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
function fallbackDeck(audience, target, level, lessonTitle, mode) {
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
                  audience === 'exam_prep' ? 'exam' : audience,
      mode: mode || 'one_to_one'
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
      return jsonResponse(fallbackDeck(audience, target, level, lessonTitle, mode), 200);
    }
    const reason = validateDeck(deck);
    if (reason) {
      console.error('[slideshow] validation failed:', reason);
      return jsonResponse(fallbackDeck(audience, target, level, lessonTitle, mode), 200);
    }
    // Ensure metadata.mode is present (fall back to user-supplied mode).
    if (!deck.metadata.mode) deck.metadata.mode = mode;
    return jsonResponse(deck, 200);
  } catch (err) {
    const { error, status } = userFacingClaudeError(err, 'generate the slideshow');
    return jsonResponse({ error }, status);
  }
}
