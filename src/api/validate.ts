import type { AnalysisResult } from '../types';

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isLocalizedText(v: unknown): v is { zh: string; en: string } {
  return isObject(v) && typeof v.zh === 'string' && typeof v.en === 'string';
}

function isLocalizedArray(v: unknown): v is { zh: string[]; en: string[] } {
  if (!isObject(v)) return false;
  const zh = v.zh;
  const en = v.en;
  return Array.isArray(zh) && zh.every((x: unknown) => typeof x === 'string')
      && Array.isArray(en) && en.every((x: unknown) => typeof x === 'string');
}

const MODE_DATA_KEYS = [
  'imageContent', 'designPurpose', 'designStyle',
  'layoutComposition', 'colorTypography', 'takeaways', 'prompt',
];

function isModeData(v: unknown): boolean {
  if (!isObject(v)) return false;
  return MODE_DATA_KEYS.every(k => isLocalizedText(v[k]));
}

export function validateAnalysisResult(parsed: unknown): AnalysisResult {
  if (!isObject(parsed)) {
    throw new Error('Response is not a JSON object');
  }
  if (!isLocalizedText(parsed.summary)) {
    throw new Error('Response JSON missing valid "summary" field');
  }
  if (!isLocalizedArray(parsed.systemTags)) {
    throw new Error('Response JSON missing valid "systemTags" field');
  }
  if (!isModeData(parsed.modeData)) {
    throw new Error('Response JSON missing valid "modeData" fields');
  }
  return parsed as unknown as AnalysisResult;
}
