import zh from '../../locales/zh.json';
import en from '../../locales/en.json';

export interface FieldConfig {
  key: string;
  labelKey: string;
  isPrompt?: boolean;
}

export const MODE_FIELD_CONFIGS: FieldConfig[] = [
  { key: 'imageContent',       labelKey: 'fieldImageContent' },
  { key: 'designPurpose',      labelKey: 'fieldDesignPurpose' },
  { key: 'designStyle',        labelKey: 'fieldDesignStyle' },
  { key: 'layoutComposition',  labelKey: 'fieldLayoutComposition' },
  { key: 'colorTypography',    labelKey: 'fieldColorTypography' },
  { key: 'takeaways',          labelKey: 'fieldTakeaways' },
  { key: 'prompt',             labelKey: 'fieldPrompt', isPrompt: true },
];

export const DEFAULT_EXPANDED: string[] = ['imageContent', 'designPurpose'];

const FIELD_LABELS_ZH: Record<string, string> = {};
const FIELD_LABELS_EN: Record<string, string> = {};

for (const f of MODE_FIELD_CONFIGS) {
  FIELD_LABELS_ZH[f.key] = (zh as Record<string, string>)[f.labelKey] || f.key;
  FIELD_LABELS_EN[f.key] = (en as Record<string, string>)[f.labelKey] || f.key;
}

export const FIELD_LABELS: Record<string, { zh: string; en: string }> = {};
for (const key of Object.keys(FIELD_LABELS_ZH)) {
  FIELD_LABELS[key] = { zh: FIELD_LABELS_ZH[key], en: FIELD_LABELS_EN[key] };
}
