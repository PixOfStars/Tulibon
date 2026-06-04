import type { ModeProfile, StylePreset } from '../types';

interface FieldDef { key: string; zh: string; en: string; }

export const DESIGN_FIELDS: FieldDef[] = [
  { key: 'imageContent',       zh: '图片内容',   en: 'Image Content' },
  { key: 'designPurpose',      zh: '设计目的',   en: 'Design Purpose' },
  { key: 'designStyle',        zh: '设计风格',   en: 'Design Style' },
  { key: 'layoutComposition',  zh: '布局构图',   en: 'Layout & Composition' },
  { key: 'colorTypography',    zh: '配色排版',   en: 'Color & Typography' },
  { key: 'takeaways',          zh: '可借鉴点',   en: 'Takeaways' },
];

export function buildPrompt(persona: string, fields: FieldDef[]): string {
  const fieldLines = fields.map(f =>
    `    "${f.key}": {"zh": "…", "en": "…"}`,
  ).join(',\n');

  const fieldDesc = fields.map(f =>
    `  - ${f.key}: ${f.zh} / ${f.en}`,
  ).join('\n');

  return `
${persona}

分析要求：
1. 每个字段用中文和英文分别撰写，保持简洁（1-3 句）。
2. 生成 5-8 个视觉标签（中英双语数组）。
3. 输出一句话总结（中英双语，作为 summary）。
4. 附带一个可用于 AI 图片生成的 Prompt（中英双语，key 为 "prompt"）。

需要分析的字段及含义：
${fieldDesc}

严格按以下 JSON 返回，不含 markdown：
{
  "summary": {"zh": "一句话中文总结", "en": "One-sentence English summary"},
  "systemTags": {"zh": ["标签1","标签2","标签3","标签4","标签5"], "en": ["tag1","tag2","tag3","tag4","tag5"]},
  "modeData": {
${fieldLines},
    "prompt": {"zh": "中文 Prompt", "en": "English Prompt"}
  }
}`.trim();
}

/** Build prompt from a ModeProfile + StylePresets */
export function buildModePrompt(modeProfile: ModeProfile, stylePresets: StylePreset[]): string {
  const style = stylePresets.find(s => s.id === modeProfile.styleId);
  const styleInstr = style?.instruction || '';

  const parts: string[] = [];
  parts.push(modeProfile.persona);
  if (styleInstr) parts.push(styleInstr);
  if (modeProfile.customInstruction) parts.push(modeProfile.customInstruction);

  return buildPrompt(parts.join('\n\n'), DESIGN_FIELDS);
}
