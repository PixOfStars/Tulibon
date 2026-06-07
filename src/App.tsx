import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { usePreferences } from "./hooks/usePreferences";
import { getTheme, AppTheme } from "./styles/theme";
import { WINDOW_RADIUS } from "./styles/layoutConstants";
import { ToastProvider } from "./components/common/Toast";
import Sidebar from "./components/layout/Sidebar";
import TitleBar from "./components/layout/TitleBar";
import Home from "./components/home/Home";
import SettingsModal from "./components/modals/SettingsModal";
import AboutModal from "./components/modals/AboutModal";
import ForceUpdateModal from "./components/modals/ForceUpdateModal";
import type { AnalysisRecord, Collection, Tag } from "./types";
import { DEFAULT_COLLECTIONS } from "./types";
import { tauriInvoke, createIpcChannel } from "./utils/tauri";
import { migrateHistory, isLegacyRecord, generateId } from "./utils/helpers";
import { getT } from "./utils/i18n";

// ==========================================
// 子组件：应用启动加载屏
// ==========================================
const SplashLoading = ({ appName, error }: { appName: string; error?: string }) => (
    <div
        style={{
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#0F0F0F",
            color: "#fff",
            fontFamily: "system-ui, -apple-system, sans-serif",
            borderRadius: WINDOW_RADIUS,
            overflow: "hidden",
            gap: 12,
        }}
    >
        <div style={{ fontSize: 16, fontWeight: 700 }}>{appName}</div>
        {error ? (
            <div style={{ fontSize: 12, color: "#FF3B30", textAlign: "center", padding: "0 40px", maxWidth: 400 }}>
                {error}
            </div>
        ) : (
            <div style={{ fontSize: 12, opacity: 0.5 }}>…</div>
        )}
    </div>
);

// ==========================================
// 主组件 App
// ==========================================
const App = () => {
    const prefs = usePreferences();
    const t = getT(prefs.config.prefLang);

    // ── 1. UI 状态管理 ──
    const [homeView, setHomeView] = useState<"analyze" | "browse" | "collections" | "collection" | "ocr">("analyze");
    const [collectionFilter, setCollectionFilter] = useState<string | null>(null);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [aboutOpen, setAboutOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [sidebarWidth, setSidebarWidth] = useState(prefs.config.sidebarWidth || 180);

    // ── 2. 核心数据状态 ──
    const [records, setRecords] = useState<AnalysisRecord[]>([]);
    const [collections, setCollections] = useState<Collection[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);

    // ── 3. 系统与加载状态 ──
    const [domainLoaded, setDomainLoaded] = useState(false);
    const [domainError, setDomainError] = useState("");
    const [forceUpdateInfo, setForceUpdateInfo] = useState<{ version: string; body: string } | null>(null);
    const [updateInstalling, setUpdateInstalling] = useState(false);
    const updateCheckRef = useRef<{ rid: number } | null>(null);

    // ── 初始化：并行加载 Tauri 数据，扁平化错误处理 ──
    useEffect(() => {
        let isSubscribed = true;

        const initializeData = async () => {
            try {
                // 1. Load Collections
                let loadedCollections: Collection[] = [];
                try {
                    const rawCol = await tauriInvoke("load_collections");
                    if (rawCol && rawCol !== "[]") {
                        loadedCollections = JSON.parse(rawCol);
                    } else {
                        const now = Date.now();
                        loadedCollections = DEFAULT_COLLECTIONS.map((dc) => ({ ...dc, createdAt: now, updatedAt: now }));
                        await tauriInvoke("save_collections", { collections: JSON.stringify(loadedCollections) });
                    }
                } catch (e) {
                    console.error("load_collections:", e);
                    const now = Date.now();
                    loadedCollections = DEFAULT_COLLECTIONS.map((dc) => ({ ...dc, createdAt: now, updatedAt: now }));
                }

                // 2. Load Tags
                let loadedTags: Tag[] = [];
                try {
                    const rawTags = await tauriInvoke("load_tags");
                    if (rawTags && rawTags !== "[]") loadedTags = JSON.parse(rawTags);
                } catch (e) {
                    console.error("load_tags:", e);
                }

                // 3. Load & Migrate History
                let loadedRecords: AnalysisRecord[] = [];
                try {
                    const rawHist = await tauriInvoke("load_history");
                    if (rawHist && rawHist !== "[]") {
                        const parsed = JSON.parse(rawHist);
                        if (Array.isArray(parsed) && parsed.length > 0 && isLegacyRecord(parsed[0])) {
                            const migrated = migrateHistory(rawHist);
                            loadedRecords = migrated.records;

                            // Merge tags during migration
                            const tagMap = new Map(loadedTags.map((t) => [t.id, t]));
                            for (const tag of migrated.tags) {
                                if (!tagMap.has(tag.id)) tagMap.set(tag.id, tag);
                            }
                            loadedTags = Array.from(tagMap.values());

                            await tauriInvoke("save_history", { records: JSON.stringify(loadedRecords) });
                        } else {
                            loadedRecords = parsed as AnalysisRecord[];
                        }
                    }
                } catch (e) {
                    console.error("load_history:", e);
                }

                // 4. Update State if still mounted
                if (isSubscribed) {
                    setCollections(loadedCollections);
                    setTags(loadedTags);
                    setRecords(loadedRecords);
                    setDomainLoaded(true);
                }
            } catch (e) {
                console.error("domain init critical error:", e);
                if (isSubscribed) setDomainError(String(e));
            }
        };

        initializeData();
        return () => { isSubscribed = false; };
    }, []);

    // ── 系统更新检查 ──
    useEffect(() => {
        if (!domainLoaded) return;
        let isSubscribed = true;
        (async () => {
            try {
                const result = await tauriInvoke("plugin:updater|check");
                if (isSubscribed && result) {
                    updateCheckRef.current = { rid: result.rid };
                    setForceUpdateInfo({ version: result.version, body: result.body || "" });
                }
            } catch { /* ignore update errors */ }
        })();
        return () => { isSubscribed = false; };
    }, [domainLoaded]);

    const handleForceUpdate = async () => {
        setUpdateInstalling(true);
        try {
            await tauriInvoke("plugin:updater|download_and_install", {
                onEvent: createIpcChannel(),
                rid: updateCheckRef.current?.rid,
            });
        } catch (e) {
            console.error("[Updater] fail:", e);
            setUpdateInstalling(false);
        }
    };

    // ── 数据持久化 Handlers ──
    const saveRecords = useCallback(async (newRecords: AnalysisRecord[]) => {
        setRecords(newRecords);
        await tauriInvoke("save_history", { records: JSON.stringify(newRecords) });
    }, []);

    const saveTags = useCallback(async (newTags: Tag[]) => {
        setTags(newTags);
        await tauriInvoke("save_tags", { tags: JSON.stringify(newTags) });
    }, []);

    const saveCollections = useCallback(async (newCollections: Collection[]) => {
        setCollections(newCollections);
        await tauriInvoke("save_collections", { collections: JSON.stringify(newCollections) });
    }, []);

    // ── 集合(Collection)操作 Handlers ──
    const handleCreateCollection = useCallback((name: { zh: string; en: string }, onCreated?: (id: string) => void) => {
        const now = Date.now();
        const colors = ["#6366F1", "#F59E0B", "#EC4899", "#14B8A6", "#3B82F6", "#EF4444", "#8B5CF6", "#06B6D4"];
        const newCollection: Collection = {
            id: `col_${generateId()}`,
            name,
            icon: "Folder",
            color: colors[Math.floor(Math.random() * colors.length)],
            createdAt: now,
            updatedAt: now,
        };
        saveCollections([...collections, newCollection]);
        onCreated?.(newCollection.id);
    }, [collections, saveCollections]);

    const handleDeleteCollection = useCallback((id: string) => {
        saveCollections(collections.filter((c) => c.id !== id));
        saveRecords(records.map((r) => ({ ...r, collectionIds: r.collectionIds.filter((cid) => cid !== id) })));
    }, [collections, records, saveCollections, saveRecords]);

    const handleUpdateCollection = useCallback((updated: Collection) => {
        saveCollections(collections.map((c) => (c.id === updated.id ? updated : c)));
    }, [collections, saveCollections]);

    // ── 路由与导航 ──
    const handleSidebarNav = useCallback((view: string) => {
        const routeMap: Record<string, typeof homeView> = {
            home: "analyze",
            history: "browse",
            collections: "collections",
            ocr: "ocr",
        };
        if (routeMap[view]) {
            setHomeView(routeMap[view]);
            setCollectionFilter(null);
        } else {
            setHomeView("collection");
            setCollectionFilter(view);
        }
    }, []);

    // ── 样式与主题计算 ──
    const theme: AppTheme = getTheme(prefs.config.prefMode, prefs.config.accentColor);
    const colors = theme.colors;
    
    const cssVariables = useMemo(() => ({
        "--bg": colors.bg,
        "--text": colors.text,
        "--text-header": colors.textHeader,
        "--border": colors.border,
        "--gray-bg": colors.grayBg,
        "--overlay": colors.overlay,
        "--accent": colors.accent,
        "--accent-bg": colors.accentBg,
        "--error": colors.error,
        "--error-bg": colors.errorBg,
        "--success": colors.success,
        "--warning": colors.warning,
    } as React.CSSProperties), [colors]);

    const fontSizeZoom = prefs.config.fontSize === "small" ? 0.88 : prefs.config.fontSize === "large" ? 1.15 : 1;

    // ── 渲染拦截：加载中 ──
    if (!prefs.loaded || !domainLoaded) {
        return <SplashLoading appName={t.appName} error={domainError} />;
    }

    // ── 主界面渲染 ──
    return (
        <ToastProvider accentColor={colors.accent} errorColor={colors.error}>
            <div
                style={{
                    height: "100vh",
                    backgroundColor: colors.bg,
                    borderRadius: WINDOW_RADIUS,
                    overflow: "hidden",
                    transition: "background-color 0.3s",
                    ...cssVariables,
                }}
            >
                <div style={{ height: "100%", display: "flex", flexDirection: "column", color: colors.text, transition: "color 0.3s", zoom: fontSizeZoom }}>
                    
                    <TitleBar
                        theme={theme}
                        sidebarCollapsed={sidebarCollapsed}
                        onToggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
                        lang={prefs.config.prefLang}
                    />

                    <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
                        <Sidebar
                            width={sidebarCollapsed ? 56 : sidebarWidth}
                            collapsed={sidebarCollapsed}
                            activeView={
                                homeView === "collection" ? "collections" :
                                homeView === "analyze" ? "home" :
                                homeView === "browse" ? "history" : homeView
                            }
                            onNavigate={handleSidebarNav}
                            onOpenSettings={() => setSettingsOpen(true)}
                            onOpenAbout={() => setAboutOpen(true)}
                            onResize={(w) => {
                                setSidebarWidth(w);
                                prefs.saveConfig({ ...prefs.config, sidebarWidth: w });
                            }}
                            theme={theme}
                            lang={prefs.config.prefLang}
                        />

                        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                            <Home
                                key="main"
                                prefs={prefs}
                                theme={theme}
                                collectionFilter={collectionFilter}
                                records={records}
                                collections={collections}
                                tags={tags}
                                viewMode={homeView}
                                onRecordsChange={saveRecords}
                                onTagsChange={saveTags}
                                onNavigate={handleSidebarNav}
                                onCreateCollection={handleCreateCollection}
                                onUpdateCollection={handleUpdateCollection}
                                onDeleteCollection={handleDeleteCollection}
                            />
                        </div>
                    </div>

                    {/* 全局弹窗层 */}
                    {forceUpdateInfo && (
                        <ForceUpdateModal
                            theme={theme}
                            t={t}
                            version={forceUpdateInfo.version}
                            body={forceUpdateInfo.body}
                            installing={updateInstalling}
                            onUpdate={handleForceUpdate}
                            onDismiss={() => { setForceUpdateInfo(null); setUpdateInstalling(false); }}
                        />
                    )}
                    {settingsOpen && <SettingsModal prefs={prefs} theme={theme} onClose={() => setSettingsOpen(false)} />}
                    {aboutOpen && <AboutModal theme={theme} lang={prefs.config.prefLang} onClose={() => setAboutOpen(false)} />}
                </div>
            </div>
        </ToastProvider>
    );
};

export default App;