import type { ModeProfile, StylePreset, AnalysisResult } from '../types';
import { buildModePrompt } from './prompts';
import { validateAnalysisResult } from './validate';

const DEFAULT_PERSONA = 'You are a senior visual design analyst. Provide comprehensive, insightful analysis of this image from a design perspective.';

export async function callOpenAICompatible(
  endpoint: string,
  apiKey: string,
  model: string,
  base64Image: string,
  modeProfile?: ModeProfile,
  stylePresets?: StylePreset[],
): Promise<AnalysisResult> {
  const prompt = (modeProfile && stylePresets)
    ? buildModePrompt(modeProfile, stylePresets)
    : buildModePrompt(
        { id: 'design', name: { zh: '设计分析', en: 'Design Analysis' }, persona: DEFAULT_PERSONA, styleId: 'ui_design', customInstruction: '', modeType: 'design', isBuiltIn: false },
        stylePresets || [],
      );

  const response = await fetch(`${endpoint}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const errData = await response.json();
    throw new Error(errData.error?.message || `HTTP ${response.status}: API request failed`);
  }

  const data = await response.json();
  const rawText = data.choices?.[0]?.message?.content;
  if (!rawText) {
    throw new Error('Model returned no valid data');
  }

  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No valid JSON structure found in response');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  if (!parsed.summary?.zh || !parsed.modeData) {
    throw new Error('Response JSON missing required fields');
  }

  return validateAnalysisResult(parsed);
}
