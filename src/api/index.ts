import { callGeminiAI } from './geminiProvider';
import { callOpenAICompatible } from './openaiProvider';
import type { ProviderConfig, AnalysisResult, ModeProfile, StylePreset } from '../types';

export type { AnalysisResult };

export async function analyzeImage(
  provider: ProviderConfig,
  base64Image: string,
  modeProfile?: ModeProfile,
  stylePresets?: StylePreset[],
): Promise<AnalysisResult> {
  const imageData = base64Image.replace(/^data:image\/\w+;base64,/, '');

  switch (provider.id) {
    case 'gemini':
      return callGeminiAI(provider.apiKey, imageData, modeProfile, stylePresets);
    case 'openai':
    case 'custom':
      return callOpenAICompatible(provider.endpoint, provider.apiKey, provider.model, imageData, modeProfile, stylePresets);
    default:
      throw new Error(`Unknown provider: ${provider.id}`);
  }
}

export function getDefaultProviders(): ProviderConfig[] {
  return [
    {
      id: 'gemini',
      name: 'Gemini',
      apiKey: '',
      endpoint: 'https://generativelanguage.googleapis.com',
      model: 'gemini-2.5-flash',
      enabled: true,
    },
    {
      id: 'openai',
      name: 'OpenAI',
      apiKey: '',
      endpoint: 'https://api.openai.com/v1',
      model: 'gpt-4o',
      enabled: false,
    },
    {
      id: 'custom',
      name: 'Custom',
      apiKey: '',
      endpoint: 'https://api.openai.com/v1',
      model: 'gpt-4o',
      enabled: false,
    },
  ];
}
