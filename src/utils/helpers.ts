import type { AnalysisRecord, AnalysisRecord_Legacy, LocalizedText, DesignAnalysisData, Tag, ImageSource } from '../types';

import { tauriInvoke } from './tauri';

export function generateId(): string {
  return crypto.randomUUID();
}

/** Save a base64 image to disk as WebP, returns the file path */
export async function saveImageToDisk(id: string, base64DataUrl: string): Promise<string> {
  return tauriInvoke('save_image', { id, base64Data: base64DataUrl });
}

/** Load an image from disk path, returns base64 data URL */
export async function loadImageFromDisk(path: string): Promise<string> {
  return tauriInvoke('load_image', { path });
}

// ===================================================================
// 数据迁移
// ===================================================================

/** 检测 JSON 是否为旧格式 */
export function isLegacyRecord(record: unknown): record is AnalysisRecord_Legacy {
  if (!record || typeof record !== 'object') return false;
  const r = record as Record<string, unknown>;
  return 'promptCn' in r && 'tagsCn' in r && 'level' in r;
}

/** 旧 AnalysisRecord_Legacy → 新 AnalysisRecord */
export function migrateLegacyRecord(old: AnalysisRecord_Legacy, existingTagMap: Map<string, Tag>): AnalysisRecord {
  const now = Date.now();

  const systemTagIds: string[] = [];
  const allTags = old.tagsCn.map((cn, i) => ({
    zh: cn,
    en: old.tagsEn[i] || cn,
  }));

  for (const tagName of allTags) {
    const tagId = `tag_${tagName.zh.toLowerCase().replace(/\s+/g, '_')}`;
    if (!existingTagMap.has(tagId)) {
      existingTagMap.set(tagId, {
        id: tagId,
        name: { zh: tagName.zh, en: tagName.en },
        source: 'system',
        createdAt: now,
      });
    }
    systemTagIds.push(tagId);
  }

  const summary: LocalizedText = {
    zh: old.promptCn.slice(0, 80),
    en: old.promptEn.slice(0, 120),
  };

  const modeData: DesignAnalysisData = {
    imageContent: { zh: old.promptCn, en: old.promptEn },
    designPurpose: { zh: '', en: '' },
    designStyle: { zh: '', en: '' },
    layoutComposition: { zh: '', en: '' },
    colorTypography: { zh: '', en: '' },
    takeaways: { zh: `从旧版记录迁移（原模式: ${old.level}）`, en: `Migrated from legacy record (original level: ${old.level})` },
    prompt: { zh: '', en: '' },
  };

  return {
    id: old.id,
    imagePath: old.imageDataUrl, // legacy records keep the base64 data url temporarily
    source: 'clipboard' as ImageSource,
    analysisMode: 'design',
    summary,
    systemTags: systemTagIds,
    userTags: [],
    collectionIds: old.favorite ? ['__favorites'] : [],
    modeData,
    createdAt: old.timestamp,
    updatedAt: old.timestamp,
  };
}

/** 批量迁移，返回迁移后的记录和新创建的 tags */
export function migrateHistory(raw: string): { records: AnalysisRecord[]; tags: Tag[] } {
  let parsed: unknown[];
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { records: [], tags: [] };
  }

  if (!Array.isArray(parsed)) return { records: [], tags: [] };

  const tagMap = new Map<string, Tag>();
  const records: AnalysisRecord[] = [];

  for (const item of parsed) {
    if (isLegacyRecord(item)) {
      records.push(migrateLegacyRecord(item, tagMap));
    } else if (isAnalysisRecord(item)) {
      records.push(item);
    }
  }

  return { records, tags: Array.from(tagMap.values()) };
}

function isAnalysisRecord(record: unknown): record is AnalysisRecord {
  if (!record || typeof record !== 'object') return false;
  const r = record as Record<string, unknown>;
  return 'analysisMode' in r && 'modeData' in r && 'summary' in r && 'source' in r;
}

// ===================================================================
// 导出
// ===================================================================

function localizedToStr(lt: LocalizedText, lang: 'zh' | 'en'): string {
  return lang === 'zh' ? lt.zh : lt.en;
}

function flattenModeData(md: DesignAnalysisData, lang: 'zh' | 'en'): string {
  const data = md as unknown as Record<string, unknown>;
  const lines: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object' && 'zh' in (value as object)) {
      const lt = value as LocalizedText;
      lines.push(`${key}: ${lang === 'zh' ? lt.zh : lt.en}`);
    } else if (typeof value === 'string') {
      lines.push(`${key}: ${value}`);
    }
  }
  return lines.join('\n');
}

export function exportAsTxt(record: AnalysisRecord, lang: 'zh' | 'en', labels: { report: string; summary: string; tags: string; analysis: string }): string {
  return [
    `=== ${labels.report} ===`,
    '',
    `[${labels.summary}]`,
    localizedToStr(record.summary, lang),
    '',
    `[${labels.tags}]`,
    `  ${record.systemTags.join(', ')}`,
    record.userTags.length > 0 ? `  ${record.userTags.join(', ')}` : '',
    '',
    `[${labels.analysis}]`,
    flattenModeData(record.modeData, lang),
  ].filter(l => l !== '').join('\n');
}

export function exportAsMarkdown(record: AnalysisRecord, lang: 'zh' | 'en', labels: { report: string; summary: string; tags: string; analysis: string }): string {
  return [
    `# ${labels.report}`,
    '',
    `## ${labels.summary}`,
    localizedToStr(record.summary, lang),
    '',
    `## ${labels.tags}`,
    record.systemTags.map(t => `\`${t}\``).join(' '),
    record.userTags.length > 0 ? record.userTags.map(t => `\`${t}\``).join(' ') : '',
    '',
    `## ${labels.analysis}`,
    flattenModeData(record.modeData, lang),
  ].join('\n');
}

export function base64FromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function base64FromUrl(url: string, timeoutMs = 10000): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const timeout = setTimeout(() => {
      img.src = '';
      reject(new Error('Image load timed out'));
    }, timeoutMs);
    img.onload = () => {
      clearTimeout(timeout);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas context failed')); return; }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Failed to load image from URL'));
    };
    img.src = url;
  });
}

export function formatDate(ts: number, lang: 'zh' | 'en'): string {
  const d = new Date(ts);
  if (lang === 'zh') {
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const hh = d.getHours().toString().padStart(2, '0');
    const mm = d.getMinutes().toString().padStart(2, '0');
    return `${d.getFullYear()}/${month}/${day} ${hh}:${mm}`;
  }
  return d.toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' });
}

export async function clipboardToDataUrl(): Promise<string> {
  const base64 = await (window as any).__TAURI_INTERNALS__.invoke('read_clipboard_image');
  if (!base64) throw new Error('No image in clipboard');
  return `data:image/png;base64,${base64}`;
}
