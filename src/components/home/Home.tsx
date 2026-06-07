import { useState, useRef, useCallback, useEffect } from "react";
import {
    WarningCircle,
    X,
} from "@phosphor-icons/react";
import type {
    AppTheme,
    AnalysisRecord,
    ImageSource,
    Collection,
    Tag,
    BatchItem,
} from "../../types";
import ResultView from "../result/ResultView";
import { useToast } from "../common/Toast";
import InputSection from "./InputSection";
import BatchProgressBar from "./BatchProgressBar";
import HistoryPanel, { EmptyState } from "./HistoryPanel";
import AnalyzingState from "./AnalyzingState";
import CollectionHeader from "./CollectionHeader";
import CollectionsView from "./CollectionsView";
import { useHomeActions } from "../../hooks/useHomeActions";
import { useAnalysis } from "../../hooks/useAnalysis";
import type { CropRect } from "../../types";
import { useInputHandlers } from "../../hooks/useInputHandlers";
import { useCroppedImage } from "../../hooks/useCroppedImage";
import OcrPage from "./OcrPage";
import { useTagManagement } from "../../hooks/useTagManagement";
import { useUndoManager } from "../../hooks/useUndoManager";
import { getT } from "../../utils/i18n";
import { scrollContainer } from '../../styles/layout';

// ==========================================
// 提取的本地子组件 (UI 分离)
// ==========================================

const BrowseHeader = ({ count, colors, t }: { count: number; colors: Record<string, string>; t: Record<string, string> }) => (
    <div className="fade-in-fast" style={{ padding: "12px 20px 6px" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: colors.textHeader }}>
            {t.history}（{count}{t.recordCountUnit || "条"}）
        </div>
    </div>
);

const UndoBanner = ({ undoData, onUndo, onDismiss, colors, t }: any) => {
    if (!undoData) return null;
    return (
        <div style={{
            position: "absolute", top: 60, left: "50%", transform: "translateX(-50%)", zIndex: 100,
            display: "flex", alignItems: "center", gap: 10, padding: "8px 18px", borderRadius: 100,
            backgroundColor: colors.textHeader, color: colors.bg, fontSize: 12, fontWeight: 600, boxShadow: "0 4px 20px rgba(0,0,0,0.2)"
        }}>
            <span>{undoData.message}</span>
            <button onClick={onUndo} style={{ padding: "4px 12px", borderRadius: 6, border: "none", backgroundColor: colors.accent, color: "#000", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                {t.undoAction}
            </button>
            <button onClick={onDismiss} style={{ background: "none", border: "none", cursor: "pointer", color: colors.bg, padding: 2 }}>
                <X size={14} />
            </button>
        </div>
    );
};

const ErrorState = ({ errorMsg, onDismiss, colors, t }: { errorMsg: string; onDismiss: () => void; colors: Record<string, string>; t: Record<string, string> }) => (
    <div style={{ padding: 16, borderRadius: 12, marginTop: 8, backgroundColor: colors.errorBg, border: `1px solid rgba(255, 59, 48, 0.2)` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <WarningCircle size={18} weight="fill" color={colors.error} />
            <span style={{ fontSize: 13, fontWeight: 700, color: colors.error }}>{t.error}</span>
        </div>
        <pre style={{ fontSize: 11, color: colors.error, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{errorMsg}</pre>
        <button onClick={onDismiss} style={{ marginTop: 10, padding: "6px 16px", borderRadius: 8, border: "none", backgroundColor: colors.error, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            {t.dismiss}
        </button>
    </div>
);

// ==========================================
// 主组件 Home
// ==========================================

interface HomeProps {
    prefs: ReturnType<typeof import("../../hooks/usePreferences").usePreferences>;
    theme: AppTheme;
    collectionFilter: string | null;
    records: AnalysisRecord[];
    collections: Collection[];
    tags: Tag[];
    onRecordsChange: (records: AnalysisRecord[]) => void;
    onTagsChange: (tags: Tag[]) => void;
    viewMode: "analyze" | "browse" | "collections" | "collection" | "ocr";
    hidden?: boolean;
    onNavigate?: (view: string) => void;
    onCreateCollection?: (name: { zh: string; en: string }, onCreated?: (id: string) => void) => void;
    onUpdateCollection?: (collection: Collection) => void;
    onDeleteCollection?: (id: string) => void;
}

const Home = ({
    prefs, theme, collectionFilter, records, collections, tags,
    onRecordsChange, onTagsChange, viewMode, onNavigate,
    onCreateCollection, onUpdateCollection, onDeleteCollection,
}: HomeProps) => {
    const { config, activeProviderConfig } = prefs;
    const t = getT(config.prefLang);
    const toast = useToast();
    const colors = theme.colors;

    const isCollectionView = !!collectionFilter;
    const activeCollection = collectionFilter ? collections.find((c) => c.id === collectionFilter) : null;

    const [analysisMode, setAnalysisMode] = useState<string>(config.defaultAnalysisMode || "design");
    const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
    const [errorMsg, setErrorMsg] = useState("");
    const [currentResult, setCurrentResult] = useState<AnalysisRecord | null>(null);
    const [selectedRecord, setSelectedRecord] = useState<AnalysisRecord | null>(null);
    const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
    const [batchRunning, setBatchRunning] = useState(false);

    // 切换到 analyze 模式时，重置为初始状态
    useEffect(() => {
        if (viewMode === "analyze") {
            setCurrentResult(null);
            setSelectedRecord(null);
            setStatus("idle");
            setErrorMsg("");
        }
    }, [viewMode]);

    const runAnalysisRef = useRef<((img: string, mode: string, src: ImageSource, crop?: CropRect) => Promise<AnalysisRecord | null>) | null>(null);

    // Hooks (业务逻辑保持不变)
    const handleCropConfirm = useCallback(
        (imageUrl: string, cropRect: CropRect | null) => {
            const fn = runAnalysisRef.current;
            if (!fn) return;
            fn(imageUrl, analysisMode, "file", cropRect ?? undefined).then((record) => {
                if (record) {
                    setCurrentResult(record);
                    setStatus("done");
                    onRecordsChange([record, ...records]);
                }
            });
        },
        [analysisMode, records, onRecordsChange],
    );

    const crop = useCroppedImage({ colors, lang: config.prefLang, onCropConfirm: handleCropConfirm });
    const { undoData, triggerUndo, handleUndo: doUndo, dismissUndo } = useUndoManager();

    const runAnalysis = useAnalysis({
        activeProviderConfig, quickSave: config.quickSave, needApiKey: t.needApiKey,
        tags, onTagsChange, setStatus, setErrorMsg, modeProfiles: config.modeProfiles, stylePresets: config.stylePresets,
    });
    runAnalysisRef.current = runAnalysis;


    const { handleClipboard, handleUrlPaste, handleFileSelect } = useInputHandlers({
        config, analysisMode, t, toast, setStatus, setBatchItems,
        setCropImage: (url) => { if (url) crop.startCrop(url); },
    });

    const handleBatchStart = async () => {
        setBatchRunning(true);
        const completed: AnalysisRecord[] = [];
        for (let i = 0; i < batchItems.length; i++) {
            if (batchItems[i].status !== "queued") continue;
            setBatchItems((prev) => prev.map((it, idx) => idx === i ? { ...it, status: "analyzing" as const } : it));
            const rec = await runAnalysis(batchItems[i].imageDataUrl, batchItems[i].analysisMode || analysisMode, "file");
            if (rec) {
                completed.push(rec);
                setBatchItems((prev) => prev.map((it, idx) => idx === i ? { ...it, status: "done" as const } : it));
            } else {
                setBatchItems((prev) => prev.map((it, idx) => idx === i ? { ...it, status: "error" as const, error: t.batchErrorMsg } : it));
            }
        }
        if (completed.length > 0) onRecordsChange([...completed, ...records]);
        setBatchRunning(false);
    };

    const { toggleCollection, deleteRecord, exportRecord } = useHomeActions({
        records, collections, currentResult, config, t, onRecordsChange, setCurrentResult, setStatus, toast,
    });

    const { handleAddUserTag, handleRemoveUserTag } = useTagManagement(
        records, tags, currentResult, onRecordsChange, onTagsChange, setCurrentResult,
    );

    const handleUndo = () => doUndo(onRecordsChange, () => { setCurrentResult(null); setStatus("idle"); });

    // 派生状态提取
    const isAnalyzing = status === "loading";
    const showAnalyzeUi = viewMode === "analyze";
    const filteredByCollection = collectionFilter ? records.filter((r) => r.collectionIds.includes(collectionFilter)) : records;
    const displayHistory = filteredByCollection;
    const showEmpty = !crop.isCropping && status === "idle" && displayHistory.length === 0 && batchItems.length === 0 && !isCollectionView && viewMode !== "browse";

    // 渲染列表的 Helper 方法
    const renderRecordList = (list: AnalysisRecord[], title?: string) => (
        <div style={{ paddingTop: 8 }}>
            {title && <div style={{ fontSize: 13, fontWeight: 700, color: colors.textHeader, padding: "8px 0 4px", marginBottom: 4 }}>{title}</div>}
            {list.length === 0 ? (
                <EmptyState colors={colors} isCollectionView={!!collectionFilter} t={t} />
            ) : (
                <HistoryPanel
                    records={list} tags={tags} collections={collections} themeColors={colors}
                    lang={config.prefLang} isCollectionView={!!collectionFilter}
                    onSelectRecord={(record) => { setSelectedRecord(record); }}
                />
            )}
        </div>
    );

    // 渲染主内容区 (分离不同 View 模式，避免多重嵌套)
    const renderMainContent = () => {
        if (viewMode === "collections") {
            return <CollectionsView collections={collections} records={records} lang={config.prefLang} colors={colors} onCreateCollection={onCreateCollection} onUpdateCollection={onUpdateCollection} onDeleteCollection={onDeleteCollection} onNavigate={onNavigate} />;
        }
        if (viewMode === "ocr") {
            return <OcrPage theme={theme} lang={config.prefLang} config={config} />;
        }

        return (
            // 页面切换滑动动画：根据 viewMode 添加不同的进入方向
            <div className={viewMode === "browse" || viewMode === "collection" ? "page-enter-right" : viewMode === "analyze" ? "page-enter-left" : ""} style={{ ...scrollContainer, padding: "0 20px 16px" }}>
                {/* 状态展示 */}
                {isAnalyzing && !crop.isCropping && showAnalyzeUi && <AnalyzingState colors={colors} t={t} />}
                {status === "error" && showAnalyzeUi && <ErrorState errorMsg={errorMsg} onDismiss={() => { setStatus("idle"); setErrorMsg(""); }} colors={colors} t={t} />}

                {/* 分析结果展示（仅 analyze 模式且无 selectedRecord 时） */}
                {showAnalyzeUi && status === "done" && currentResult && !crop.isCropping && !selectedRecord && (
                    <div style={{ paddingTop: 8 }}>
                        <ResultView
                            record={currentResult} theme={theme} lang={config.prefLang} tags={tags} collections={collections}
                            onToggleCollection={(collId) => toggleCollection(currentResult.id, collId)}
                            onDelete={() => deleteRecord(currentResult.id, triggerUndo)}
                            onExport={(fmt) => exportRecord(currentResult, fmt)}
                            onCopy={(text) => { navigator.clipboard.writeText(text); toast.show(t.copiedToClipboard, "success"); }}
                            onAddUserTag={(name) => handleAddUserTag(currentResult.id, name)}
                            onRemoveUserTag={(tagId) => handleRemoveUserTag(currentResult.id, tagId)}
                            defaultExportFormat={config.exportFormat}
                            onBack={() => { setCurrentResult(null); setStatus("idle"); }}
                        />
                    </div>
                )}

                {/* 批量操作面板 */}
                {showAnalyzeUi && batchItems.length > 0 && (
                    <BatchProgressBar batchItems={batchItems} batchRunning={batchRunning} themeColors={colors} lang={config.prefLang} onStart={handleBatchStart} onClear={() => setBatchItems([])} onRemove={(id) => setBatchItems((prev) => prev.filter((it) => it.id !== id))} />
                )}

                {/* 历史记录 / 收藏夹：列表或详情 */}
                {["analyze", "browse", "collection"].includes(viewMode) && (
                    <>
                        {/* 详情视图：点击历史卡片后显示 */}
                        {selectedRecord && (
                            <div className="fade-in" style={{ paddingTop: 8 }}>
                                <ResultView
                                    record={selectedRecord} theme={theme} lang={config.prefLang} tags={tags} collections={collections}
                                    onToggleCollection={(collId) => toggleCollection(selectedRecord.id, collId)}
                                    onDelete={() => { deleteRecord(selectedRecord.id, triggerUndo); setSelectedRecord(null); }}
                                    onExport={(fmt) => exportRecord(selectedRecord, fmt)}
                                    onCopy={(text) => { navigator.clipboard.writeText(text); toast.show(t.copiedToClipboard, "success"); }}
                                    onAddUserTag={(name) => handleAddUserTag(selectedRecord.id, name)}
                                    onRemoveUserTag={(tagId) => handleRemoveUserTag(selectedRecord.id, tagId)}
                                    defaultExportFormat={config.exportFormat}
                                    onBack={() => setSelectedRecord(null)}
                                />
                            </div>
                        )}

                        {/* 列表视图：仅在未选中详情时显示 */}
                        {!selectedRecord && (
                            <>
                                {viewMode === "browse" && renderRecordList(records)}

                                {isCollectionView && activeCollection && (
                                    <CollectionHeader
                                        collection={activeCollection} recordCount={displayHistory.length} colors={colors} lang={config.prefLang} isBuiltIn={activeCollection.id.startsWith("__")}
                                        onBack={() => onNavigate?.("collections")}
                                        onDelete={activeCollection.id.startsWith("__") ? undefined : () => onDeleteCollection?.(activeCollection.id)}
                                    />
                                )}
                                {isCollectionView && displayHistory.length > 0 && renderRecordList(displayHistory)}
                            </>
                        )}

                        {showEmpty && <EmptyState colors={colors} isCollectionView={false} t={t} />}
                    </>
                )}
            </div>
        );
    };

    return (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* 顶部分析输入区域：仅在 idle/error 且未裁剪时显示 */}
            {showAnalyzeUi && (status === "idle" || status === "error") && !crop.isCropping && (
                <div>
                    <InputSection
                        config={config} themeColors={colors} analysisMode={analysisMode}
                        onModeChange={setAnalysisMode} isAnalyzing={isAnalyzing}
                        onClipboard={handleClipboard} onFileSelect={handleFileSelect} onUrlPaste={handleUrlPaste}
                    />
                </div>
            )}
            {/* 裁剪组件始终渲染（独立于输入区的折叠逻辑） */}
            {crop.cropComponent}

            {/* 各模式的 Header */}
            {viewMode === "browse" && <BrowseHeader count={records.length} colors={colors} t={t} />}

            {/* 悬浮组件 */}
            <UndoBanner undoData={undoData} onUndo={handleUndo} onDismiss={dismissUndo} colors={colors} t={t} />

            {/* 主内容区域 */}
            {renderMainContent()}
        </div>
    );
};

export default Home;