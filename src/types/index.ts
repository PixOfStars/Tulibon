import type { AppTheme } from "../theme";
export type { AppTheme };

// Re-export all types from sub-files
export type {
	LocalizedText,
	LocalizedArray,
	AnalysisMode,
	DesignAnalysisData,
	ModeData,
	Tag,
	Collection,
	ImageSource,
	AnalysisRecord,
	AnalysisResult,
	BatchStatus,
	BatchItem,
	CropRect,
} from "./models";

export { DEFAULT_COLLECTIONS } from "./models";

export type {
	ProviderType,
	ProviderConfig,
	ShortcutBindings,
	ModeProfile,
	StylePreset,
	AppConfig,
} from "./config";

export { DEFAULT_MODE_PROFILES, DEFAULT_STYLE_PRESETS } from "./config";

export type {
	OCREngine,
	OcrModelInfo,
} from "./ocr";

export {
	OCR_ENGINES,
	OCR_ENGINE_LABELS_ZH,
	OCR_ENGINE_LABELS_EN,
	OCR_ENGINE_SUFFIX_ZH,
	OCR_ENGINE_SUFFIX_EN,
	OCR_ENGINE_FALLBACK_ORDER,
	ocrEngineNeedsDownload,
	DEFAULT_OCR_DOWNLOAD_STATE,
	DEFAULT_OCR_ENGINE,
	OCR_MODEL_FILES,
	OCR_MIRROR_PREFIXES,
	MIRROR_CACHE_TTL,
} from "./ocr";

export type {
	PromptLevel,
	AnalysisRecord_Legacy,
} from "./legacy";
