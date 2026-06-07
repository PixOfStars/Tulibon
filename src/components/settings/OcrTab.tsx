import { useState } from "react";
import {
	Scan,
	CheckCircle,
	Cloud,
	Key,
	Eye,
	EyeSlash,
} from "@phosphor-icons/react";
import type { TabProps } from "./TabProps";
import type { OCREngine, OcrApiConfigs } from "../../types";
import { OCR_ENGINES } from "../../types";
import { Field, Divider } from "./SettingsField";

/** 各引擎的元信息 */
const ENGINE_META: Record<
	OCREngine,
	{
		icon: typeof Scan;
		labelKey: string;
		descKey: string;
		isLocal: boolean;
	}
> = {
	windows: {
		icon: Scan,
		labelKey: "ocrEngineWindows",
		descKey: "ocrEngineWindowsHint",
		isLocal: true,
	},
	baidu: {
		icon: Cloud,
		labelKey: "ocrEngineBaidu",
		descKey: "ocrEngineBaiduHint",
		isLocal: false,
	},
	groq: {
		icon: Cloud,
		labelKey: "ocrEngineGroq",
		descKey: "ocrEngineGroqHint",
		isLocal: false,
	},
	huggingface: {
		icon: Cloud,
		labelKey: "ocrEngineHuggingface",
		descKey: "ocrEngineHuggingfaceHint",
		isLocal: false,
	},
};

const OcrTab = ({ config, saveConfig, colors, t }: TabProps) => {
	const currentEngine = config.ocrEngine || "windows";
	const apiConfigs = config.ocrApiConfigs;

	// 各 Key 输入框的显示/隐藏状态
	const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

	const toggleShowKey = (key: string) => {
		setShowKeys((prev) => ({ ...prev, [key]: !prev[key] }));
	};

	// 更新引擎选择
	const handleEngineChange = (engine: OCREngine) => {
		saveConfig({ ...config, ocrEngine: engine });
	};

	// 更新 API 配置
	const updateApiConfig = <K extends keyof OcrApiConfigs>(
		service: K,
		field: keyof OcrApiConfigs[K],
		value: string,
	) => {
		saveConfig({
			...config,
			ocrApiConfigs: {
				...config.ocrApiConfigs,
				[service]: {
					...config.ocrApiConfigs[service],
					[field]: value,
				},
			},
		});
	};

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
			{/* 标题说明 */}
			<Field label={t.ocrEngineTitle || "OCR Engine"}>
				<div
					style={{
						fontSize: 12,
						color: colors.text,
						opacity: 0.6,
						lineHeight: 1.5,
					}}
				>
					{t.ocrEngineDesc}
				</div>
			</Field>

			<Divider colors={colors} />

			{/* 引擎选择列表 */}
			<div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
				{OCR_ENGINES.map((engine) => {
					const meta = ENGINE_META[engine];
					const Icon = meta.icon;
					const isSelected = currentEngine === engine;

					return (
						<button
							key={engine}
							onClick={() => handleEngineChange(engine)}
							style={{
								display: "flex",
								alignItems: "center",
								gap: 10,
								padding: "10px 12px",
								borderRadius: 10,
								border: `1px solid ${isSelected ? colors.accent : colors.border}`,
								backgroundColor: isSelected
									? `${colors.accent}10`
									: "transparent",
								cursor: "pointer",
								transition: "all 0.15s",
							}}
						>
							<Icon
								size={20}
								weight={isSelected ? "fill" : "regular"}
								color={isSelected ? colors.accent : colors.text}
							/>
							<div
								style={{
									flex: 1,
									textAlign: "left",
								}}
							>
								<div
									style={{
										fontSize: 12,
										fontWeight: 700,
										color: isSelected
											? colors.accent
											: colors.textHeader,
									}}
								>
									{t[meta.labelKey] || engine}
								</div>
								<div
									style={{
										fontSize: 10,
										color: colors.text,
										opacity: 0.5,
										marginTop: 2,
									}}
								>
									{t[meta.descKey] || ""}
								</div>
							</div>
							{isSelected && (
								<CheckCircle
									size={18}
									weight="fill"
									color={colors.accent}
								/>
							)}
						</button>
					);
				})}
			</div>

			{/* API Key 配置区域 — 仅当选中的是 API 引擎时显示 */}
			{currentEngine !== "windows" && (
				<>
					<Divider colors={colors} />
					<Field
						label={
							t.ocrApiConfigTitle || "API Configuration"
						}
					>
						<ApiKeyInput
							colors={colors}
							t={t}
							label={t.ocrBaiduApiKey || "API Key"}
							value={apiConfigs[currentEngine]?.apiKey || ""}
							placeholder={
								currentEngine === "baidu"
									? "Enter Baidu API Key"
									: currentEngine === "groq"
										? "gsk_..."
										: "hf_..."
							}
							visible={showKeys[`${currentEngine}-apiKey`] || false}
							onToggle={() =>
								toggleShowKey(`${currentEngine}-apiKey`)
							}
							onChange={(v) =>
								updateApiConfig(
									currentEngine as keyof OcrApiConfigs,
									"apiKey" as never,
									v,
								)
							}
						/>
					</Field>

					{/* 百度 OCR 需要额外的 Secret Key */}
					{currentEngine === "baidu" && (
						<Field
							label={t.ocrBaiduSecretKey || "Secret Key"}
						>
							<ApiKeyInput
								colors={colors}
								t={t}
								label={
									t.ocrBaiduSecretKey || "Secret Key"
								}
								value={apiConfigs.baidu?.secretKey || ""}
								placeholder="Enter Baidu Secret Key"
								visible={
									showKeys["baidu-secretKey"] || false
								}
								onToggle={() =>
									toggleShowKey("baidu-secretKey")
								}
								onChange={(v) =>
									updateApiConfig("baidu", "secretKey" as never, v)
								}
							/>
						</Field>
					)}
				</>
			)}
		</div>
	);
};

// ── API Key 输入子组件 ──

function ApiKeyInput({
	colors,
	t,
	value,
	placeholder,
	visible,
	onToggle,
	onChange,
}: {
	colors: Record<string, string>;
	t: Record<string, string>;
	label?: string;
	value: string;
	placeholder: string;
	visible: boolean;
	onToggle: () => void;
	onChange: (v: string) => void;
}) {
	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				gap: 6,
			}}
		>
			<Key size={14} color={colors.text} style={{ opacity: 0.4 }} />
			<input
				type={visible ? "text" : "password"}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				style={{
					flex: 1,
					fontSize: 12,
					padding: "6px 10px",
					borderRadius: 8,
					border: `1px solid ${colors.border}`,
					backgroundColor: colors.grayBg,
					color: colors.text,
					outline: "none",
				}}
			/>
			<button
				onClick={onToggle}
				style={{
					padding: 4,
					border: "none",
					background: "none",
					cursor: "pointer",
					color: colors.text,
					opacity: 0.5,
				}}
				title={visible ? t.hideKey : t.showKey}
			>
				{visible ? (
					<EyeSlash size={14} />
				) : (
					<Eye size={14} />
				)}
			</button>
		</div>
	);
}

export default OcrTab;
