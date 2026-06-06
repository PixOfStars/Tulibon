import { useState, useCallback, useRef } from "react";

import {
	Key,
	ImageSquare,
	Wrench,
	Palette,
	Command,
	Sliders,
	X,
} from "@phosphor-icons/react";
import type { ProviderConfig, AppConfig } from "../types";
import type { AppTheme } from "../theme";
import { useToast } from "./Toast";
import { SETTINGS_MODAL_WIDTH } from "../styles";
import { tauriInvoke } from "../utils/tauri";
import ProviderTab from "./settings/ProviderTab";
import InputTab from "./settings/InputTab";
import GeneralTab from "./settings/GeneralTab";
import AppearanceTab from "./settings/AppearanceTab";
import ShortcutsTab from "./settings/ShortcutsTab";
import ModeStyleTab from "./settings/ModeStyleTab";
import OcrTab from "./settings/OcrTab";
import { getT } from "../utils/i18n";

interface SettingsModalProps {
	prefs: ReturnType<typeof import("../hooks/usePreferences").usePreferences>;
	theme: AppTheme;
	onClose: () => void;
}

type Tab =
	| "provider"
	| "modeStyle"
	| "input"
	| "general"
	| "appearance"
	| "shortcuts"
	| "ocr";

const tabItems: { key: Tab; icon: typeof Key; i18nKey: keyof typeof zh }[] = [
	{ key: "provider", icon: Key, i18nKey: "aiProviderTab" },
	{ key: "modeStyle", icon: Sliders, i18nKey: "modeStyleTab" },
	{ key: "input", icon: ImageSquare, i18nKey: "inputTab" },
	{ key: "general", icon: Wrench, i18nKey: "generalTab" },
	{ key: "appearance", icon: Palette, i18nKey: "appearanceTab" },
	{ key: "shortcuts", icon: Command, i18nKey: "shortcutsTab" },
];

const SettingsModal = ({ prefs, theme, onClose }: SettingsModalProps) => {
	const { config, saveConfig: prefsSaveConfig } = prefs;
	const t = getT(lang);
	const colors = theme.colors;
	const toast = useToast();
	const toastTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

	const [activeTab, setActiveTab] = useState<Tab>("provider");

	const [editingProvider, setEditingProvider] = useState(0);
	const [capturingShortcut, setCapturingShortcut] = useState<string | null>(
		null,
	);

	const saveConfig = useCallback(
		(newConfig: AppConfig) => {
			prefsSaveConfig(newConfig);
			if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
			toastTimerRef.current = setTimeout(() => {
				toast.show(t.settingsSaved, "success");
			}, 800);
		},
		[prefsSaveConfig, toast, t.settingsSaved],
	);

	const handleClose = () => onClose();

	const handleSelectFolder = async () => {
		try {
			const folder = await tauriInvoke("pick_folder");
			if (folder) {
				await tauriInvoke("migrate_data", { newDir: folder as string });
				saveConfig({ ...config, dataDir: folder as string });
				toast.show(t.storageChanged);
			}
		} catch (e) {
			console.warn("pick_folder failed:", e);
		}
	};

	const handleSelectFont = async () => {
		try {
			const file = await tauriInvoke("pick_font_file");
			if (file) {
				saveConfig({ ...config, customFontPath: file as string });
				const style = document.createElement("style");
				style.textContent = `@font-face { font-family: 'CustomAppFont'; src: url('${file}'); }`;
				document.head.appendChild(style);
				toast.show(t.restartRequired);
			}
		} catch (e) {
			console.warn("pick_font_file failed:", e);
		}
	};

	const handleShortcutCapture = (configKey: string, e: React.KeyboardEvent) => {
		e.preventDefault();
		const keys: string[] = [];
		if (e.ctrlKey) keys.push("Ctrl");
		if (e.altKey) keys.push("Alt");
		if (e.shiftKey) keys.push("Shift");
		const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
		if (!["Control", "Alt", "Shift"].includes(key)) {
			keys.push(key);
			saveConfig({
				...config,
				shortcuts: { ...config.shortcuts, [configKey]: keys.join("+") },
			});
			setCapturingShortcut(null);
		}
	};

	const updateShortcut = (configKey: string, value: string) => {
		saveConfig({
			...config,
			shortcuts: { ...config.shortcuts, [configKey]: value },
		});
	};

	const tabProps = {
		config,
		saveConfig,
		colors,
		lang: config.prefLang,
		t: t as unknown as Record<string, string>,
		toast,
	};

	// Helper to check if a tab matches the active tab
	const isActiveTab = (tab: Tab) => tab === activeTab;

	return (
		<div className="settings-overlay" onClick={handleClose}>
			<div
				onClick={(e) => e.stopPropagation()}
				style={{
					width: SETTINGS_MODAL_WIDTH,
					height: "88vh",
					maxHeight: 620,
					display: "flex",
					flexDirection: "column",
					backgroundColor: colors.bg,
					borderRadius: 16,
					overflow: "hidden",
					boxShadow: theme.shadow.card,
				}}
			>
				{/* Header */}
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						padding: "14px 20px",
						borderBottom: `1px solid ${colors.border}`,
					}}
				>
					<span
						style={{ fontSize: 14, fontWeight: 700, color: colors.textHeader }}
					>
						{t.settings}
					</span>
					<button
						onClick={handleClose}
						style={{
							width: 32,
							height: 32,
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							border: "none",
							borderRadius: 8,
							backgroundColor: "transparent",
							color: colors.text,
							cursor: "pointer",
						}}
						onMouseEnter={(e) =>
							(e.currentTarget.style.backgroundColor = colors.accentBg)
						}
						onMouseLeave={(e) =>
							(e.currentTarget.style.backgroundColor = "transparent")
						}
					>
						<X size={18} weight="bold" />
					</button>
				</div>

				{/* Body */}
				<div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
					{/* Left tabs */}
					<div
						style={{
							width: 130,
							flexShrink: 0,
							display: "flex",
							flexDirection: "column",
							gap: 2,
							padding: 10,
							borderRight: `1px solid ${colors.border}`,
						}}
					>
						{tabItems.map(({ key, icon: Icon, i18nKey }) => (
							<button
								key={key}
								onClick={() => setActiveTab(key)}
								style={{
									display: "flex",
									alignItems: "center",
									gap: 8,
									padding: "9px 10px",
									borderRadius: 8,
									border: "none",
									cursor: "pointer",
									fontSize: 12,
									fontWeight: isActiveTab(key) ? 700 : 500,
									backgroundColor: isActiveTab(key)
										? colors.accentBg
										: "transparent",
									color: isActiveTab(key) ? colors.accent : colors.text,
									transition: "all 0.15s",
									textAlign: "left",
								}}
							>
								<Icon size={16} weight="bold" />
								{t[i18nKey]}
							</button>
						))}
					</div>

					{/* Right content */}
					<div style={{ flex: 1, overflow: "auto", padding: "20px 20px 20px" }}>
						{activeTab === "provider" && (
							<ProviderTab
								{...tabProps}
								editingProvider={editingProvider}
								setEditingProvider={setEditingProvider}
								updateProvider={(i, p) => {
									const providers = [...config.providers];
									providers[i] = p as ProviderConfig;
									saveConfig({ ...config, providers });
								}}
								setActiveProvider={(id) =>
									saveConfig({
										...config,
										activeProvider: id as AppConfig["activeProvider"],
									})
								}
							/>
						)}
						{activeTab === "modeStyle" && <ModeStyleTab {...tabProps} />}
						{activeTab === "input" && (
							<InputTab
								{...tabProps}
								toggleInputMethod={(key) => {
									const methods = {
										...config.inputMethods,
										[key]: !config.inputMethods[key],
									};
									saveConfig({ ...config, inputMethods: methods });
								}}
							/>
						)}
						{activeTab === "general" && (
							<GeneralTab {...tabProps} onSelectFolder={handleSelectFolder} />
						)}
						{activeTab === "appearance" && (
							<AppearanceTab {...tabProps} onSelectFont={handleSelectFont} />
						)}
						{activeTab === "shortcuts" && (
							<ShortcutsTab
								{...tabProps}
								capturingShortcut={capturingShortcut}
								setCapturingShortcut={setCapturingShortcut}
								onCapture={handleShortcutCapture}
								onClear={(k) => updateShortcut(k, "")}
							/>
						)}
						{activeTab === "ocr" && <OcrTab {...tabProps} />}
					</div>
				</div>
			</div>
		</div>
	);
};

export default SettingsModal;
