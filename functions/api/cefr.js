// POST /api/cefr-assess
// Assesses a writing sample against the CEFR scale and returns level + reasoning.
//
// As of 2026-05-07: text-only. Image OCR happens in /api/ocr (Google Vision)
// before this endpoint is hit.

import { jsonResponse, ipHash, rateCheck, callClaude, corsPreflight, methodNotAllowed, userFacingClaudeError } from "../_lib.js";

export const onRequestOptions = () => corsPreflight('POST');
export const onRequest = () => methodNotAllowed('POST');

const SYSTEM_PROMPT = [
  "You are an experienced language assessor familiar with the CEFR (Common European Framework of Reference for Languages). Given a writing sample in a specified target language, place the writer at one of A1, A2, B1, B2, C1, or C2.",
  "",
  "Strict rules:",
  "- Always cite specific evidence from the sample (a sentence, a structure, a vocabulary range) — do not give a level without naming what justifies it.",
  "- If the sample is too short or off-topic to assess, say so and suggest what additional sample would be needed.",
  "- Confidence is one of: high (≥3 strong evidence points), medium (1–2 evidence points), low (limited evidence).",
  "- Output is JSON only — no markdown, no commentary outside the object.",
  "",
  "Cantonese-specific pedagogy (when target_language is \"Cantonese\"):",
  "- Cantonese is a separate language from Mandarin, not a dialect. When citing evidence, use JYUTPING (1-6 tones), NOT Pinyin (4 tones).",
  "- Expect TRADITIONAL CHARACTERS (繁體字); simplified usage in a Cantonese sample is itself worth flagging in reasoning.",
  "- Cantonese vocabulary diverges from Mandarin: 嘅 NOT 的, 喺 NOT 在, 食 NOT 吃, 飲 NOT 喝, 唔 NOT 不. Sentence-final particles 啊/嘅/喎/啩/咩/啦/嘛 are Cantonese-specific.",
  "- Do NOT downgrade level for using legitimate Cantonese forms (e.g. 我食咗飯, 你去邊度) as if they were Mandarin errors. Score Cantonese on Cantonese norms.",
  "- HKDSE Chinese Lang or HK schoolwork rubrics apply where relevant; 普通話/Putonghua rubrics do not.",
  "",
  "Output exactly this JSON shape:",
  '{"level": "B1", "confidence": "medium", "reasoning": "..."}'
].join("\n");

const DEFAULT_MODEL = "claude-sonnet-4-6";
const PER_IP_DAILY = 30;
const GLOBAL_DAILY = 3000;
const MIN_SAMPLE_LEN = 100;
const MAX_SAMPLE_LEN = 3000;

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid request format.' }, 400); }

  // Canonical param is `target_language` (matches the other 3 AI endpoints).
  // `language` accepted for backward-compat with any external integrations.
  const language = String(body.target_language || body.language || '').trim();
  const sample = String(body.sample || '').trim();

  if (!language) return jsonResponse({ error: 'Missing target language.' }, 400);
  if (sample.length < MIN_SAMPLE_LEN) return jsonResponse({ error: 'Sample too short. Paste at least 100 characters of writing.' }, 400);
  if (sample.length > MAX_SAMPLE_LEN) return jsonResponse({ error: 'Sample too long. Keep it under 3000 characters.' }, 400);

  if (!env.ANTHROPIC_API_KEY) return jsonResponse({ error: 'Service is being configured. Try again in a few minutes.' }, 503);

  const fp = await ipHash(request);
  const rate = await rateCheck(env, fp, 'cefr_assess', PER_IP_DAILY, GLOBAL_DAILY);
  if (!rate.ok) {
    const headers = rate.retryAfterSec ? { 'Retry-After': String(rate.retryAfterSec) } : {};
    return jsonResponse({ error: rate.reason }, rate.status || 429, headers);
  }

  const userMsg = `Target language: ${language}\n\nWriting sample:\n"""\n${sample}\n"""`;

  try {
    const model = env.ANTHROPIC_MODEL || DEFAULT_MODEL;
    const text = await callClaude(env, { model, system: SYSTEM_PROMPT, user: userMsg, max_tokens: 800 });
    let parsed;
    try {
      const m = text.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : null;
    } catch {}
    if (!parsed || !parsed.level) {
      return jsonResponse({ error: 'Assessment came back malformed (no level field in response). Try again, or shorten the sample.' }, 502);
    }
    return jsonResponse({
      level: parsed.level,
      confidence: parsed.confidence || 'medium',
      reasoning: parsed.reasoning || ''
    }, 200);
  } catch (err) {
    const { error, status } = userFacingClaudeError(err, 'assess the writing');
    return jsonResponse({ error }, status);
  }
}
