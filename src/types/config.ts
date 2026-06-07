// ===================================================================
// App 配置
// ===================================================================

import type { AnalysisMode } from "./models";
import type { LocalizedText } from "./models";

export type ProviderType = "gemini" | "openai" | "custom";

export interface ProviderConfig {
	id: ProviderType;
	name: string;
	apiKey: string;
	endpoint: string;
	model: string;
	enabled: boolean;
}

// ── Mode & style presets ──

/** A user-editable analysis mode profile. */
export interface ModeProfile {
	id: string;
	name: LocalizedText;
	persona: string;
	styleId: string;
	customInstruction: string;
	modeType: AnalysisMode;
	isBuiltIn: boolean;
}

/** A user-editable style preset that controls analysis angle. */
export interface StylePreset {
	id: string;
	name: LocalizedText;
	instruction: string;
	isBuiltIn: boolean;
}

export const DEFAULT_STYLE_PRESETS: StylePreset[] = [
	{
		id: "ui_design",
		name: { zh: "UI 设计", en: "UI Design" },
		instruction: `Analyze from a UI/UX design perspective. Focus on:
- Page type and purpose (dashboard, landing page, settings, etc.)
- Layout structure and grid system
- Component design and interaction patterns
- Color scheme and visual hierarchy
- Typography and readability
- Implementation feasibility and best practices

从 UI/UX 设计角度分析，关注：页面类型与目的、布局结构与网格系统、组件设计与交互模式、配色方案与视觉层级、排版与可读性、实现可行性。`,
		isBuiltIn: false,
	},
	{
		id: "graphic_design",
		name: { zh: "平面设计", en: "Graphic Design" },
		instruction: `Analyze from a graphic design perspective. Focus on:
- Communication goal and target audience
- Visual hierarchy and focal points
- Color psychology and palette choices
- Typography and layout composition
- Design techniques and artistic style
- Copywriting strategy and messaging
- Reference value and inspiration takeaways

从平面设计角度分析，关注：传播目标与受众、视觉层级与焦点、色彩心理学与配色、排版与构图、设计技巧与艺术风格、文案策略、参考价值与灵感启示。`,
		isBuiltIn: false,
	},
];

export const DEFAULT_MODE_PROFILES: ModeProfile[] = [
	{
		id: "design",
		name: { zh: "设计分析", en: "Design Analysis" },
		persona:
			"You are a senior visual design analyst. Provide comprehensive, insightful analysis of this image from a design perspective. Be specific, actionable, and professional.",
		styleId: "ui_design",
		customInstruction: "",
		modeType: "design",
		isBuiltIn: false,
	},
];

export interface AppConfig {
	inputMethods: {
		clipboard: boolean;
		dragDrop: boolean;
		urlPaste: boolean;
		filePicker: boolean;
	};
	clipboardMode: "auto" | "manual";
	autoStart: boolean;
	prefLang: "zh" | "en";
	prefMode: "light" | "dark" | "auto";
	accentColor: string;
	providers: ProviderConfig[];
	activeProvider: ProviderType;
	/** @deprecated use modeProfiles + stylePresets instead */
	analysisStyle: string;
	modeProfiles: ModeProfile[];
	stylePresets: StylePreset[];
	fontSize: "small" | "medium" | "large";
	dataDir: string;
	defaultAnalysisMode: string;
	exportFormat: "md" | "txt";
	quickSave: boolean;
	sidebarWidth: number;
	sidebarOrder: string[];
}
