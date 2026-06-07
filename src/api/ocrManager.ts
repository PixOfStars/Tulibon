// ===================================================================
// OCR 引擎统一调度管理器 — 仅 Windows 系统 OCR
// ===================================================================

import type { OCREngine } from "../types";
import { tauriInvoke } from "../utils/tauri";

// ── Types ──

export type OcrEngineStatus = "idle" | "initializing" | "ready" | "error";

export interface OcrManagerState {
	engine: OCREngine;
	status: OcrEngineStatus;
	error: string | null;
}

export interface OcrInitOptions {
	engine: OCREngine;
	lang?: string;
}

export interface OcrRecognizeOptions {
	imageDataUrl: string;
	engine: OCREngine;
	lang?: string;
	onProgress?: (stage: string) => void;
}

// ── Initialization ──

/** 检查 OCR 引擎是否已初始化就绪 */
export async function checkEngine(
	options: OcrInitOptions,
): Promise<OcrManagerState> {
	const { engine, lang } = options;

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
				return { engine, status: "error", error: s.message };
			}
			return { engine, status: "ready", error: null };
		} catch (e) {
			return { engine, status: "error", error: String(e) };
		}
	}

	return { engine, status: "idle", error: null };
}

// ── Recognition ──

/**
 * OCR recognizer with per-instance debounce state.
 */
export class OcrRecognizer {
	private lastRecogTime = 0;
	private readonly DEBOUNCE_MS = 1000;

	/** 执行 OCR 识别，返回识别文本 */
	async recognize(options: OcrRecognizeOptions): Promise<string> {
		const { imageDataUrl, engine, lang, onProgress } = options;

		// Debounce: prevent rapid clicks
		const now = Date.now();
		if (now - this.lastRecogTime < this.DEBOUNCE_MS) {
			throw new Error("Please wait before retrying");
		}
		this.lastRecogTime = now;

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
					throw e;
				}
			}

			default:
				throw new Error(`Unknown engine: ${engine}`);
		}
	}

	/** 重置防抖 */
	resetDebounce(): void {
		this.lastRecogTime = 0;
	}
}

// ── Default instance for backward compatibility ──

const defaultRecognizer = new OcrRecognizer();

export const recognize = defaultRecognizer.recognize.bind(defaultRecognizer);
export const resetDebounce = defaultRecognizer.resetDebounce.bind(defaultRecognizer);
