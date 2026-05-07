// POST /api/ocr — extract text from an image via Google Cloud Vision
// (DOCUMENT_TEXT_DETECTION). Used by the Marking Accelerator and CEFR AI
// Assessor as a pre-step: get the text, populate the textarea, let the
// user review/edit, then submit text-only to /api/marking or /api/cefr-assess.
//
// Decoupling OCR from the marking LLM call avoids Anthropic's vision
// content classifier rejecting photos of student writing (which often
// contain a child's hand or context that trips their safety filter).

import { jsonResponse, ipHash, rateCheck, callGoogleVision, corsPreflight, methodNotAllowed, userFacingClaudeError } from "../_lib.js";

export const onRequestOptions = () => corsPreflight('POST');
export const onRequest = () => methodNotAllowed('POST');

const PER_IP_DAILY = 100;
const GLOBAL_DAILY = 10000;
const MAX_IMAGE_BASE64 = 5 * 1024 * 1024;
const VALID_IMAGE_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return jsonResponse({ error: 'Invalid request format.' }, 400); }

  const imageData = typeof body.image_data === 'string' ? body.image_data : '';
  const imageMime = typeof body.image_mime === 'string' ? body.image_mime : '';

  if (!imageData) return jsonResponse({ error: 'Missing image_data.' }, 400);
  if (imageData.length > MAX_IMAGE_BASE64) {
    return jsonResponse({ error: `Image too large after upload (${(imageData.length/1024/1024).toFixed(1)} MB). Re-attach so the client can resize.` }, 400);
  }
  if (!VALID_IMAGE_MIMES.has(imageMime)) {
    return jsonResponse({ error: `Image format "${imageMime}" not supported. Use JPEG, PNG, WebP, or GIF (HEIC needs to be converted first).` }, 400);
  }

  if (!env.GOOGLE_VISION_API_KEY) {
    return jsonResponse({
      error: "Photo OCR isn't configured on the server yet. Type or paste the writing into the text box below — that always works.",
      ocr_unavailable: true
    }, 503);
  }

  const fp = await ipHash(request);
  const rate = await rateCheck(env, fp, 'ocr', PER_IP_DAILY, GLOBAL_DAILY);
  if (!rate.ok) return jsonResponse({ error: rate.reason }, rate.status || 429);

  try {
    const text = await callGoogleVision(env, { base64: imageData, mime: imageMime });
    if (!text || !text.trim()) {
      return jsonResponse({
        error: "OCR ran but didn't find any readable text. Try a clearer / better-lit photo, or type the writing into the text box below.",
        text: '',
        ocr_empty: true
      }, 200);  // Not an error per se — text just empty
    }
    return jsonResponse({ text, char_count: text.length }, 200);
  } catch (err) {
    const { error, status } = userFacingClaudeError(err, 'extract text from the image');
    return jsonResponse({ error, ocr_failed: true }, status);
  }
}
