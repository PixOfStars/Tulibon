import { useState, useCallback, useRef, useEffect } from "react";

import {
	Key,
	ImageSquare,
	Wrench,
	Palette,
	Command,
	Info,
	Sliders,
	PuzzlePiece,
	X,
} from "@phosphor-icons/react";
import type { ProviderConfig, AppConfig } from "../types";
import type { AppTheme } from "../theme";
import { useToast } from "./Toast";
import { SETTINGS_MODAL_WIDTH } from "../styles";
import { tauriInvoke, createIpcChannel } from "../utils/tauri";
import { getPhosphorIcon } from "../utils/icons";
import ProviderTab from "./settings/ProviderTab";
import InputTab from "./settings/InputTab";
import GeneralTab from "./settings/GeneralTab";
import AppearanceTab from "./settings/AppearanceTab";
import ShortcutsTab from "./settings/ShortcutsTab";
import AboutTab from "./settings/AboutTab";
import ModeStyleTab from "./settings/ModeStyleTab";
import OcrTab from "./settings/OcrTab";
import PluginManagerTab from "./settings/PluginManagerTab";
import PluginSettingsContainer from "./PluginSettingsContainer";
import type { PluginManifest } from "../sdk/PluginSDK";
import zh from "../locales/zh.json";
import en from "../locales/en.json";

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
	| "pluginManager"
	| "about"
	| { pluginSettings: string };

const tabItems: { key: Tab; icon: typeof Key; i18nKey: keyof typeof zh }[] = [
	{ key: "provider", icon: Key, i18nKey: "aiProviderTab" },
	{ key: "modeStyle", icon: Sliders, i18nKey: "modeStyleTab" },
	{ key: "input", icon: ImageSquare, i18nKey: "inputTab" },
	{ key: "general", icon: Wrench, i18nKey: "generalTab" },
	{ key: "appearance", icon: Palette, i18nKey: "appearanceTab" },
	{ key: "shortcuts", icon: Command, i18nKey: "shortcutsTab" },
	{ key: "pluginManager", icon: PuzzlePiece, i18nKey: "pluginManagerTab" },
	{ key: "about", icon: Info, i18nKey: "aboutTab" },
];

const SettingsModal = ({ prefs, theme, onClose }: SettingsModalProps) => {
	const { config, saveConfig: prefsSaveConfig } = prefs;
	const t = config.prefLang === "zh" ? zh : en;
	const colors = theme.colors;
	const toast = useToast();
	const toastTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

	const [activeTab, setActiveTab] = useState<Tab>("provider");

	// Plugin list for dynamic settings tabs (enabled + has routes.settings)
	const [enabledPluginsWithSettings, setEnabledPluginsWithSettings] = useState<
		Array<{ id: string; name: { zh: string; en: string }; manifest: PluginManifest }>
	>([]);

	const refreshPluginSettingsTabs = useCallback(async () => {
		try {
			const plugins = (await tauriInvoke("list_plugins")) as Array<{
				manifest: PluginManifest;
				installed: boolean;
				enabled: boolean;
				path: string;
			}>;
			setEnabledPluginsWithSettings(
				plugins
					.filter((p) => p.installed && p.enabled && p.manifest.routes?.settings)
					.map((p) => ({
						id: p.manifest.id,
						name: p.manifest.name,
						manifest: p.manifest,
					})),
			);
		} catch { /* ignore */ }
	}, []);

	useEffect(() => { refreshPluginSettingsTabs(); }, [refreshPluginSettingsTabs]);

	// Listen for plugin state changes (enable/disable/install/uninstall)
	useEffect(() => {
		const handler = () => { refreshPluginSettingsTabs(); };
		window.addEventListener("plugins-changed", handler);
		return () => window.removeEventListener("plugins-changed", handler);
	}, [refreshPluginSettingsTabs]);

	const [editingProvider, setEditingProvider] = useState(0);
	const [capturingShortcut, setCapturingShortcut] = useState<string | null>(
		null,
	);
	const [updateState, setUpdateState] = useState<
		"idle" | "checking" | "available" | "uptodate" | "installing"
	>("idle");
	const [updateInfo, setUpdateInfo] = useState<{
		version: string;
		body: string;
	} | null>(null);
	const updateRef = useRef<any>(null);

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

	const handleCheckUpdate = async () => {
		setUpdateState("checking");
		setUpdateInfo(null);
		const minWait = new Promise((r) => setTimeout(r, 1000));
		try {
			const result = await tauriInvoke("plugin:updater|check");
			await minWait;
			if (result) {
				updateRef.current = result;
				setUpdateInfo({ version: result.version, body: result.body || "" });
				setUpdateState("available");
			} else {
				setUpdateState("uptodate");
				toast.show(t.updateNotAvailable || "已是最新版本", "info");
				setTimeout(() => setUpdateState("idle"), 3000);
			}
		} catch (e) {
			console.error("Update check failed:", e);
			await minWait;
			setUpdateState("idle");
			toast.show(
				t.updateCheckFailed || "检查更新失败，请检查网络连接",
				"error",
			);
		}
	};

	const handleInstallUpdate = async () => {
		if (!updateRef.current) return;
		setUpdateState("installing");
		try {
			await tauriInvoke("plugin:updater|download_and_install", {
				onEvent: createIpcChannel(),
				rid: updateRef.current.rid,
			});
		} catch (e) {
			console.error("[Updater] download_and_install failed:", e);
			setUpdateState("available");
			toast.show(`${t.updateFailed || "Update failed"}: ${e}`, "error");
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

	// Plugin settings tabs (dynamic, from enabled plugins with routes.settings)
	const pluginSettingsTabs = enabledPluginsWithSettings.map((p) => ({
		key: { pluginSettings: p.id } as Tab,
		pluginId: p.id,
		label: config.prefLang === "zh" ? p.name.zh : p.name.en,
		iconName: p.manifest.icon || 'PuzzlePiece',
	}));

	// Helper to check if a tab matches the active tab
	const isActiveTab = (tab: Tab) => {
		if (typeof tab === "string" && typeof activeTab === "string") return tab === activeTab;
		if (typeof tab === "object" && typeof activeTab === "object") return tab.pluginSettings === activeTab.pluginSettings;
		return false;
	};

	// Check if active tab is a specific plugin's settings
	const isPluginSettingsActive = (pluginId: string) =>
		typeof activeTab === "object" && "pluginSettings" in activeTab && activeTab.pluginSettings === pluginId;

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
						{/* Group: 通用设置 */}
						<div style={{
							fontSize: 10, fontWeight: 700, color: colors.text,
							opacity: 0.4, padding: '4px 10px 2px',
							textTransform: 'uppercase', letterSpacing: 1,
						}}>
							{t.settingsGeneralGroup || "General"}
						</div>
						{tabItems.map(({ key, icon: Icon, i18nKey }) => (
							<button
								key={typeof key === 'string' ? key : key.pluginSettings}
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
									backgroundColor:
										isActiveTab(key) ? colors.accentBg : "transparent",
									color: isActiveTab(key) ? colors.accent : colors.text,
									transition: "all 0.15s",
									textAlign: "left",
								}}
							>
								<Icon size={16} weight="bold" />
								{t[i18nKey]}
							</button>
						))}

						{/* Group: 插件设置 */}
						{pluginSettingsTabs.length > 0 && (
							<>
								<div style={{
									height: 1, backgroundColor: colors.border,
									margin: '6px 8px', flexShrink: 0,
								}} />
								<div style={{
									fontSize: 10, fontWeight: 700, color: colors.text,
									opacity: 0.4, padding: '4px 10px 2px',
									textTransform: 'uppercase', letterSpacing: 1,
								}}>
									{t.settingsPluginGroup || "Plugins"}
								</div>
								{pluginSettingsTabs.map((item) => (
									<button
										key={item.pluginId}
										onClick={() => setActiveTab(item.key)}
										style={{
											display: "flex",
											alignItems: "center",
											gap: 8,
											padding: "9px 10px",
											borderRadius: 8,
											border: "none",
											cursor: "pointer",
											fontSize: 12,
											fontWeight: isActiveTab(item.key) ? 700 : 500,
											backgroundColor:
												isActiveTab(item.key) ? colors.accentBg : "transparent",
											color: isActiveTab(item.key) ? colors.accent : colors.text,
											transition: "all 0.15s",
											textAlign: "left",
										}}
									>
										{getPhosphorIcon(item.iconName, 16, 'bold')}
										{item.label}
									</button>
								))}
							</>
						)}
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
						{activeTab === "pluginManager" && <PluginManagerTab {...tabProps} />}
						{activeTab === "about" && (
							<AboutTab
								{...tabProps}
								updateState={updateState}
								updateInfo={updateInfo}
								onCheckUpdate={handleCheckUpdate}
								onInstallUpdate={handleInstallUpdate}
							/>
						)}

						{/* Plugin settings tabs — special handling for OCR (Core component), generic for others */}
						{isPluginSettingsActive("ocr") && <OcrTab {...tabProps} />}
						{typeof activeTab === "object" && "pluginSettings" in activeTab && activeTab.pluginSettings !== "ocr" && (
							(() => {
								const match = enabledPluginsWithSettings.find(
									(p) => p.id === activeTab.pluginSettings,
								);
								if (!match) return null;
								return (
									<PluginSettingsContainer
										pluginId={match.id}
										manifest={match.manifest}
										hostConfig={{
											lang: config.prefLang,
											theme,
											config,
										}}
									/>
								);
							})()
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default SettingsModal;
