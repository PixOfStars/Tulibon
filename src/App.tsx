import { useState, useEffect, useCallback, useRef } from "react";
import { usePreferences } from "./hooks/usePreferences";
import { getTheme } from "./theme";
import { WINDOW_RADIUS } from "./styles";
import { ToastProvider } from "./components/Toast";
import Sidebar from "./components/Sidebar";
import TitleBar from "./components/TitleBar";
import Home from "./components/Home";
import SettingsModal from "./components/SettingsModal";
import AboutModal from "./components/AboutModal";
import ForceUpdateModal from "./components/ForceUpdateModal";
import type { AnalysisRecord, Collection, Tag } from "./types";
import { DEFAULT_COLLECTIONS } from "./types";
import { tauriInvoke, createIpcChannel } from "./utils/tauri";
import { migrateHistory, isLegacyRecord, generateId } from "./utils/helpers";
import { getT } from "./utils/i18n";

const App = () => {
	const prefs = usePreferences();

	const [homeView, setHomeView] = useState<
		"analyze" | "browse" | "collections" | "collection"
	>("analyze");
	const [collectionFilter, setCollectionFilter] = useState<string | null>(null);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [aboutOpen, setAboutOpen] = useState(false);
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
	const [sidebarWidth, setSidebarWidth] = useState(
		prefs.config.sidebarWidth || 180,
	);

	const [records, setRecords] = useState<AnalysisRecord[]>([]);
	const [collections, setCollections] = useState<Collection[]>([]);
	const [tags, setTags] = useState<Tag[]>([]);
	const [domainLoaded, setDomainLoaded] = useState(false);
	const [domainError, setDomainError] = useState("");
	const [forceUpdateInfo, setForceUpdateInfo] = useState<{
		version: string;
		body: string;
	} | null>(null);
	const [updateInstalling, setUpdateInstalling] = useState(false);
	const updateCheckRef = useRef<{ rid: number } | null>(null);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				// Collections
				try {
					const raw = await tauriInvoke("load_collections");
					if (!cancelled) {
						if (raw && raw !== "[]") {
							setCollections(JSON.parse(raw));
						} else {
							const now = Date.now();
							const defaults: Collection[] = DEFAULT_COLLECTIONS.map((dc) => ({
								...dc,
								createdAt: now,
								updatedAt: now,
							}));
							setCollections(defaults);
							await tauriInvoke("save_collections", {
								collections: JSON.stringify(defaults),
							});
						}
					}
				} catch (e) {
					console.error("load_collections:", e);
					if (!cancelled) {
						const now = Date.now();
						setCollections(
							DEFAULT_COLLECTIONS.map((dc) => ({
								...dc,
								createdAt: now,
								updatedAt: now,
							})),
						);
					}
				}

				// Tags
				try {
					const raw = await tauriInvoke("load_tags");
					if (!cancelled && raw && raw !== "[]") {
						setTags(JSON.parse(raw));
					}
				} catch (e) {
					console.error("load_tags:", e);
				}

				// Records
				try {
					const raw = await tauriInvoke("load_history");
					if (!cancelled && raw && raw !== "[]") {
						const parsed = JSON.parse(raw);
						if (
							Array.isArray(parsed) &&
							parsed.length > 0 &&
							isLegacyRecord(parsed[0])
						) {
							const migrated = migrateHistory(raw);
							setRecords(migrated.records);
							setTags((prev) => {
								const map = new Map(prev.map((t) => [t.id, t]));
								for (const tag of migrated.tags) {
									if (!map.has(tag.id)) map.set(tag.id, tag);
								}
								return Array.from(map.values());
							});
							await tauriInvoke("save_history", {
								records: JSON.stringify(migrated.records),
							});
						} else {
							setRecords(parsed as AnalysisRecord[]);
						}
					}
				} catch (e) {
					console.error("load_history:", e);
				}
			} catch (e) {
				console.error("domain init:", e);
				if (!cancelled) setDomainError(String(e));
			}
			if (!cancelled) setDomainLoaded(true);
		})();
		return () => {
			cancelled = true;
		};
	}, []);

	// ── Startup update check ──
	useEffect(() => {
		if (!domainLoaded) return;
		let cancelled = false;
		(async () => {
			try {
				const result = await tauriInvoke("plugin:updater|check");
				if (!cancelled && result) {
					updateCheckRef.current = { rid: result.rid };
					setForceUpdateInfo({
						version: result.version,
						body: result.body || "",
					});
				}
			} catch {
				/* update check failed, skip */
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [domainLoaded]);

	const handleForceUpdate = async () => {
		setUpdateInstalling(true);
		try {
			await tauriInvoke("plugin:updater|download_and_install", {
				onEvent: createIpcChannel(),
				rid: updateCheckRef.current?.rid,
			});
		} catch (e) {
			console.error("[Updater] download_and_install failed:", e);
			setUpdateInstalling(false);
		}
	};

	const handleDismissUpdate = useCallback(() => {
		setForceUpdateInfo(null);
		setUpdateInstalling(false);
	}, []);

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
		await tauriInvoke("save_collections", {
			collections: JSON.stringify(newCollections),
		});
	}, []);

	const handleCreateCollection = useCallback(
		(name: { zh: string; en: string }, onCreated?: (id: string) => void) => {
			const now = Date.now();
			const colors = [
				"#6366F1",
				"#F59E0B",
				"#EC4899",
				"#14B8A6",
				"#3B82F6",
				"#EF4444",
				"#8B5CF6",
				"#06B6D4",
			];
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
		},
		[collections, saveCollections],
	);

	const handleDeleteCollection = useCallback(
		(id: string) => {
			const newCollections = collections.filter((c) => c.id !== id);
			const newRecords = records.map((r) => ({
				...r,
				collectionIds: r.collectionIds.filter((cid) => cid !== id),
			}));
			saveCollections(newCollections);
			saveRecords(newRecords);
		},
		[collections, records, saveCollections, saveRecords],
	);

	const handleUpdateCollection = useCallback(
		(updated: Collection) => {
			const newCollections = collections.map((c) =>
				c.id === updated.id ? updated : c,
			);
			saveCollections(newCollections);
		},
		[collections, saveCollections],
	);

	const handleSidebarNav = useCallback((view: string) => {
		switch (view) {
			case "home":
				setHomeView("analyze");
				setCollectionFilter(null);
				break;
			case "history":
				setHomeView("browse");
				setCollectionFilter(null);
				break;
			case "collections":
				setHomeView("collections");
				setCollectionFilter(null);
				break;
			default:
				// Collection detail: view is the collection ID
				setHomeView("collection");
				setCollectionFilter(view);
				break;
		}
	}, []);

	const t = getT(prefs.config.prefLang);

	// Compute theme early (before any early return) so hooks below are always called
	const theme = getTheme(prefs.config.prefMode, prefs.config.accentColor);

	if (!prefs.loaded || !domainLoaded) {
		return (
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
				<div style={{ fontSize: 16, fontWeight: 700 }}>{t.appName}</div>
				{domainError ? (
					<div
						style={{
							fontSize: 12,
							color: "#FF3B30",
							textAlign: "center",
							padding: "0 40px",
							maxWidth: 400,
						}}
					>
						{domainError}
					</div>
				) : (
					<div style={{ fontSize: 12, opacity: 0.5 }}>…</div>
				)}
			</div>
		);
	}

	const colors = theme.colors;

	const fontSizeZoom =
		prefs.config.fontSize === "small"
			? 0.88
			: prefs.config.fontSize === "large"
				? 1.15
				: 1;

	return (
		<ToastProvider accentColor={colors.accent} errorColor={colors.error}>
			<div
				style={
					{
						height: "100vh",
						backgroundColor: colors.bg,
						borderRadius: WINDOW_RADIUS,
						overflow: "hidden",
						transition: "background-color 0.3s",
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
					} as React.CSSProperties
				}
			>
				<div
					style={{
						height: "100%",
						display: "flex",
						flexDirection: "column",
						color: colors.text,
						transition: "color 0.3s",
						zoom: fontSizeZoom,
					}}
				>
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
							activeView={homeView === "collection" ? "collections" : homeView}
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

						<div
							style={{
								flex: 1,
								display: "flex",
								flexDirection: "column",
								overflow: "hidden",
							}}
						>
							<Home
								key="main"
								prefs={prefs}
								theme={theme}
								collectionFilter={collectionFilter}
								records={records}
								collections={collections}
								tags={tags}
								viewMode={homeView}
								searchQuery=""
								onRecordsChange={saveRecords}
								onTagsChange={saveTags}
								onNavigate={(v) => handleSidebarNav(v)}
								onCreateCollection={handleCreateCollection}
								onUpdateCollection={handleUpdateCollection}
								onDeleteCollection={handleDeleteCollection}
							/>
						</div>
					</div>

					{forceUpdateInfo && (
						<ForceUpdateModal
							theme={theme}
							t={t}
							version={forceUpdateInfo.version}
							body={forceUpdateInfo.body}
							installing={updateInstalling}
							onUpdate={handleForceUpdate}
							onDismiss={handleDismissUpdate}
						/>
					)}

					{settingsOpen && (
						<SettingsModal
							prefs={prefs}
							theme={theme}
							onClose={() => setSettingsOpen(false)}
						/>
					)}
					{aboutOpen && (
						<AboutModal
							theme={theme}
							lang={prefs.config.prefLang}
							onClose={() => setAboutOpen(false)}
						/>
					)}
				</div>
			</div>
		</ToastProvider>
	);
};

export default App;
