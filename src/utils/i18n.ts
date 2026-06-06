import zh from "../locales/zh.json";
import en from "../locales/en.json";

/** 根据语言代码获取翻译字典 */
export function getT(lang: "zh" | "en") {
	return lang === "zh" ? zh : en;
}
