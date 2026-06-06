import type { AnalysisResult } from '../types';
import type { ModeProfile, StylePreset } from '../types';
import { buildModePrompt, buildPrompt, DESIGN_FIELDS } from './prompts';
import { validateAnalysisResult } from './validate';

/** Recommended Gemini models for the UI selector. Entries that return 404
 *  from the API will automatically be skipped by listModels(). */
const MODEL_LIST = [
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
];

// Re-export for backward compatibility
export { buildModePrompt };

// ===================================================================
// API 调用
// ===================================================================

export async function callGeminiAI(
  apiKey: string,
  base64Image: string,
  modeProfile?: ModeProfile,
  stylePresets?: StylePreset[],
): Promise<AnalysisResult> {
  const errorDetails: string[] = [];

  const persona = modeProfile?.persona
    || 'You are a senior visual design analyst. Provide comprehensive, insightful analysis of this image from a design perspective.';
  const stylePreset = stylePresets?.find(s => s.id === modeProfile?.styleId);
  const promptParts = [persona];
  if (stylePreset?.instruction) promptParts.push(stylePreset.instruction);
  if (modeProfile?.customInstruction) promptParts.push(modeProfile.customInstruction);
  const prompt = buildPrompt(promptParts.join('\n\n'), DESIGN_FIELDS);

  for (let mi = 0; mi < MODEL_LIST.length; mi++) {
    const modelName = MODEL_LIST[mi];
    if (mi > 0) await new Promise(r => setTimeout(r, Math.min(1000 * 2 ** (mi - 1), 8000)));

    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    let response: Response;
    try {
      response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: 'image/jpeg', data: base64Image } },
            ],
          }],
        }),
      });
    } catch (fetchError) {
      // Network-level error (DNS, TLS, timeout) — do NOT switch models.
      // These are infrastructure failures, not model-specific issues.
      const msg = fetchError instanceof Error ? fetchError.message : String(fetchError);
      throw new Error(`Network error calling ${modelName}: ${msg}`);
    }

    if (!response.ok) {
      // HTTP 4xx/5xx — model-level failure, try next model.
      let msg = `HTTP ${response.status}`;
      try {
        const errData = await response.json();
        msg = errData.error?.message || msg;
      } catch { /* ignore JSON parse failure for error body */ }
      errorDetails.push(`[${modelName}] ${msg}`);
      continue;
    }

    // Parse successful response
    let data: any;
    try {
      data = await response.json();
    } catch (parseError) {
      const msg = parseError instanceof Error ? parseError.message : String(parseError);
      errorDetails.push(`[${modelName}] JSON parse error: ${msg}`);
      continue;
    }

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      errorDetails.push(`[${modelName}] Model returned no valid data`);
      continue;
    }

    const rawText = data.candidates[0].content.parts[0].text;
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      errorDetails.push(`[${modelName}] No valid JSON structure found in response`);
      continue;
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      const msg = parseError instanceof Error ? parseError.message : String(parseError);
      errorDetails.push(`[${modelName}] JSON parse error in extracted block: ${msg}`);
      continue;
    }

    if (!parsed.summary?.zh || !parsed.modeData) {
      errorDetails.push(`[${modelName}] Response JSON missing required fields`);
      continue;
    }

    return validateAnalysisResult(parsed);
  }

  throw new Error(`All analysis channels failed.\n\n${errorDetails.join('\n\n')}`);
}
