// ===================================================================
// 旧版兼容类型，仅用于数据迁移
// ===================================================================

import type { ProviderType } from './config';
import type { CropRect } from './models';

/** 旧版记录类型 */
export type PromptLevel = 'minimal' | 'standard' | 'rich';

/** 旧版 AnalysisRecord，启动时自动迁移 */
export interface AnalysisRecord_Legacy {
  id: string;
  timestamp: number;
  imageDataUrl: string;
  promptCn: string;
  promptEn: string;
  tagsCn: string[];
  tagsEn: string[];
  level: PromptLevel;
  provider: ProviderType;
  favorite: boolean;
  outputFormat: string;
  analysisStyle: string;
  cropRegion?: CropRect;
}
