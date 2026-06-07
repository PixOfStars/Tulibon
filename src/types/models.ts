// ===================================================================
// 基础类型 + 分析模式 + 数据模型
// ===================================================================

/** 双语文本，所有面向用户的文案均使用此类型 */
export interface LocalizedText {
  zh: string;
  en: string;
}

/** 双语数组 */
export interface LocalizedArray {
  zh: string[];
  en: string[];
}

// ===================================================================
// 分析模式
// ===================================================================

export type AnalysisMode = 'design' | 'ocr';

// ===================================================================
// 设计分析数据（统一字段，覆盖 UI/平面/海报等所有设计场景）
// ===================================================================

export interface DesignAnalysisData {
  imageContent: LocalizedText;
  designPurpose: LocalizedText;
  designStyle: LocalizedText;
  layoutComposition: LocalizedText;
  colorTypography: LocalizedText;
  takeaways: LocalizedText;
  prompt: LocalizedText;
}

/** @deprecated use DesignAnalysisData directly */
export type ModeData = DesignAnalysisData;

// ===================================================================
// 标签
// ===================================================================

export interface Tag {
  id: string;
  name: LocalizedText;
  source: 'system' | 'user';
  createdAt: number;
}

// ===================================================================
// 收藏夹（Collection）
// ===================================================================

export interface Collection {
  id: string;
  name: LocalizedText;
  icon: string;
  color: string;
  createdAt: number;
  updatedAt: number;
}

export const DEFAULT_COLLECTIONS: Omit<Collection, 'createdAt' | 'updatedAt'>[] = [
  { id: '__favorites', name: { zh: '收藏',    en: 'Favorites' },  icon: 'Heart',  color: '#FF3B30' },
];

// ===================================================================
// 分析记录（知识库核心）+ 分析结果
// ===================================================================

export type ImageSource = 'clipboard' | 'file' | 'url';

export interface AnalysisRecord {
  id: string;
  imagePath: string;
  source: ImageSource;
  analysisMode: AnalysisMode;
  summary: LocalizedText;
  systemTags: string[];
  userTags: string[];
  collectionIds: string[];
  modeData: DesignAnalysisData;
  createdAt: number;
  updatedAt: number;
}

export interface AnalysisResult {
  summary: LocalizedText;
  systemTags: LocalizedArray;
  modeData: DesignAnalysisData;
}

// ===================================================================
// 批处理 + 裁剪
// ===================================================================

export type BatchStatus = 'queued' | 'analyzing' | 'done' | 'error';

export interface BatchItem {
  id: string;
  imageDataUrl: string;
  analysisMode: string;
  status: BatchStatus;
  result?: AnalysisResult;
  error?: string;
}

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
