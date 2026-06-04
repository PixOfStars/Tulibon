// ===================================================================
// OCR 引擎类型定义
// ===================================================================

/** 支持的 OCR 引擎 */
export type OCREngine = "windows" | "paddle" | "tesseract";

/** 所有引擎列表 */
export const OCR_ENGINES: OCREngine[] = ["windows", "paddle", "tesseract"];

/** 引擎中文名 */
export const OCR_ENGINE_LABELS_ZH: Record<OCREngine, string> = {
	windows: "Windows 系统 OCR",
	paddle: "PaddleOCR 飞桨",
	tesseract: "Tesseract",
};

/** 引擎英文名 */
export const OCR_ENGINE_LABELS_EN: Record<OCREngine, string> = {
	windows: "Windows OCR",
	paddle: "PaddleOCR",
	tesseract: "Tesseract",
};

/** 引擎后缀提示（设置页显示） */
export const OCR_ENGINE_SUFFIX_ZH: Record<OCREngine, string> = {
	windows: "推荐，速度快且免费",
	paddle: "高精度，适合复杂图片",
	tesseract: "基础版",
};

export const OCR_ENGINE_SUFFIX_EN: Record<OCREngine, string> = {
	windows: "Recommended, fast & free",
	paddle: "High accuracy for complex images",
	tesseract: "Basic version",
};

/** 引擎降级优先级顺序（索引越小越优先） */
export const OCR_ENGINE_FALLBACK_ORDER: OCREngine[] = [
	"windows",
	"tesseract",
	"paddle",
];

/** 哪些引擎需要下载模型文件 */
export function ocrEngineNeedsDownload(engine: OCREngine): boolean {
	return engine === "paddle" || engine === "tesseract";
}

/** 默认下载状态：Windows 为系统内置 */
export const DEFAULT_OCR_DOWNLOAD_STATE: Record<OCREngine, boolean> = {
	windows: true,
	paddle: false,
	tesseract: false,
};

/** 默认引擎（Win10/11 用户优先使用 Windows OCR） */
export const DEFAULT_OCR_ENGINE: OCREngine = "windows";

/** 模型文件元信息 */
export interface OcrModelInfo {
	engine: OCREngine;
	fileName: string;
	displaySize: string;
	/** 相对于 GitHub Releases 的 URL 路径 */
	releasePath: string;
}

/** 各引擎的模型文件信息 */
export const OCR_MODEL_FILES: Record<OCREngine, OcrModelInfo[]> = {
	windows: [],
	paddle: [
		{
			engine: "paddle",
			fileName: "paddleocr-models.zip",
			displaySize: "~15MB",
			releasePath: "paddleocr-models/paddleocr-models.zip",
		},
	],
	tesseract: [
		{
			engine: "tesseract",
			fileName: "tesseract-lang.zip",
			displaySize: "~31MB",
			releasePath: "tesseract-lang/tesseract-lang.zip",
		},
	],
};

/** GitHub 加速镜像源列表 */
export const OCR_MIRROR_PREFIXES = [
	{
		name: "GitHub",
		prefix: "https://github.com/<owner>/<repo>/releases/download/",
	},
	{
		name: "ghproxy.com",
		prefix:
			"https://ghproxy.com/https://github.com/<owner>/<repo>/releases/download/",
	},
	{
		name: "mirror.ghproxy.com",
		prefix:
			"https://mirror.ghproxy.com/https://github.com/<owner>/<repo>/releases/download/",
	},
] as const;

/** 镜像 HEAD 预检缓存时间（毫秒） */
export const MIRROR_CACHE_TTL = 5 * 60 * 1000;
