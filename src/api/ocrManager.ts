// ===================================================================
// OCR 引擎统一调度管理器
// ===================================================================

import type { OCREngine, OcrApiConfigs } from "../types";
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
	apiConfigs?: OcrApiConfigs;
}

export interface OcrRecognizeOptions {
	imageDataUrl: string;
	engine: OCREngine;
	lang?: string;
	apiConfigs?: OcrApiConfigs;
	onProgress?: (stage: string) => void;
}

// ── Helpers ──

/** 从 data:image/xxx;base64, 中提取纯 base64 */
function extractBase64(dataUrl: string): string {
	const commaPos = dataUrl.indexOf(",");
	return commaPos >= 0 ? dataUrl.slice(commaPos + 1) : dataUrl;
}

// ── Initialization ──

/** 检查 OCR 引擎是否已初始化就绪 */
export async function checkEngine(
	options: OcrInitOptions,
): Promise<OcrManagerState> {
	const { engine, lang, apiConfigs } = options;

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

	// API 引擎：检查是否配置了必要的 Key
	if (engine === "baidu") {
		const cfg = apiConfigs?.baidu;
		if (!cfg?.apiKey || !cfg?.secretKey) {
			return { engine, status: "error", error: "Baidu OCR: API Key 和 Secret Key 未配置" };
		}
		return { engine, status: "ready", error: null };
	}

	if (engine === "groq") {
		const cfg = apiConfigs?.groq;
		if (!cfg?.apiKey) {
			return { engine, status: "error", error: "Groq: API Key 未配置" };
		}
		return { engine, status: "ready", error: null };
	}

	if (engine === "huggingface") {
		const cfg = apiConfigs?.huggingface;
		if (!cfg?.apiKey) {
			return { engine, status: "error", error: "Hugging Face: API Token 未配置" };
		}
		return { engine, status: "ready", error: null };
	}

	return { engine, status: "idle", error: null };
}

// ── API: Baidu OCR ──

let baiduAccessTokenCache: { token: string; expiresAt: number } | null = null;

async function getBaiduAccessToken(apiKey: string, secretKey: string): Promise<string> {
	// 缓存有效期内复用 token
	if (baiduAccessTokenCache && Date.now() < baiduAccessTokenCache.expiresAt) {
		return baiduAccessTokenCache.token;
	}

	const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`;
	const resp = await fetch(url, { method: "POST" });
	const data = await resp.json();

	if (!data.access_token) {
		throw new Error(`Baidu OCR 获取 Token 失败: ${data.error_description || JSON.stringify(data)}`);
	}

	// 缓存 token，提前 1 小时过期
	baiduAccessTokenCache = {
		token: data.access_token,
		expiresAt: Date.now() + (data.expires_in - 3600) * 1000,
	};

	return data.access_token;
}

async function recognizeBaidu(imageDataUrl: string, apiConfigs: OcrApiConfigs, lang?: string): Promise<string> {
	const { apiKey, secretKey } = apiConfigs.baidu;
	const token = await getBaiduAccessToken(apiKey, secretKey);

	const base64 = extractBase64(imageDataUrl);
	const url = `https://aip.baidubce.com/rest/2.0/ocr/v1/accurate_basic?access_token=${token}`;

	const resp = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
		body: `image=${encodeURIComponent(base64)}&language_type=${lang === "en" ? "ENG" : "CHN_ENG"}`,
	});

	const data = await resp.json();

	if (data.error_code) {
		throw new Error(`Baidu OCR 错误 [${data.error_code}]: ${data.error_msg}`);
	}

	if (!data.words_result?.length) {
		return "";
	}

	return data.words_result.map((r: { words: string }) => r.words).join("\n");
}

// ── API: Groq (Vision LLM) ──

async function recognizeGroq(imageDataUrl: string, apiConfigs: OcrApiConfigs, lang?: string): Promise<string> {
	const { apiKey } = apiConfigs.groq;
	const langInstruction = lang === "en"
		? "Extract all text from the image. Output only the recognized text, nothing else."
		: "请识别图片中的所有文字，只输出识别到的文字内容，不要添加任何解释。";

	const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify({
			model: "meta-llama/llama-4-scout-17b-16e-instruct",
			messages: [
				{
					role: "user",
					content: [
						{ type: "text", text: langInstruction },
						{ type: "image_url", image_url: { url: imageDataUrl } },
					],
				},
			],
			max_tokens: 4096,
			temperature: 0,
		}),
	});

	const data = await resp.json();

	if (data.error) {
		throw new Error(`Groq 错误: ${data.error.message}`);
	}

	return data.choices?.[0]?.message?.content?.trim() || "";
}

// ── API: Hugging Face Inference ──

async function recognizeHuggingFace(imageDataUrl: string, apiConfigs: OcrApiConfigs, lang?: string): Promise<string> {
	const { apiKey } = apiConfigs.huggingface;
	const langInstruction = lang === "en"
		? "Extract all text from the image. Output only the recognized text, nothing else."
		: "请识别图片中的所有文字，只输出识别到的文字内容，不要添加任何解释。";

	const resp = await fetch("https://router.huggingface.co/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`,
		},
		body: JSON.stringify({
			model: "Qwen/Qwen2.5-VL-3B-Instruct:fastest",
			messages: [
				{
					role: "user",
					content: [
						{ type: "text", text: langInstruction },
						{ type: "image_url", image_url: { url: imageDataUrl } },
					],
				},
			],
			max_tokens: 4096,
			temperature: 0,
		}),
	});

	const data = await resp.json();

	if (data.error) {
		throw new Error(`Hugging Face 错误: ${data.error}`);
	}

	return data.choices?.[0]?.message?.content?.trim() || "";
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
		const { imageDataUrl, engine, lang, apiConfigs, onProgress } = options;

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

			case "baidu": {
				onProgress?.("recognizing");
				try {
					const text = await recognizeBaidu(imageDataUrl, apiConfigs!, lang);
					onProgress?.("done");
					return text;
				} catch (e) {
					onProgress?.("error");
					throw e;
				}
			}

			case "groq": {
				onProgress?.("recognizing");
				try {
					const text = await recognizeGroq(imageDataUrl, apiConfigs!, lang);
					onProgress?.("done");
					return text;
				} catch (e) {
					onProgress?.("error");
					throw e;
				}
			}

			case "huggingface": {
				onProgress?.("recognizing");
				try {
					const text = await recognizeHuggingFace(imageDataUrl, apiConfigs!, lang);
					onProgress?.("done");
					return text;
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
