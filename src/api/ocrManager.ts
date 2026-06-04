// ===================================================================
// OCR 引擎统一调度管理器
// ===================================================================

import type { OCREngine } from "../types";
import { ocrEngineNeedsDownload } from "../types";
import { tauriInvoke } from "../utils/tauri";
import { recognizeText } from "./ocr";

// ── Types ──

export type OcrEngineStatus = "idle" | "initializing" | "ready" | "error";

export interface OcrManagerState {
	engine: OCREngine;
	engineDownloaded: Record<OCREngine, boolean>;
	status: OcrEngineStatus;
	error: string | null;
}

export interface OcrInitOptions {
	engine: OCREngine;
	engineDownloaded: Record<OCREngine, boolean>;
	lang?: string;
}

export interface OcrRecognizeOptions {
	imageDataUrl: string;
	engine: OCREngine;
	engineDownloaded: Record<OCREngine, boolean>;
	lang?: string;
	onProgress?: (stage: string) => void;
}

// ── Engine labels ──

export const ENGINE_LABELS: Record<OCREngine, { zh: string; en: string }> = {
	windows: { zh: "Windows 系统 OCR", en: "Windows OCR" },
	paddle: { zh: "PaddleOCR 飞桨", en: "PaddleOCR" },
	tesseract: { zh: "Tesseract", en: "Tesseract" },
};

// ── Engine hint suffixes ──

export function getEngineHint(engine: OCREngine, lang: "zh" | "en"): string {
	const hints: Record<OCREngine, { zh: string; en: string }> = {
		windows: { zh: "推荐，速度快且免费", en: "Recommended, fast & free" },
		paddle: {
			zh: "高精度，适合复杂图片",
			en: "High accuracy for complex images",
		},
		tesseract: { zh: "基础版", en: "Basic version" },
	};
	return hints[engine][lang];
}

// ── Initialization ──

/** 检查 OCR 引擎是否已初始化就绪 */
export async function checkEngine(
	options: OcrInitOptions,
): Promise<OcrManagerState> {
	const { engine, engineDownloaded, lang } = options;

	// Windows engine: check system support
	if (engine === "windows") {
		try {
			const support = await tauriInvoke("check_windows_ocr", {
				lang: lang || "zh-Hans",
			});
			const s = support as {
				available: boolean;
				lang_installed: boolean;
				message: string;
			};
			if (!s.available) {
				return { engine, engineDownloaded, status: "error", error: s.message };
			}
			return { engine, engineDownloaded, status: "ready", error: null };
		} catch (e) {
			return { engine, engineDownloaded, status: "error", error: String(e) };
		}
	}

	// Tesseract & Paddle: check if model is downloaded
	if (ocrEngineNeedsDownload(engine)) {
		const isDownloaded = engineDownloaded[engine];
		if (!isDownloaded) {
			return {
				engine,
				engineDownloaded,
				status: "error",
				error: `need_download:${engine}`,
			};
		}
		// Tesseract: the worker is created on-demand in api/ocr.ts
		if (engine === "tesseract") {
			return { engine, engineDownloaded, status: "ready", error: null };
		}
		// Paddle: coming soon
		if (engine === "paddle") {
			return {
				engine,
				engineDownloaded,
				status: "error",
				error: "coming_soon:paddle",
			};
		}
	}

	return { engine, engineDownloaded, status: "idle", error: null };
}

// ── Recognition ──

let lastRecogTime = 0;
const DEBOUNCE_MS = 1000;

/** 执行 OCR 识别，返回识别文本 */
export async function recognize(options: OcrRecognizeOptions): Promise<string> {
	const { imageDataUrl, engine, engineDownloaded, lang, onProgress } = options;

	// Debounce: prevent rapid clicks
	const now = Date.now();
	if (now - lastRecogTime < DEBOUNCE_MS) {
		throw new Error("Please wait before retrying");
	}
	lastRecogTime = now;

	onProgress?.("initializing");

	switch (engine) {
		case "windows": {
			onProgress?.("recognizing");
			try {
				const text = await tauriInvoke("run_windows_ocr", {
					imageBase64: imageDataUrl,
					lang: lang || "zh-Hans",
				});
				onProgress?.("done");
				return text as string;
			} catch (e) {
				onProgress?.("error");
				throw new Error(`Windows OCR 识别失败: ${e}`);
			}
		}

		case "tesseract": {
			if (!engineDownloaded.tesseract) {
				throw new Error("need_download:tesseract");
			}
			onProgress?.("recognizing");
			try {
				const text = await recognizeText(imageDataUrl);
				onProgress?.("done");
				return text;
			} catch (e) {
				onProgress?.("error");
				throw new Error(`Tesseract 识别失败: ${e}`);
			}
		}

		case "paddle": {
			throw new Error("coming_soon:paddle");
		}

		default:
			throw new Error(`未知引擎: ${engine}`);
	}
}

/** 重置防抖 */
export function resetDebounce(): void {
	lastRecogTime = 0;
}

/** 引擎降级策略：按优先级返回可用的引擎 */
export function getFallbackEngine(
	failedEngine: OCREngine,
	engineDownloaded: Record<OCREngine, boolean>,
): OCREngine {
	// Fallback priority: tesseract > windows > paddle
	if (failedEngine === "windows" && engineDownloaded.tesseract)
		return "tesseract";
	if (failedEngine === "tesseract" && engineDownloaded.windows)
		return "windows";
	if (engineDownloaded.tesseract) return "tesseract";
	if (engineDownloaded.windows) return "windows";
	return "tesseract"; // Last resort: tesseract (always has core engine)
}

// ── Mirror & Download helpers ──

/** GitHub Releases URL pattern */
export function buildModelUrls(
	engine: OCREngine,
	customUrl: string,
	repoOwner = "PixOfStars",
	repoName = "Tulibon",
): string[] {
	if (customUrl.trim()) return [customUrl.trim()];

	const modelPaths: Record<string, string> = {
		paddle: "paddleocr-models/paddleocr-models.zip",
		tesseract: "tesseract-lang/tesseract-lang.zip",
	};
	const path = modelPaths[engine];
	if (!path) return [];

	const baseUrl = `https://github.com/${repoOwner}/${repoName}/releases/download/`;
	return [
		baseUrl + path,
		`https://ghproxy.com/https://github.com/${repoOwner}/${repoName}/releases/download/${path}`,
	];
}
