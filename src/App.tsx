import { useState, useEffect, useCallback, useRef } from 'react';
import { DownloadSimple, RocketLaunch } from '@phosphor-icons/react';
import { usePreferences } from './hooks/usePreferences';
import { getTheme } from './theme';
import { WINDOW_RADIUS } from './styles';
import { ToastProvider } from './components/Toast';
import Sidebar from './components/Sidebar';
import type { PluginNavItem } from './components/Sidebar';
import TitleBar from './components/TitleBar';
import Home from './components/Home';
import SettingsModal from './components/SettingsModal';
import PluginContainer from './components/PluginContainer';
import type { AnalysisRecord, Collection, Tag } from './types';
import { DEFAULT_COLLECTIONS } from './types';
import { tauriInvoke, createIpcChannel } from './utils/tauri';
import { migrateHistory, isLegacyRecord, generateId } from './utils/helpers';
import type { PluginManifest } from './sdk/PluginSDK';
import zh from './locales/zh.json';
import en from './locales/en.json';

type AppRoute =
  | { page: 'home' }
  | { page: 'plugin'; pluginId: string };

const App = () => {
  const prefs = usePreferences();

  const [route, setRoute] = useState<AppRoute>({ page: 'home' });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(prefs.config.sidebarWidth || 180);

  const [searchQuery, setSearchQuery] = useState('');

  const [records, setRecords] = useState<AnalysisRecord[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [domainLoaded, setDomainLoaded] = useState(false);
  const [domainError, setDomainError] = useState('');
  const [pluginNavItems, setPluginNavItems] = useState<PluginNavItem[]>([]);
  const [activePluginManifest, setActivePluginManifest] = useState<PluginManifest | null>(null);
  const [forceUpdateInfo, setForceUpdateInfo] = useState<{ version: string; body: string } | null>(null);
  const [updateInstalling, setUpdateInstalling] = useState(false);
  const updateCheckRef = useRef<{ rid: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Collections
        try {
          const raw = await tauriInvoke('load_collections');
          if (!cancelled) {
            if (raw && raw !== '[]') {
              setCollections(JSON.parse(raw));
            } else {
              const now = Date.now();
              const defaults: Collection[] = DEFAULT_COLLECTIONS.map(dc => ({
                ...dc, createdAt: now, updatedAt: now,
              }));
              setCollections(defaults);
              await tauriInvoke('save_collections', { collections: JSON.stringify(defaults) });
            }
          }
        } catch (e) {
          console.error('load_collections:', e);
          if (!cancelled) {
            const now = Date.now();
            setCollections(DEFAULT_COLLECTIONS.map(dc => ({
              ...dc, createdAt: now, updatedAt: now,
            })));
          }
        }

        // Tags
        try {
          const raw = await tauriInvoke('load_tags');
          if (!cancelled && raw && raw !== '[]') {
            setTags(JSON.parse(raw));
          }
        } catch (e) {
          console.error('load_tags:', e);
        }

        // Records
        try {
          const raw = await tauriInvoke('load_history');
          if (!cancelled && raw && raw !== '[]') {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0 && isLegacyRecord(parsed[0])) {
              const migrated = migrateHistory(raw);
              setRecords(migrated.records);
              setTags(prev => {
                const map = new Map(prev.map(t => [t.id, t]));
                for (const tag of migrated.tags) {
                  if (!map.has(tag.id)) map.set(tag.id, tag);
                }
                return Array.from(map.values());
              });
              await tauriInvoke('save_history', { records: JSON.stringify(migrated.records) });
            } else {
              setRecords(parsed as AnalysisRecord[]);
            }
          }
        } catch (e) {
          console.error('load_history:', e);
        }
      } catch (e) {
        console.error('domain init:', e);
        if (!cancelled) setDomainError(String(e));
      }
      if (!cancelled) setDomainLoaded(true);
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Background registry cache warm ──
  useEffect(() => {
    if (!domainLoaded) return;
    const timer = setTimeout(() => {
      tauriInvoke('fetch_registry').catch(() => {});
    }, 2000);
    return () => clearTimeout(timer);
  }, [domainLoaded]);

  // ── Load plugins ──
  useEffect(() => {
    if (!domainLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        const plugins = await tauriInvoke('list_plugins') as Array<{
          manifest: PluginManifest;
          installed: boolean;
          enabled: boolean;
          path: string;
        }>;
        if (!cancelled) {
          const navItems: PluginNavItem[] = plugins
            .filter(p => p.installed && p.enabled)
            .map(p => ({
              id: p.manifest.id,
              name: p.manifest.name,
              icon: p.manifest.icon,
              order: p.manifest.order || 0,
            }));
          setPluginNavItems(navItems);

          // If current route is a plugin, find its manifest
          if (route.page === 'plugin') {
            const match = plugins.find(p => p.manifest.id === route.pluginId);
            if (match) {
              setActivePluginManifest(match.manifest);
            }
          }
        }
      } catch (e) {
        console.error('list_plugins failed:', e);
      }
    })();
    return () => { cancelled = true; };
  }, [domainLoaded, route]);

  // ── Listen for plugin changes (enable/disable/install/uninstall) ──
  useEffect(() => {
    const handlePluginsChanged = () => {
      (async () => {
        try {
          const plugins = await tauriInvoke('list_plugins') as Array<{
            manifest: PluginManifest;
            installed: boolean;
            enabled: boolean;
            path: string;
          }>;
          const navItems: PluginNavItem[] = plugins
            .filter(p => p.installed && p.enabled)
            .map(p => ({
              id: p.manifest.id,
              name: p.manifest.name,
              icon: p.manifest.icon,
              order: p.manifest.order || 0,
            }));
          setPluginNavItems(navItems);
          // If current route is a plugin that got disabled, go home
          if (route.page === 'plugin') {
            const stillEnabled = plugins.find(p => p.manifest.id === route.pluginId && p.installed && p.enabled);
            if (!stillEnabled) setRoute({ page: 'home' });
          }
        } catch (e) {
          console.error('list_plugins failed:', e);
        }
      })();
    };
    window.addEventListener('plugins-changed', handlePluginsChanged);
    return () => window.removeEventListener('plugins-changed', handlePluginsChanged);
  }, [route]);

  // ── Global shortcut registration ──
  useEffect(() => {
    if (!domainLoaded) return;

    (async () => {
      const shortcuts = prefs.config.shortcuts as unknown as Record<string, string>;
      const internals = (window as any).__TAURI_INTERNALS__;

      for (const [action, shortcut] of Object.entries(shortcuts)) {
        if (!shortcut) continue;
        try {
          if (action === 'toggleWindow') {
            const cb = internals.transformCallback(() => {
              tauriInvoke('minimize_window');
            });
            await tauriInvoke('plugin:global-shortcut|register', { shortcut, handler: cb });
          } else {
            const cb = internals.transformCallback(() => {
              window.dispatchEvent(new CustomEvent('global-shortcut', { detail: { action } }));
            });
            await tauriInvoke('plugin:global-shortcut|register', { shortcut, handler: cb });
          }
        } catch (e) {
          console.error('Failed to register shortcut:', shortcut, e);
        }
      }
    })();

    return () => {
      (async () => {
        const shortcuts = prefs.config.shortcuts as unknown as Record<string, string>;
        for (const shortcut of Object.values(shortcuts)) {
          if (shortcut) {
            try { await tauriInvoke('plugin:global-shortcut|unregister', { shortcut }); } catch {}
          }
        }
      })();
    };
  }, [domainLoaded, prefs.config.shortcuts]);

  // ── Startup update check ──
  useEffect(() => {
    if (!domainLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await tauriInvoke('plugin:updater|check');
        if (!cancelled && result) {
          updateCheckRef.current = { rid: result.rid };
          setForceUpdateInfo({ version: result.version, body: result.body || '' });
        }
      } catch { /* update check failed, skip */ }
    })();
    return () => { cancelled = true; };
  }, [domainLoaded]);

  const handleForceUpdate = async () => {
    setUpdateInstalling(true);
    try {
      await tauriInvoke('plugin:updater|download_and_install', { onEvent: createIpcChannel(), rid: updateCheckRef.current?.rid });
    } catch (e) {
      console.error('[Updater] download_and_install failed:', e);
      setUpdateInstalling(false);
    }
  };

  const saveRecords = useCallback(async (newRecords: AnalysisRecord[]) => {
    setRecords(newRecords);
    await tauriInvoke('save_history', { records: JSON.stringify(newRecords) });
  }, []);

  const saveTags = useCallback(async (newTags: Tag[]) => {
    setTags(newTags);
    await tauriInvoke('save_tags', { tags: JSON.stringify(newTags) });
  }, []);

  const saveCollections = useCallback(async (newCollections: Collection[]) => {
    setCollections(newCollections);
    await tauriInvoke('save_collections', { collections: JSON.stringify(newCollections) });
  }, []);

  const handleCreateCollection = useCallback((name: { zh: string; en: string }, onCreated?: (id: string) => void) => {
    const now = Date.now();
    const colors = ['#6366F1', '#F59E0B', '#EC4899', '#14B8A6', '#3B82F6', '#EF4444', '#8B5CF6', '#06B6D4'];
    const newCollection: Collection = {
      id: `col_${generateId()}`,
      name,
      icon: 'Folder',
      color: colors[Math.floor(Math.random() * colors.length)],
      createdAt: now,
      updatedAt: now,
    };
    saveCollections([...collections, newCollection]);
    onCreated?.(newCollection.id);
  }, [collections, saveCollections]);

  const handleDeleteCollection = useCallback((id: string) => {
    const newCollections = collections.filter(c => c.id !== id);
    const newRecords = records.map(r => ({
      ...r,
      collectionIds: r.collectionIds.filter(cid => cid !== id),
    }));
    saveCollections(newCollections);
    saveRecords(newRecords);
  }, [collections, records, saveCollections, saveRecords]);

  const handleUpdateCollection = useCallback((updated: Collection) => {
    const newCollections = collections.map(c => c.id === updated.id ? updated : c);
    saveCollections(newCollections);
  }, [collections, saveCollections]);

  const handleSidebarNav = useCallback((view: string) => {
    if (view.startsWith('plugin:')) {
      const pluginId = view.slice(7);
      setRoute({ page: 'plugin', pluginId });
    } else if (view === 'home') {
      setRoute({ page: 'home' });
    }
  }, []);

  if (!prefs.loaded || !domainLoaded) {
    return (
      <div style={{
        height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#0F0F0F', color: '#fff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        borderRadius: WINDOW_RADIUS, overflow: 'hidden',
        gap: 12,
      }}>
        <div style={{ fontSize: 16, fontWeight: 700 }}>AI Vision</div>
        {domainError ? (
          <div style={{ fontSize: 12, color: '#FF3B30', textAlign: 'center', padding: '0 40px', maxWidth: 400 }}>
            {domainError}
          </div>
        ) : (
          <div style={{ fontSize: 12, opacity: 0.5 }}>…</div>
        )}
      </div>
    );
  }

  const theme = getTheme(prefs.config.prefMode, prefs.config.accentColor);
  const colors = theme.colors;
  const t = prefs.config.prefLang === 'zh' ? zh : en;

  const fontSizeZoom = prefs.config.fontSize === 'small' ? 0.88 : prefs.config.fontSize === 'large' ? 1.15 : 1;

  return (
    <ToastProvider accentColor={colors.accent} errorColor={colors.error}>
      <div style={{
        height: '100vh',
        backgroundColor: colors.bg,
        borderRadius: WINDOW_RADIUS,
        overflow: 'hidden',
        transition: 'background-color 0.3s',
        '--bg': colors.bg,
        '--text': colors.text,
        '--text-header': colors.textHeader,
        '--border': colors.border,
        '--gray-bg': colors.grayBg,
        '--overlay': colors.overlay,
        '--accent': colors.accent,
        '--accent-bg': colors.accentBg,
        '--error': colors.error,
        '--error-bg': colors.errorBg,
        '--success': colors.success,
        '--warning': colors.warning,
      } as React.CSSProperties}>
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        color: colors.text,
        fontFamily: theme.fonts.sans,
        transition: 'color 0.3s',
        zoom: fontSizeZoom,
      }}>
      <TitleBar
        theme={theme}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed(prev => !prev)}
        lang={prefs.config.prefLang}
      />

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Sidebar
          width={sidebarCollapsed ? 56 : sidebarWidth}
          collapsed={sidebarCollapsed}
          activeView={route.page === 'plugin' ? `plugin:${route.pluginId}` : 'home'}
          plugins={pluginNavItems}
          sidebarOrder={prefs.config.sidebarOrder || []}
          onNavigate={handleSidebarNav}
          onOpenSettings={() => setSettingsOpen(true)}
          onResize={(w) => { setSidebarWidth(w); prefs.saveConfig({ ...prefs.config, sidebarWidth: w }); }}
          onReorder={(newOrder) => prefs.saveConfig({ ...prefs.config, sidebarOrder: newOrder })}
          theme={theme}
          lang={prefs.config.prefLang}
        />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Plugin route */}
          {route.page === 'plugin' && activePluginManifest && (
            <PluginContainer
              pluginId={route.pluginId}
              manifest={activePluginManifest}
              hostConfig={{ lang: prefs.config.prefLang, theme, config: prefs.config }}
            />
          )}
          {/* Home (dashboard) */}
          <div style={{ display: route.page === 'home' ? 'flex' : 'none', flex: 1, flexDirection: 'column', overflow: 'hidden' }}>
            <Home
              key="main"
              prefs={prefs}
              theme={theme}
              collectionFilter={null}
              records={records}
              collections={collections}
              tags={tags}
              searchQuery={searchQuery}
              viewMode="analyze"
              onRecordsChange={saveRecords}
              onTagsChange={saveTags}
              onSearch={setSearchQuery}
              onNavigate={(v) => handleSidebarNav(v)}
              onCreateCollection={handleCreateCollection}
              onUpdateCollection={handleUpdateCollection}
              onDeleteCollection={handleDeleteCollection}
            />
          </div>
        </div>
      </div>

      {forceUpdateInfo && (
        <div className="settings-overlay" style={{ zIndex: 200 }}>
          <div style={{
            backgroundColor: colors.bg,
            borderRadius: 16,
            padding: 32,
            maxWidth: 400,
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
            border: `1px solid ${colors.border}`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
          }}>
            <img src="/icon.png" alt="" style={{ width: 48, height: 48 }} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: colors.textHeader, marginBottom: 4 }}>
                {t.newVersionTitle}
              </div>
              <div style={{ fontSize: 13, color: colors.accent, fontWeight: 600 }}>
                {t.updateRequired}
              </div>
            </div>
            <div style={{
              width: '100%', padding: '12px 16px', borderRadius: 10,
              backgroundColor: colors.accentBg, border: `1px solid ${colors.accent}20`,
              textAlign: 'left',
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: colors.accent, marginBottom: 4 }}>
                v{forceUpdateInfo.version}
              </div>
              {forceUpdateInfo.body && (
                <div style={{
                  fontSize: 11, color: colors.text, whiteSpace: 'pre-wrap',
                  maxHeight: 120, overflow: 'auto', lineHeight: 1.5,
                }}>
                  {forceUpdateInfo.body}
                </div>
              )}
            </div>
            <button
              onClick={handleForceUpdate}
              disabled={updateInstalling}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                width: '100%', padding: '12px 0', borderRadius: 10, border: 'none',
                cursor: updateInstalling ? 'not-allowed' : 'pointer',
                fontSize: 14, fontWeight: 700,
                backgroundColor: colors.accent, color: '#000',
                opacity: updateInstalling ? 0.6 : 1,
                transition: 'all 0.15s',
              }}>
              {updateInstalling ? (
                <>
                  <RocketLaunch size={18} weight="bold" style={{ animation: 'pulse 1.5s infinite' }} />
                  {t.installing}
                </>
              ) : (
                <>
                  <DownloadSimple size={18} weight="bold" />
                  {t.updateNow}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {settingsOpen && (
        <SettingsModal
          prefs={prefs}
          theme={theme}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      </div>
      </div>
    </ToastProvider>
  );
};

export default App;
