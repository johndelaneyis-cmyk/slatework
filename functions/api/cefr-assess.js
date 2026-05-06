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

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid request format.' }, 400); }

  const language = String(body.language || '').trim();
  const sample = String(body.sample || '').trim();

  if (!language) return jsonResponse({ error: 'Missing target language.' }, 400);
  if (sample.length < MIN_SAMPLE_LEN) return jsonResponse({ error: 'Sample too short. Paste at least 100 characters.' }, 400);
  if (sample.length > MAX_SAMPLE_LEN) return jsonResponse({ error: 'Sample too long. Keep it under 3000 characters.' }, 400);

  if (!env.ANTHROPIC_API_KEY) return jsonResponse({ error: 'Service is being configured. Try again in a few minutes.' }, 503);

  const fp = await ipHash(request);
  const rate = await rateCheck(env, fp, 'cefr_assess', PER_IP_DAILY, GLOBAL_DAILY);
  if (!rate.ok) return jsonResponse({ error: rate.reason }, rate.status || 429);

  const userMsg = `Target language: ${language}\n\nWriting sample:\n"""\n${sample}\n"""`;

  try {
    const text = await callClaude(env, { model: MODEL, system: SYSTEM_PROMPT, user: userMsg, max_tokens: 800 });
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
