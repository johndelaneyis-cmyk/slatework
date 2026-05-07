// POST /api/worksheet
// Generates a printable language worksheet plus a matching answer key.

import { jsonResponse, ipHash, rateCheck, callClaude, corsPreflight, methodNotAllowed, userFacingClaudeError } from "../_lib.js";

export const onRequestOptions = () => corsPreflight('POST');
export const onRequest = () => methodNotAllowed('POST');

const SYSTEM_PROMPT = [
  "You are a language teacher who designs print-ready worksheets and matched answer keys. Given a target language, level, topic, question count, and format, produce a worksheet a teacher could photocopy and a separate answer key the teacher keeps.",
  "",
  "Strict rules:",
  "- Match the requested format: gap_fill (one missing word per blank), multiple_choice (4 options, exactly one correct), short_answer (one-sentence response), or reading_comprehension (one short text + 5–8 questions).",
  "- Keep questions level-appropriate. A B1 worksheet must not require A1 vocabulary or C1 essay form.",
  "- Number every question.",
  "- The answer key must list answers by the same numbers, with a one-sentence note explaining the answer where useful.",
  "- Do not include student names, identifying details, or location-specific facts.",
  "- If an exam or curriculum target is specified, calibrate question style, vocabulary, and difficulty to that exam's published standards. Treat it as the source of truth over generic CEFR-level expectations.",
  "",
  "Output is Markdown with two sections separated by a horizontal rule. The boundary is exactly the line `---ANSWER-KEY---` so the client can split.",
  "",
  "Format:",
  "",
  "## [Worksheet title — by language, level, and topic]",
  "**Instructions:** [one or two sentences]",
  "",
  "1. [Question 1]",
  "2. [Question 2]",
  "...",
  "",
  "---ANSWER-KEY---",
  "",
  "## Answer Key — [same title]",
  "1. [Answer 1] — [optional one-sentence note]",
  "2. [Answer 2] — [optional one-sentence note]",
  "..."
].join("\n");

const DEFAULT_MODEL = "claude-sonnet-4-6";
const PER_IP_DAILY = 15;
const GLOBAL_DAILY = 1500;
const VALID_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const VALID_FORMATS = ['gap_fill', 'multiple_choice', 'short_answer', 'reading_comprehension'];

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid request format.' }, 400); }

  const target = String(body.target_language || '').trim();
  const level = String(body.level || '').trim().toUpperCase();
  const topic = String(body.topic || '').trim();
  const exam = String(body.exam || '').trim();
  const format = String(body.format || 'gap_fill').trim();
  const count = Math.max(3, Math.min(20, parseInt(body.count, 10) || 8));

  if (!target) return jsonResponse({ error: 'Missing target language.' }, 400);
  if (!VALID_LEVELS.includes(level)) return jsonResponse({ error: 'Level must be A1–C2.' }, 400);
  if (topic.length < 2) return jsonResponse({ error: 'Topic too short.' }, 400);
  if (topic.length > 200) return jsonResponse({ error: 'Topic too long (200 chars max).' }, 400);
  if (exam.length > 200) return jsonResponse({ error: 'Exam / curriculum target too long (200 chars max).' }, 400);
  if (!VALID_FORMATS.includes(format)) return jsonResponse({ error: 'Format must be gap_fill, multiple_choice, short_answer, or reading_comprehension.' }, 400);

  if (!env.ANTHROPIC_API_KEY) return jsonResponse({ error: 'Service is being configured. Try again in a few minutes.' }, 503);

  const fp = await ipHash(request);
  const rate = await rateCheck(env, fp, 'worksheet', PER_IP_DAILY, GLOBAL_DAILY);
  if (!rate.ok) return jsonResponse({ error: rate.reason }, rate.status || 429);

  const userMsgLines = [
    `Target language: ${target}`,
    `CEFR level: ${level}`,
    `Topic: ${topic}`,
    `Format: ${format}`,
    `Number of questions: ${count}`
  ];
  if (exam) userMsgLines.push(`Exam / curriculum target: ${exam}`);
  const userMsg = userMsgLines.join('\n');

  try {
    const model = env.ANTHROPIC_MODEL || DEFAULT_MODEL;
    const text = await callClaude(env, { model, system: SYSTEM_PROMPT, user: userMsg, max_tokens: 2500 });
    const idx = text.indexOf('---ANSWER-KEY---');
    if (idx < 0) {
      return jsonResponse({ markdown: text, worksheet: text, answer_key: '' }, 200);
    }
    return jsonResponse({
      worksheet: text.slice(0, idx).trim(),
      answer_key: text.slice(idx + '---ANSWER-KEY---'.length).trim()
    }, 200);
  } catch (err) {
    const { error, status } = userFacingClaudeError(err, 'generate the worksheet');
    return jsonResponse({ error }, status);
  }
}
