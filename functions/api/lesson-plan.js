// POST /api/lesson-plan
// Generates a structured language lesson plan (1:1, small group, or classroom).

import { jsonResponse, ipHash, rateCheck, callClaude } from "../_lib.js";

const SYSTEM_PROMPT = [
  "You are an experienced language teacher. Given a target language, source language, CEFR level, mode (1:1 / small group / classroom), and lesson goal, produce a focused, time-blocked lesson plan that another teacher could pick up and run.",
  "",
  "Strict rules:",
  "- Always return Markdown with the exact section headers shown below.",
  "- Pick activities that are level-appropriate. A B1 lesson should not assume A1 vocabulary, nor demand C1 essay structure.",
  "- For classroom mode, plan for 25 students unless told otherwise: include grouping decisions and an exit ticket.",
  "- For 1:1 mode, lean into individual feedback opportunities.",
  "- Be concrete. Don't say \"do a warmup\" — say what the warmup is.",
  "- Time the plan to fit a 60-minute lesson by default; adjust if the user specifies otherwise.",
  "- If an exam or curriculum target is specified, calibrate question style, vocabulary, and difficulty to that exam's published standards. Treat it as the source of truth over generic CEFR-level expectations.",
  "",
  "Format your response as Markdown:",
  "",
  "## Lesson at a glance",
  "[1–2 sentences naming target language, level, goal, and how the lesson will reach it.]",
  "",
  "## Materials",
  "[Bulleted list. If a handout or worksheet is needed, name it; reference Slatework's worksheet generator if the teacher will create it.]",
  "",
  "## Warmup (5 min)",
  "[Concrete activity, with what to say and what to ask.]",
  "",
  "## Core teaching block (20 min)",
  "[The main teaching moment. Show the structure being taught with a concrete example in the target language. Include 1 modelling step and 1 guided practice step.]",
  "",
  "## Practice / production (20 min)",
  "[Activity where students use the language. Include grouping for classroom mode.]",
  "",
  "## Wrap-up + assignment (10 min)",
  "[Brief recap. Concrete homework or extension task.]",
  "",
  "## Exit ticket (classroom mode) or feedback prompt (1:1 / small group)",
  "[A single question or task that lets the teacher gauge whether the lesson stuck.]",
  "",
  "## Differentiation notes",
  "[2–3 sentences on how to adjust if a student is ahead or struggling.]"
].join("\n");

const DEFAULT_MODEL = "claude-sonnet-4-7";
const PER_IP_DAILY = 15;
const GLOBAL_DAILY = 1500;
const MIN_GOAL_LEN = 10;
const MAX_GOAL_LEN = 600;

const VALID_MODES = ['one_to_one', 'small_group', 'classroom'];
const VALID_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid request format.' }, 400); }

  const target = String(body.target_language || '').trim();
  const source = String(body.source_language || 'English').trim();
  const level = String(body.level || '').trim().toUpperCase();
  const mode = String(body.mode || 'one_to_one').trim();
  const goal = String(body.goal || '').trim();
  const exam = String(body.exam || '').trim();

  if (!target) return jsonResponse({ error: 'Missing target language.' }, 400);
  if (!VALID_LEVELS.includes(level)) return jsonResponse({ error: 'Level must be one of A1, A2, B1, B2, C1, C2.' }, 400);
  if (!VALID_MODES.includes(mode)) return jsonResponse({ error: 'Mode must be one_to_one, small_group, or classroom.' }, 400);
  if (goal.length < MIN_GOAL_LEN) return jsonResponse({ error: 'Lesson goal too short. 10+ characters please.' }, 400);
  if (goal.length > MAX_GOAL_LEN) return jsonResponse({ error: 'Lesson goal too long. Keep it under 600 characters.' }, 400);
  if (exam.length > 200) return jsonResponse({ error: 'Exam / curriculum target too long (200 chars max).' }, 400);

  if (!env.ANTHROPIC_API_KEY) return jsonResponse({ error: 'Service is being configured. Try again in a few minutes.' }, 503);

  const fp = await ipHash(request);
  const rate = await rateCheck(env, fp, 'lesson_plan', PER_IP_DAILY, GLOBAL_DAILY);
  if (!rate.ok) return jsonResponse({ error: rate.reason }, rate.status || 429);

  const userMsgLines = [
    `Target language: ${target}`,
    `Source language: ${source}`,
    `CEFR level: ${level}`,
    `Mode: ${mode.replace('_', ' ')}`,
    `Lesson goal: ${goal}`
  ];
  if (exam) userMsgLines.push(`Exam / curriculum target: ${exam}`);
  const userMsg = userMsgLines.join('\n');

  try {
    const model = env.ANTHROPIC_MODEL || DEFAULT_MODEL;
    const text = await callClaude(env, { model, system: SYSTEM_PROMPT, user: userMsg, max_tokens: 2000 });
    return jsonResponse({ markdown: text }, 200);
  } catch (e) {
    return jsonResponse({ error: 'Could not generate the lesson plan. Try again in a moment.' }, 502);
  }
}
