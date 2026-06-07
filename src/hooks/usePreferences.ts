import { useState, useEffect, useCallback, useMemo } from "react";
import { getDefaultProviders } from "../api";
import {
    DEFAULT_MODE_PROFILES,
    DEFAULT_STYLE_PRESETS,
} from "../types";
import type { AppConfig, ProviderConfig } from "../types";
import { tauriInvoke } from "../utils/tauri";

export const DEFAULT_CONFIG: AppConfig = {
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
    fontSize: "medium",
    dataDir: "",
    defaultAnalysisMode: "design",
    exportFormat: "md",
    quickSave: true,
    sidebarWidth: 180,
    sidebarOrder: [],
};

export function usePreferences() {
    const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState("");

    // ── 加载本地配置 ──
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const raw = await tauriInvoke("load_config");
                if (raw && raw !== "{}") {
                    try {
                        const saved: Partial<AppConfig> = JSON.parse(raw);
                        
                        if (!cancelled) {
                            // 【关键修复】：手动处理嵌套对象的合并，防止老版本配置覆盖掉新版本的默认嵌套字段
                            const mergedConfig: AppConfig = {
                                ...DEFAULT_CONFIG,
                                ...saved,
                                inputMethods: {
                                    ...DEFAULT_CONFIG.inputMethods,
                                    ...(saved.inputMethods || {}),
                                },
                            };
                            setConfig(mergedConfig);
                        }
                    } catch (_parseError) {
                        console.warn("Failed to parse config, using defaults.");
                    }
                }
            } catch (e) {
                console.error("load_config failed:", e);
                if (!cancelled) setError(String(e));
            } finally {
                if (!cancelled) setLoaded(true);
            }
        })();
        
        return () => { cancelled = true; };
    }, []);

    // ── 核心保存方法 ──
    const saveConfig = useCallback(async (newConfig: AppConfig) => {
        setConfig(newConfig);
        try {
            await tauriInvoke("save_config", {
                config: JSON.stringify(newConfig, null, 2),
            });
        } catch (e) {
            console.error("Failed to save config:", e);
        }
    }, []);

    // ── 快捷修改 Helpers ──
    const updateProvider = useCallback(async (index: number, provider: ProviderConfig) => {
        const newProviders = [...config.providers];
        newProviders[index] = provider;
        await saveConfig({ ...config, providers: newProviders });
    }, [config, saveConfig]);

    const setActiveProvider = useCallback(async (id: AppConfig["activeProvider"]) => {
        if (config.activeProvider !== id) {
            await saveConfig({ ...config, activeProvider: id });
        }
    }, [config, saveConfig]);

    const toggleInputMethod = useCallback(async (key: keyof AppConfig["inputMethods"]) => {
        await saveConfig({
            ...config,
            inputMethods: {
                ...config.inputMethods,
                [key]: !config.inputMethods[key],
            },
        });
    }, [config, saveConfig]);

    const setDefaultAnalysisMode = useCallback(async (mode: string) => {
        await saveConfig({ ...config, defaultAnalysisMode: mode });
    }, [config, saveConfig]);

    const setQuickSave = useCallback(async (enabled: boolean) => {
        await saveConfig({ ...config, quickSave: enabled });
    }, [config, saveConfig]);

    // ── 衍生状态 (使用 useMemo 缓存，提升性能) ──
    const activeProviderConfig = useMemo(() => {
        return config.providers.find((p) => p.id === config.activeProvider) ?? config.providers[0];
    }, [config.providers, config.activeProvider]);

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