import type { AnalysisResult } from '../types';
import type { ModeProfile, StylePreset } from '../types';
import { buildModePrompt, buildPrompt, DESIGN_FIELDS } from './prompts';
import { validateAnalysisResult } from './validate';

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
    try {
      const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

      const response = await fetch(API_URL, {
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

      if (!response.ok) {
        const errData = await response.json();
        const msg = errData.error?.message || 'API access restricted';
        errorDetails.push(`[${modelName}] ${msg}`);
        throw new Error(msg);
      }

      const data = await response.json();
      if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('Model returned no valid data');
      }

      const rawText = data.candidates[0].content.parts[0].text;
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON structure found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.summary?.zh || !parsed.modeData) {
        throw new Error('Response JSON missing required fields');
      }

      return validateAnalysisResult(parsed);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      if (!errorDetails.some(err => err.includes(modelName))) {
        errorDetails.push(`[${modelName}] ${errorMessage}`);
      }
    }
  }

  throw new Error(`All analysis channels failed.\n\n${errorDetails.join('\n\n')}`);
}
