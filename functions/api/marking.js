// POST /api/marking
// Highlights error categories in a student's writing and returns
// level-matched feedback variants the teacher can paste back.

import { jsonResponse, ipHash, rateCheck, callClaude } from "../_lib.js";

const SYSTEM_PROMPT = [
  "You are an experienced language teacher marking student writing. Given a target language, CEFR level, and a student writing sample (or speaking transcript), you produce: (a) categorised error highlights with examples drawn from the sample, and (b) three feedback paragraphs at different levels of warmth and formality, ready to paste into an email or report.",
  "",
  "Strict rules:",
  "- If the input is an image (a photo of student writing), BEGIN your output with a `## Extracted text` section showing the verbatim text you read from the image. List nothing else in this section — no commentary, no errors yet, just the transcription. Then continue with the normal `## Error highlights` section. The teacher reviews the extracted text for accuracy before trusting the marks below. If the input is pasted text (no image), do NOT include this section.",
  "- Group errors into clear categories: Grammar, Vocabulary, Structure, Mechanics. Within each, give 1–3 specific examples taken verbatim from the sample, with the suggested correction.",
  "- Match feedback to the student's level. B1 feedback shouldn't expect C1 register.",
  "- The three feedback variants are: WARM (encouraging, leads with a strength), DIRECT (lists the top 3 priorities to fix), STRUCTURED (numbered list mapped to a generic rubric: content, accuracy, range, organisation).",
  "- Output is Markdown only. Strict structure shown below.",
  "- Do not include or invent the student's name. Refer to 'the student' or 'you' (in the WARM variant).",
  "",
  "Format:",
  "",
  "## Extracted text",
  "[Only when input is an image. Verbatim transcription of what you read.]",
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

const DEFAULT_MODEL = "claude-sonnet-4-7";
const PER_IP_DAILY = 20;
const GLOBAL_DAILY = 2000;
const MIN_SAMPLE_LEN = 50;
const MAX_SAMPLE_LEN = 4000;
const MAX_IMAGE_BASE64 = 14 * 1024 * 1024;
const VALID_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif']);
const VALID_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid request format.' }, 400); }

  const language = String(body.target_language || '').trim();
  const level = String(body.level || '').trim().toUpperCase();
  const sample = String(body.sample || '').trim();
  const rubric = String(body.rubric || '').trim().slice(0, 200);
  const imageData = typeof body.image_data === 'string' ? body.image_data : '';
  const imageMime = typeof body.image_mime === 'string' ? body.image_mime : '';
  const hasImage = imageData.length > 0;

  if (!language) return jsonResponse({ error: 'Missing target language.' }, 400);
  if (!VALID_LEVELS.includes(level)) return jsonResponse({ error: 'Level must be A1–C2.' }, 400);
  if (hasImage) {
    if (imageData.length > MAX_IMAGE_BASE64) return jsonResponse({ error: 'Image too big — max 10 MB.' }, 400);
    if (!VALID_IMAGE_MIMES.has(imageMime)) return jsonResponse({ error: 'Unsupported image format.' }, 400);
  } else {
    if (sample.length < MIN_SAMPLE_LEN) return jsonResponse({ error: 'Sample too short. Paste at least 50 characters or attach a photo.' }, 400);
  }
  if (sample.length > MAX_SAMPLE_LEN) return jsonResponse({ error: 'Sample too long (max 4000 chars).' }, 400);

  if (!env.ANTHROPIC_API_KEY) return jsonResponse({ error: 'Service is being configured. Try again in a few minutes.' }, 503);

  const fp = await ipHash(request);
  const rate = await rateCheck(env, fp, 'marking', PER_IP_DAILY, GLOBAL_DAILY);
  if (!rate.ok) return jsonResponse({ error: rate.reason }, rate.status || 429);

  const baseLines = [
    `Target language: ${language}`,
    `CEFR level: ${level}`,
    rubric ? `Rubric tag: ${rubric}` : ''
  ].filter(Boolean);

  let textBody;
  if (hasImage && sample.length === 0) {
    textBody = baseLines.concat([
      '',
      "Mark this student writing. The image attached above is the student's work — extract the text mentally and grade it as you would any pasted writing. Use the same error categorization and feedback variants as if the text had been pasted directly."
    ]).join('\n');
  } else {
    textBody = baseLines.concat([
      '',
      'Student writing sample:',
      '"""',
      sample,
      '"""'
    ]).join('\n');
  }

  let userPayload;
  if (hasImage) {
    userPayload = [
      { type: 'image', source: { type: 'base64', media_type: imageMime, data: imageData } },
      { type: 'text', text: textBody }
    ];
  } else {
    userPayload = textBody;
  }

  try {
    const model = env.ANTHROPIC_MODEL || DEFAULT_MODEL;
    const text = await callClaude(env, { model, system: SYSTEM_PROMPT, user: userPayload, max_tokens: 2500 });
    return jsonResponse({ markdown: text }, 200);
  } catch {
    return jsonResponse({ error: 'Could not mark the sample. Try again in a moment.' }, 502);
  }
}
