import { useState, useEffect, useCallback } from "react";
import { getDefaultProviders } from "../api";
import {
	DEFAULT_MODE_PROFILES,
	DEFAULT_STYLE_PRESETS,
	DEFAULT_OCR_ENGINE,
	DEFAULT_OCR_DOWNLOAD_STATE,
} from "../types";
import type { AppConfig, ProviderConfig } from "../types";
import { tauriInvoke } from "../utils/tauri";

const DEFAULT_CONFIG: AppConfig = {
	inputMethods: {
		clipboard: true,
		dragDrop: true,
		urlPaste: true,
		filePicker: true,
	},
	clipboardMode: "manual",
	autoStart: true,
	prefLang: "zh",
	prefMode: "auto",
	accentColor: "#00C896",
	providers: getDefaultProviders(),
	activeProvider: "gemini",
	analysisStyle: "",
	modeProfiles: DEFAULT_MODE_PROFILES,
	stylePresets: DEFAULT_STYLE_PRESETS,
	customFontPath: "",
	fontSize: "medium",
	shortcuts: {
		clipboardRead: "Ctrl+Shift+C",
		toggleWindow: "Ctrl+Shift+H",
		copyResult: "Ctrl+Shift+D",
		switchLang: "Ctrl+Shift+L",
		analyze: "Ctrl+Enter",
	},
	dataDir: "",
	defaultAnalysisMode: "design" as string,
	exportFormat: "md",
	quickSave: true,
	sidebarWidth: 180,
	sidebarOrder: [],
	ocrEngine: DEFAULT_OCR_ENGINE,
	ocrEngineDownloaded: { ...DEFAULT_OCR_DOWNLOAD_STATE },
	ocrCustomDownloadUrl: "",
};

export function usePreferences() {
	const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
	const [loaded, setLoaded] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const raw = await tauriInvoke("load_config");
				if (raw && raw !== "{}") {
					try {
						const saved = JSON.parse(raw);
						if (!cancelled) setConfig({ ...DEFAULT_CONFIG, ...saved });
					} catch (_e) {
						/* use defaults */
					}
				}
			} catch (e) {
				console.error("load_config failed:", e);
				if (!cancelled) setError(String(e));
			}
			if (!cancelled) setLoaded(true);
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	const saveConfig = useCallback(async (newConfig: AppConfig) => {
		setConfig(newConfig);
		await tauriInvoke("save_config", {
			config: JSON.stringify(newConfig, null, 2),
		});
	}, []);

	const updateProvider = useCallback(
		async (index: number, provider: ProviderConfig) => {
			const newProviders = [...config.providers];
			newProviders[index] = provider;
			await saveConfig({ ...config, providers: newProviders });
		},
		[config, saveConfig],
	);

	const setActiveProvider = useCallback(
		async (id: string) => {
			await saveConfig({
				...config,
				activeProvider: id as AppConfig["activeProvider"],
			});
		},
		[config, saveConfig],
	);

	const toggleInputMethod = useCallback(
		async (key: keyof AppConfig["inputMethods"]) => {
			const newMethods = {
				...config.inputMethods,
				[key]: !config.inputMethods[key],
			};
			await saveConfig({ ...config, inputMethods: newMethods });
		},
		[config, saveConfig],
	);

	const setDefaultAnalysisMode = useCallback(
		async (mode: string) => {
			await saveConfig({ ...config, defaultAnalysisMode: mode });
		},
		[config, saveConfig],
	);

	const setQuickSave = useCallback(
		async (enabled: boolean) => {
			await saveConfig({ ...config, quickSave: enabled });
		},
		[config, saveConfig],
	);

	const activeProviderConfig =
		config.providers.find((p) => p.id === config.activeProvider) ??
		config.providers[0];

	return {
		config,
		loaded,
		error,
		saveConfig,
		updateProvider,
		setActiveProvider,
		toggleInputMethod,
		setDefaultAnalysisMode,
		setQuickSave,
		activeProviderConfig,
	};
}
