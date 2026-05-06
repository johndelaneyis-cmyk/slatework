// POST /api/marking
// Highlights error categories in a student's writing and returns
// level-matched feedback variants the teacher can paste back.

import { jsonResponse, ipHash, rateCheck, callClaude } from "../_lib.js";

const SYSTEM_PROMPT = [
  "You are an experienced language teacher marking student writing. Given a target language, CEFR level, and a student writing sample (or speaking transcript), you produce: (a) categorised error highlights with examples drawn from the sample, and (b) three feedback paragraphs at different levels of warmth and formality, ready to paste into an email or report.",
  "",
  "Strict rules:",
  "- Group errors into clear categories: Grammar, Vocabulary, Structure, Mechanics. Within each, give 1–3 specific examples taken verbatim from the sample, with the suggested correction.",
  "- Match feedback to the student's level. B1 feedback shouldn't expect C1 register.",
  "- The three feedback variants are: WARM (encouraging, leads with a strength), DIRECT (lists the top 3 priorities to fix), STRUCTURED (numbered list mapped to a generic rubric: content, accuracy, range, organisation).",
  "- Output is Markdown only. Strict structure shown below.",
  "- Do not include or invent the student's name. Refer to 'the student' or 'you' (in the WARM variant).",
  "",
  "Format:",
  "",
  "## Error highlights",
  "",
  "### Grammar",
  "- *\"[verbatim phrase from sample]\"* → [correction] — [one-sentence explanation]",
  "",
  "### Vocabulary",
  "- ...",
  "",
  "### Structure",
  "- ...",
  "",
  "### Mechanics",
  "- ...",
  "",
  "## Feedback variants",
  "",
  "### Warm",
  "[Paragraph that leads with a genuine strength, then names 1–2 things to focus on next.]",
  "",
  "### Direct",
  "[Numbered list of the top 3 priorities. One sentence each.]",
  "",
  "### Structured (rubric-mapped)",
  "1. **Content** — [one-sentence comment]",
  "2. **Accuracy** — [comment]",
  "3. **Range** — [comment]",
  "4. **Organisation** — [comment]"
].join("\n");

const MODEL = "claude-sonnet-4-6";
const PER_IP_DAILY = 20;
const GLOBAL_DAILY = 2000;
const MIN_SAMPLE_LEN = 50;
const MAX_SAMPLE_LEN = 4000;
const VALID_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid request format.' }, 400); }

  const language = String(body.target_language || '').trim();
  const level = String(body.level || '').trim().toUpperCase();
  const sample = String(body.sample || '').trim();
  const rubric = String(body.rubric || '').trim().slice(0, 200);

  if (!language) return jsonResponse({ error: 'Missing target language.' }, 400);
  if (!VALID_LEVELS.includes(level)) return jsonResponse({ error: 'Level must be A1–C2.' }, 400);
  if (sample.length < MIN_SAMPLE_LEN) return jsonResponse({ error: 'Sample too short. Paste at least 50 characters.' }, 400);
  if (sample.length > MAX_SAMPLE_LEN) return jsonResponse({ error: 'Sample too long (max 4000 chars).' }, 400);

  if (!env.ANTHROPIC_API_KEY) return jsonResponse({ error: 'Service is being configured. Try again in a few minutes.' }, 503);

  const fp = await ipHash(request);
  const rate = await rateCheck(env, fp, 'marking', PER_IP_DAILY, GLOBAL_DAILY);
  if (!rate.ok) return jsonResponse({ error: rate.reason }, rate.status || 429);

  const userMsg = [
    `Target language: ${language}`,
    `CEFR level: ${level}`,
    rubric ? `Rubric tag: ${rubric}` : '',
    '',
    'Student writing sample:',
    '"""',
    sample,
    '"""'
  ].filter(Boolean).join('\n');

  try {
    const text = await callClaude(env, { model: MODEL, system: SYSTEM_PROMPT, user: userMsg, max_tokens: 2500 });
    return jsonResponse({ markdown: text }, 200);
  } catch {
    return jsonResponse({ error: 'Could not mark the sample. Try again in a moment.' }, 502);
  }
}
