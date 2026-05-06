// POST /api/cefr-assess
// Assesses a writing sample against the CEFR scale and returns level + reasoning.

import { jsonResponse, ipHash, rateCheck, callClaude } from "../_lib.js";

const SYSTEM_PROMPT = [
  "You are an experienced language assessor familiar with the CEFR (Common European Framework of Reference for Languages). Given a writing sample in a specified target language, place the writer at one of A1, A2, B1, B2, C1, or C2.",
  "",
  "Strict rules:",
  "- Always cite specific evidence from the sample (a sentence, a structure, a vocabulary range) — do not give a level without naming what justifies it.",
  "- If the sample is too short or off-topic to assess, say so and suggest what additional sample would be needed.",
  "- Confidence is one of: high (≥3 strong evidence points), medium (1–2 evidence points), low (limited evidence).",
  "- Output is JSON only — no markdown, no commentary outside the object.",
  "",
  "Output exactly this JSON shape:",
  '{"level": "B1", "confidence": "medium", "reasoning": "Multi-paragraph explanation citing specific evidence from the sample."}'
].join("\n");

const MODEL = "claude-sonnet-4-6";
const PER_IP_DAILY = 15;
const GLOBAL_DAILY = 1500;
const MIN_SAMPLE_LEN = 100;
const MAX_SAMPLE_LEN = 3000;
const MAX_IMAGE_BASE64 = 14 * 1024 * 1024;
const VALID_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif']);

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid request format.' }, 400); }

  const language = String(body.language || '').trim();
  const sample = String(body.sample || '').trim();
  const imageData = typeof body.image_data === 'string' ? body.image_data : '';
  const imageMime = typeof body.image_mime === 'string' ? body.image_mime : '';
  const hasImage = imageData.length > 0;

  if (!language) return jsonResponse({ error: 'Missing target language.' }, 400);
  if (hasImage) {
    if (imageData.length > MAX_IMAGE_BASE64) return jsonResponse({ error: 'Image too big — max 10 MB.' }, 400);
    if (!VALID_IMAGE_MIMES.has(imageMime)) return jsonResponse({ error: 'Unsupported image format.' }, 400);
  } else {
    if (sample.length < MIN_SAMPLE_LEN) return jsonResponse({ error: 'Sample too short. Paste at least 100 characters or attach a photo.' }, 400);
  }
  if (sample.length > MAX_SAMPLE_LEN) return jsonResponse({ error: 'Sample too long. Keep it under 3000 characters.' }, 400);

  if (!env.ANTHROPIC_API_KEY) return jsonResponse({ error: 'Service is being configured. Try again in a few minutes.' }, 503);

  const fp = await ipHash(request);
  const rate = await rateCheck(env, fp, 'cefr_assess', PER_IP_DAILY, GLOBAL_DAILY);
  if (!rate.ok) return jsonResponse({ error: rate.reason }, rate.status || 429);

  let textBody;
  if (hasImage && sample.length === 0) {
    textBody = `Target language: ${language}\n\nThe image attached above is the student's writing sample. Read it as if it had been pasted as text and place the writer at A1, A2, B1, B2, C1, or C2. Cite specific evidence from the writing in the image.`;
  } else {
    textBody = `Target language: ${language}\n\nWriting sample:\n"""\n${sample}\n"""`;
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
    const text = await callClaude(env, { model: MODEL, system: SYSTEM_PROMPT, user: userPayload, max_tokens: 800 });
    let parsed;
    try {
      const m = text.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : null;
    } catch {}
    if (!parsed || !parsed.level) {
      return jsonResponse({ error: 'Assessment came back malformed. Try again.' }, 502);
    }
    return jsonResponse({
      level: parsed.level,
      confidence: parsed.confidence || 'medium',
      reasoning: parsed.reasoning || ''
    }, 200);
  } catch {
    return jsonResponse({ error: 'Could not assess. Try again in a moment.' }, 502);
  }
}
