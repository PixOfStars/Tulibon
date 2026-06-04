import type { AnalysisRecord, Tag, CropRect } from '../../types';

export function doCrop(dataUrl: string, rect: CropRect): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = rect.width;
      canvas.height = rect.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
      resolve(canvas.toDataURL());
    };
    img.src = dataUrl;
  });
}

export function getModeDataSearchableText(md: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [, value] of Object.entries(md)) {
    if (value && typeof value === 'object') {
      if ('zh' in (value as object)) {
        parts.push((value as Record<string, string>).zh);
        parts.push((value as Record<string, string>).en);
      } else if (Array.isArray(value) && typeof (value as unknown[])[0] === 'string') {
        parts.push(...(value as string[]));
      }
    } else if (typeof value === 'string') {
      parts.push(value);
    }
  }
  return parts.join(' ').toLowerCase();
}

export function searchRecords(records: AnalysisRecord[], tags: Tag[], query: string): AnalysisRecord[] {
  const q = query.toLowerCase().trim();
  if (!q) return records;
  return records.filter(r => {
    if (r.summary.zh.toLowerCase().includes(q) || r.summary.en.toLowerCase().includes(q)) return true;
    const allTagIds = [...r.systemTags, ...r.userTags];
    const tagNames = allTagIds.map(tid => tags.find(t => t.id === tid)?.name);
    if (tagNames.some(tn => tn && (tn.zh.toLowerCase().includes(q) || tn.en.toLowerCase().includes(q)))) return true;
    if (getModeDataSearchableText(r.modeData as unknown as Record<string, unknown>).includes(q)) return true;
    return false;
  });
}

export const iconBtnStyle = (colors: Record<string, string>): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '8px 14px', borderRadius: 10, border: `1px solid ${colors.border}`,
  backgroundColor: 'transparent', color: colors.textHeader,
  fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
});

export const smallBtnStyle = (colors: Record<string, string>): React.CSSProperties => ({
  padding: '6px 14px', borderRadius: 6, border: `1px solid ${colors.border}`,
  backgroundColor: 'transparent', color: colors.text, fontSize: 11, fontWeight: 600, cursor: 'pointer',
});
