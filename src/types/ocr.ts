// ===================================================================
// OCR 引擎类型定义
// ===================================================================

/** 支持的 OCR 引擎 */
export type OCREngine = "windows" | "baidu" | "groq" | "huggingface";

/** 所有引擎列表 */
export const OCR_ENGINES: OCREngine[] = ["windows", "baidu", "groq", "huggingface"];

/** 默认引擎 */
export const DEFAULT_OCR_ENGINE: OCREngine = "windows";

/** 各 API 服务的配置 */
export interface OcrApiConfigs {
	baidu: { apiKey: string; secretKey: string };
	groq: { apiKey: string };
	huggingface: { apiKey: string };
}

export const DEFAULT_OCR_API_CONFIGS: OcrApiConfigs = {
	baidu: { apiKey: "", secretKey: "" },
	groq: { apiKey: "" },
	huggingface: { apiKey: "" },
};
