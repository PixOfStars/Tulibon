import { useState } from "react";
import {
	Sparkle,
	WarningCircle,
	X,
	MagnifyingGlass,
} from "@phosphor-icons/react";
import type {
	AppTheme,
	AnalysisRecord,
	ImageSource,
	Collection,
	Tag,
	BatchItem,
} from "../types";
import ResultView from "./ResultView";
import { useToast } from "./Toast";
import InputSection from "./home/InputSection";
import BatchPanel from "./home/BatchPanel";
import HistoryPanel, { EmptyState } from "./home/HistoryPanel";
import CollectionHeader from "./home/CollectionHeader";
import CollectionsView from "./home/CollectionsView";
import { searchRecords } from "./home/HomeHelpers";
import { useHomeActions } from "./home/useHomeActions";
import { useAnalysis } from "./home/useAnalysis";
import { useGlobalShortcuts } from "./home/useGlobalShortcuts";
import { useInputHandlers } from "./home/useInputHandlers";
import { useCroppedImage } from "../hooks/useCroppedImage";
import { useTagManagement } from "./home/useTagManagement";
import { useUndoManager } from "./home/useUndoManager";
import { getT } from "../utils/i18n";

interface HomeProps {
	prefs: ReturnType<typeof import("../hooks/usePreferences").usePreferences>;
	theme: AppTheme;
	collectionFilter: string | null;
	records: AnalysisRecord[];
	collections: Collection[];
	tags: Tag[];
	searchQuery: string;
	onRecordsChange: (records: AnalysisRecord[]) => void;
	onTagsChange: (tags: Tag[]) => void;
	viewMode: "analyze" | "browse" | "search" | "collections" | "collection";
	hidden?: boolean;
	onNavigate?: (view: string) => void;
	onCreateCollection?: (
		name: { zh: string; en: string },
		onCreated?: (id: string) => void,
	) => void;
	onUpdateCollection?: (collection: Collection) => void;
	onDeleteCollection?: (id: string) => void;
	onSearch?: (query: string) => void;
}

const Home = ({
	prefs,
	theme,
	collectionFilter,
	records,
	collections,
	tags,
	searchQuery,
	onRecordsChange,
	onTagsChange,
	viewMode,
	hidden,
	onNavigate,
	onCreateCollection,
	onUpdateCollection,
	onDeleteCollection,
	onSearch,
}: HomeProps) => {
	const { config, activeProviderConfig } = prefs;
	const t = getT(config.prefLang);
	const toast = useToast();
	const colors = theme.colors;

	const isCollectionView = !!collectionFilter;
	const activeCollection = collectionFilter
		? collections.find((c) => c.id === collectionFilter)
		: null;

	const [analysisMode, setAnalysisMode] = useState<string>(
		config.defaultAnalysisMode || "design",
	);
	const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
		"idle",
	);
	const [errorMsg, setErrorMsg] = useState("");
	const [currentResult, setCurrentResult] = useState<AnalysisRecord | null>(
		null,
	);

	const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
	const [batchRunning, setBatchRunning] = useState(false);

	const crop = useCroppedImage({ colors, lang: config.prefLang });

	const {
		undoData,
		triggerUndo,
		handleUndo: doUndo,
		dismissUndo,
	} = useUndoManager();

	// ── Analysis ──
	const runAnalysis = useAnalysis({
		activeProviderConfig,
		quickSave: config.quickSave,
		needApiKey: t.needApiKey,
		tags,
		onTagsChange,
		setStatus,
		setErrorMsg,
		modeProfiles: config.modeProfiles,
		stylePresets: config.stylePresets,
	});

	const handleSingleAnalysis = async (
		imageDataUrl: string,
		profileId: string,
		source: ImageSource,
	) => {
		const record = await runAnalysis(imageDataUrl, profileId, source);
		if (record) {
			setCurrentResult(record);
			setStatus("done");
			crop.cancelCrop();
			onRecordsChange([record, ...records]);
		}
	};

	const { handleClipboard, handleUrlPaste, handleFileSelect } =
		useInputHandlers({
			config,
			analysisMode,
			t,
			toast,
			setCropImage: (url) => {
				if (url) crop.startCrop(url);
			},
			setStatus,
			setBatchItems,
		});

	useGlobalShortcuts({
		handleClipboard,
		handleSingleAnalysis,
		analysisMode,
		currentResult,
		config,
		t,
		toast,
		prefs,
		hidden: hidden ?? false,
	});

	// ── Batch ──
	const handleBatchStart = async () => {
		setBatchRunning(true);
		const completed: AnalysisRecord[] = [];
		for (let i = 0; i < batchItems.length; i++) {
			if (batchItems[i].status !== "queued") continue;
			setBatchItems((prev) =>
				prev.map((it, idx) =>
					idx === i ? { ...it, status: "analyzing" as const } : it,
				),
			);
			const rec = await runAnalysis(
				batchItems[i].imageDataUrl,
				batchItems[i].analysisMode || analysisMode,
				"file",
			);
			if (rec) {
				completed.push(rec);
				setBatchItems((prev) =>
					prev.map((it, idx) =>
						idx === i ? { ...it, status: "done" as const } : it,
					),
				);
			} else {
				setBatchItems((prev) =>
					prev.map((it, idx) =>
						idx === i
							? { ...it, status: "error" as const, error: t.batchErrorMsg }
							: it,
					),
				);
			}
		}
		if (completed.length > 0) onRecordsChange([...completed, ...records]);
		setBatchRunning(false);
	};

	// ── Record actions ──
	const { toggleCollection, deleteRecord, exportRecord } = useHomeActions({
		records,
		collections,
		currentResult,
		config,
		t,
		onRecordsChange,
		setCurrentResult,
		setStatus,
		toast,
	});

	const { handleAddUserTag, handleRemoveUserTag } = useTagManagement(
		records,
		tags,
		currentResult,
		onRecordsChange,
		onTagsChange,
		setCurrentResult,
	);

	const handleUndo = () =>
		doUndo(onRecordsChange, () => {
			setCurrentResult(null);
			setStatus("idle");
		});

	// ── Derived state ──
	const isAnalyzing = status === "loading";
	const showAnalyzeUi = viewMode === "analyze";
	const filteredByCollection = collectionFilter
		? records.filter((r) => r.collectionIds.includes(collectionFilter))
		: records;
	const displayHistory = searchQuery.trim()
		? searchRecords(filteredByCollection, tags, searchQuery)
		: filteredByCollection;
	const showHistoryList =
		!crop.isCropping &&
		status !== "done" &&
		displayHistory.length > 0 &&
		!isCollectionView;
	const showEmpty =
		!crop.isCropping &&
		status === "idle" &&
		displayHistory.length === 0 &&
		batchItems.length === 0 &&
		!isCollectionView &&
		viewMode !== "browse" &&
		viewMode !== "search";

	const renderRecordList = (list: AnalysisRecord[], title?: string) => (
		<div style={{ paddingTop: 8 }}>
			{title && (
				<div
					style={{
						fontSize: 13,
						fontWeight: 700,
						color: colors.textHeader,
						padding: "8px 0 4px",
						marginBottom: 4,
					}}
				>
					{title}
				</div>
			)}
			{list.length === 0 ? (
				<EmptyState
					colors={colors}
					isCollectionView={!!collectionFilter}
					t={t}
				/>
			) : (
				<HistoryPanel
					records={list}
					tags={tags}
					collections={collections}
					themeColors={colors}
					lang={config.prefLang}
					isCollectionView={!!collectionFilter}
					onSelectRecord={(record) => {
						setCurrentResult(record);
						setStatus("done");
						crop.cancelCrop();
					}}
				/>
			)}
		</div>
	);

	return (
		<div
			style={{
				height: "100%",
				display: "flex",
				flexDirection: "column",
				overflow: "hidden",
			}}
		>
			{/* Analyze input */}
			{showAnalyzeUi && (
				<div>
					<InputSection
						config={config}
						themeColors={colors}
						analysisMode={analysisMode}
						onModeChange={setAnalysisMode}
						isAnalyzing={isAnalyzing}
						onClipboard={handleClipboard}
						onFileSelect={handleFileSelect}
						onUrlPaste={handleUrlPaste}
					/>
					{crop.cropComponent}
				</div>
			)}

			{/* Browse header */}
			{viewMode === "browse" && (
				<div className="fade-in-fast" style={{ padding: "12px 20px 6px" }}>
					<div
						style={{ fontSize: 16, fontWeight: 700, color: colors.textHeader }}
					>
						{t.history}
					</div>
					<div
						style={{
							fontSize: 11,
							color: colors.text,
							opacity: 0.5,
							marginTop: 2,
						}}
					>
						{t.recordCount.replace("{n}", String(records.length))}
					</div>
				</div>
			)}

			{/* Search header */}
			{viewMode === "search" && (
				<div className="fade-in-fast" style={{ padding: "12px 20px 6px" }}>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 8,
							padding: "0 14px",
							borderRadius: 10,
							backgroundColor: `${colors.accent}08`,
							border: `1px solid ${searchQuery ? colors.accent : colors.border}`,
						}}
					>
						<MagnifyingGlass
							size={18}
							weight="bold"
							color={searchQuery ? colors.accent : colors.text}
							style={{ opacity: searchQuery ? 1 : 0.4 }}
						/>
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => onSearch?.(e.target.value)}
							placeholder="Search history..."
							style={{
								flex: 1,
								padding: "12px 0",
								border: "none",
								background: "none",
								color: colors.textHeader,
								fontSize: 14,
								outline: "none",
							}}
						/>
					</div>
				</div>
			)}

			{/* Collections list */}
			{viewMode === "collections" && (
				<CollectionsView
					collections={collections}
					records={records}
					lang={config.prefLang}
					colors={colors}
					onCreateCollection={onCreateCollection}
					onUpdateCollection={onUpdateCollection}
					onDeleteCollection={onDeleteCollection}
					onNavigate={onNavigate}
				/>
			)}

			{/* Collection header */}
			{isCollectionView && activeCollection && (
				<CollectionHeader
					collection={activeCollection}
					recordCount={displayHistory.length}
					colors={colors}
					lang={config.prefLang}
					isBuiltIn={activeCollection.id.startsWith("__")}
					onBack={() => onNavigate?.("collections")}
					onDelete={
						activeCollection.id.startsWith("__")
							? undefined
							: () => {
									if (onDeleteCollection)
										onDeleteCollection(activeCollection.id);
								}
					}
				/>
			)}

			{/* Undo banner */}
			{undoData && (
				<div
					style={{
						position: "absolute",
						top: 60,
						left: "50%",
						transform: "translateX(-50%)",
						zIndex: 100,
						display: "flex",
						alignItems: "center",
						gap: 10,
						padding: "8px 18px",
						borderRadius: 100,
						backgroundColor: colors.textHeader,
						color: colors.bg,
						fontSize: 12,
						fontWeight: 600,
						boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
					}}
				>
					<span>{undoData.message}</span>
					<button
						onClick={handleUndo}
						style={{
							padding: "4px 12px",
							borderRadius: 6,
							border: "none",
							backgroundColor: colors.accent,
							color: "#000",
							fontSize: 11,
							fontWeight: 700,
							cursor: "pointer",
						}}
					>
						{t.undoAction}
					</button>
					<button
						onClick={dismissUndo}
						style={{
							background: "none",
							border: "none",
							cursor: "pointer",
							color: colors.bg,
							padding: 2,
						}}
					>
						<X size={14} />
					</button>
				</div>
			)}

			{/* Content area */}
			<div
				style={{
					flex: 1,
					overflow: "auto",
					padding: "0 20px 16px",
					position: "relative",
				}}
			>
				{isAnalyzing && !crop.isCropping && showAnalyzeUi && (
					<div style={{ textAlign: "center", padding: 40 }}>
						<div
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: 10,
								padding: "10px 24px",
								backgroundColor: colors.accent,
								color: "#000",
								borderRadius: 100,
								fontSize: 13,
								fontWeight: 700,
							}}
						>
							<Sparkle
								size={18}
								weight="fill"
								style={{ animation: "pulse 1.5s infinite" }}
							/>
							{t.loading}
						</div>
					</div>
				)}

				{status === "error" && showAnalyzeUi && (
					<div
						style={{
							padding: 16,
							borderRadius: 12,
							marginTop: 8,
							backgroundColor: colors.errorBg,
							border: `1px solid rgba(255, 59, 48, 0.2)`,
						}}
					>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: 8,
								marginBottom: 8,
							}}
						>
							<WarningCircle size={18} weight="fill" color={colors.error} />
							<span
								style={{ fontSize: 13, fontWeight: 700, color: colors.error }}
							>
								{t.error}
							</span>
						</div>
						<pre
							style={{
								fontSize: 11,
								color: colors.error,
								whiteSpace: "pre-wrap",
								fontFamily: theme.fonts.mono,
								lineHeight: 1.5,
							}}
						>
							{errorMsg}
						</pre>
						<button
							onClick={() => {
								setStatus("idle");
								setErrorMsg("");
							}}
							style={{
								marginTop: 10,
								padding: "6px 16px",
								borderRadius: 8,
								border: "none",
								backgroundColor: colors.error,
								color: "#fff",
								fontSize: 12,
								fontWeight: 600,
								cursor: "pointer",
							}}
						>
							{t.dismiss}
						</button>
					</div>
				)}

				{showAnalyzeUi &&
					status === "done" &&
					currentResult &&
					!crop.isCropping && (
						<div style={{ paddingTop: 8 }}>
							<ResultView
								record={currentResult}
								theme={theme}
								lang={config.prefLang}
								tags={tags}
								collections={collections}
								onToggleCollection={(collId) =>
									toggleCollection(currentResult.id, collId)
								}
								onDelete={() => deleteRecord(currentResult.id, triggerUndo)}
								onExport={(fmt) => exportRecord(currentResult, fmt)}
								onCopy={(text) => {
									navigator.clipboard.writeText(text);
									toast.show(t.copiedToClipboard, "success");
								}}
								onAddUserTag={(name) =>
									handleAddUserTag(currentResult.id, name)
								}
								onRemoveUserTag={(tagId) =>
									handleRemoveUserTag(currentResult.id, tagId)
								}
								defaultExportFormat={config.exportFormat}
							/>
						</div>
					)}

				{showAnalyzeUi && batchItems.length > 0 && (
					<BatchPanel
						batchItems={batchItems}
						batchRunning={batchRunning}
						themeColors={colors}
						lang={config.prefLang}
						onStart={handleBatchStart}
						onClear={() => setBatchItems([])}
						onRemove={(id) =>
							setBatchItems((prev) => prev.filter((it) => it.id !== id))
						}
					/>
				)}

				{["analyze", "browse", "search", "collection"].includes(viewMode) && (
					<>
						{showHistoryList &&
							showAnalyzeUi &&
							renderRecordList(displayHistory)}
						{viewMode === "browse" && renderRecordList(records)}
						{viewMode === "search" &&
							searchQuery.trim() &&
							renderRecordList(
								searchRecords(records, tags, searchQuery),
								"Results: " + records.length,
							)}
						{isCollectionView && displayHistory.length > 0 && (
							<div style={{ paddingTop: 8 }}>
								<HistoryPanel
									records={displayHistory}
									tags={tags}
									collections={collections}
									themeColors={colors}
									lang={config.prefLang}
									isCollectionView={true}
									onSelectRecord={(record) => {
										setCurrentResult(record);
										setStatus("done");
										crop.cancelCrop();
									}}
								/>
							</div>
						)}
						{showEmpty && (
							<EmptyState colors={colors} isCollectionView={false} t={t} />
						)}
						{viewMode === "search" &&
							!searchQuery.trim() &&
							records.length > 0 &&
							renderRecordList(records)}
					</>
				)}
			</div>
		</div>
	);
};

export default Home;
