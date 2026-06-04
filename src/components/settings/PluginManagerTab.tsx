import { useState, useEffect, useCallback } from 'react';
import { DownloadSimple, Trash, ToggleRight, ToggleLeft, PuzzlePiece, SpinnerGap, Warning, X } from '@phosphor-icons/react';
import { tauriInvoke, tauriListen } from '../../utils/tauri';
import type { TabProps } from './TabProps';

interface PluginEntry {
  manifest: {
    id: string;
    name: { zh: string; en: string };
    version: string;
    entry: string;
    icon: string;
    order: number;
    permissions: string[];
    description?: { zh: string; en: string };
    routes?: { main?: string; settings?: string };
  };
  installed: boolean;
  enabled: boolean;
  path: string;
}

interface RegistryEntry {
  id: string;
  name: { zh: string; en: string };
  version: string;
  description?: { zh: string; en: string };
  url: string;
  icon: string;
  order: number;
}

interface InstallProgress {
  downloaded_bytes: number;
  total_bytes: number | null;
  message?: string;
}

const PluginManagerTab = ({ colors, lang, t }: TabProps) => {
  const [plugins, setPlugins] = useState<PluginEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [installingId, setInstallingId] = useState<string | null>(null); // which plugin is being installed
  const [installProgress, setInstallProgress] = useState<InstallProgress | null>(null);
  const [actionPluginId, setActionPluginId] = useState<string | null>(null);

  // Registry state
  const [registry, setRegistry] = useState<RegistryEntry[]>([]);
  const [registryLoading, setRegistryLoading] = useState(true);

  // Confirmation dialog for uninstall
  const [confirmUninstall, setConfirmUninstall] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 5000);
  };

  const loadPlugins = useCallback(async () => {
    try {
      const result = await tauriInvoke('list_plugins') as PluginEntry[];
      setPlugins(result);
    } catch (e) {
      console.error('list_plugins failed:', e);
      showError('Failed to load plugins: ' + String(e));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPlugins();
  }, [loadPlugins]);

  // Load registry: cached first, then network refresh
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // 1. Seed from cache immediately
      try {
        const cached = await tauriInvoke('get_cached_registry') as RegistryEntry[];
        if (!cancelled && Array.isArray(cached) && cached.length > 0) {
          setRegistry(cached);
          setRegistryLoading(false);
        }
      } catch { /* ignore */ }

      // 2. Background refresh from network
      try {
        const fresh = await tauriInvoke('fetch_registry') as RegistryEntry[];
        if (!cancelled && Array.isArray(fresh)) {
          setRegistry(fresh);
        }
      } catch { /* keep cached data on failure */ }

      setRegistryLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // Listen for install progress events
  useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | null = null;

    tauriListen('plugin-install-progress', (payload: unknown) => {
      if (!cancelled) setInstallProgress(payload as InstallProgress);
    }).then((fn) => {
      if (!cancelled) unlisten = fn;
    });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  const notifyPluginsChanged = () => {
    window.dispatchEvent(new CustomEvent('plugins-changed'));
  };

  const handleInstallFromRegistry = async (entry: RegistryEntry) => {
    setInstallingId(entry.id);
    setInstallProgress(null);
    setErrorMsg(null);
    try {
      await tauriInvoke('install_plugin', { url: entry.url });
      await loadPlugins();
      notifyPluginsChanged();
    } catch (e) {
      console.error('install_plugin from registry failed:', e);
      showError('Install failed: ' + String(e));
    }
    setInstallingId(null);
    setInstallProgress(null);
  };

  const handleUninstall = async (id: string) => {
    setActionPluginId(id);
    try {
      await tauriInvoke('uninstall_plugin', { id });
      setConfirmUninstall(null);
      await loadPlugins();
      notifyPluginsChanged();
    } catch (e) {
      console.error('uninstall_plugin failed:', e);
    }
    setActionPluginId(null);
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    setActionPluginId(id);
    try {
      if (enabled) {
        await tauriInvoke('disable_plugin', { id });
      } else {
        await tauriInvoke('enable_plugin', { id });
      }
      await loadPlugins();
      notifyPluginsChanged();
    } catch (e) {
      console.error('toggle plugin failed:', e);
    }
    setActionPluginId(null);
  };

  // ── Computed values ──

  const installedIds = new Set(plugins.map(p => p.manifest.id));
  const registryEntriesNotInstalled = registry.filter(e => !installedIds.has(e.id));
  const enabledPlugins = plugins.filter(p => p.enabled);
  const disabledPlugins = plugins.filter(p => !p.enabled);

  // ── Styles ──

  const btnStyle = (danger?: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 5,
    padding: '6px 12px', borderRadius: 8, border: 'none',
    cursor: 'pointer', fontSize: 11, fontWeight: 600,
    backgroundColor: danger ? colors.errorBg : colors.accentBg,
    color: danger ? colors.error : colors.accent,
    whiteSpace: 'nowrap',
  });

  const cardStyle: React.CSSProperties = {
    padding: 12, borderRadius: 10,
    backgroundColor: colors.grayBg,
    border: `1px solid ${colors.border}`,
    display: 'flex', alignItems: 'center', gap: 10,
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 700, color: colors.textHeader,
    marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
  };

  const formatSize = (bytes: number | null) => {
    if (bytes === null) return '…';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const pluginLabel = (manifest: PluginEntry['manifest']) =>
    lang === 'zh' ? manifest.name.zh : manifest.name.en;

  const registryLabel = (entry: RegistryEntry) =>
    lang === 'zh' ? entry.name.zh : entry.name.en;

  const registryDesc = (entry: RegistryEntry) => {
    if (!entry.description) return '';
    return lang === 'zh' ? entry.description.zh : entry.description.en;
  };

  // ── Render ──

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Error feedback */}
      {errorMsg && (
        <div style={{
          padding: '10px 14px', borderRadius: 8,
          backgroundColor: colors.errorBg, border: '1px solid ' + colors.error + '40',
          color: colors.error, fontSize: 12, fontWeight: 500,
        }}>
          {errorMsg}
        </div>
      )}

      {/* ── Plugin Registry ── */}
      <div>
        <div style={sectionTitleStyle}>
          <DownloadSimple size={14} weight="bold" color={colors.accent} />
          {t.pluginRegistrySection || 'Plugin Registry'}
        </div>
        {registryLoading ? (
          <div style={{ fontSize: 12, color: colors.text, opacity: 0.5, textAlign: 'center', padding: 16 }}>
            <SpinnerGap size={18} weight="bold" style={{ animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : registryEntriesNotInstalled.length === 0 ? (
          <div style={{ fontSize: 12, color: colors.text, opacity: 0.5, textAlign: 'center', padding: 12 }}>
            {t.pluginRegistryAllInstalled || 'All available plugins are installed'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {registryEntriesNotInstalled.map(entry => (
              <div key={entry.id} style={cardStyle}>
                <PuzzlePiece size={18} weight="bold" color={colors.accent} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: colors.textHeader }}>
                    {registryLabel(entry)}
                  </div>
                  {entry.description && (
                    <div style={{ fontSize: 10, color: colors.text, opacity: 0.5, marginTop: 1, lineHeight: 1.3 }}>
                      {registryDesc(entry)}
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: colors.text, opacity: 0.4, marginTop: 2 }}>
                    v{entry.version}
                  </div>
                </div>
                <button
                  onClick={() => handleInstallFromRegistry(entry)}
                  disabled={installingId === entry.id}
                  style={{ ...btnStyle(), flexShrink: 0, opacity: installingId === entry.id ? 0.6 : 1 }}>
                  {installingId === entry.id ? (
                    <><SpinnerGap size={12} weight="bold" style={{ animation: 'spin 0.8s linear infinite' }} /> {t.pluginInstalling || 'Installing…'}</>
                  ) : (
                    <><DownloadSimple size={12} weight="bold" /> {t.pluginInstall || 'Install'}</>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Install progress */}
      {installProgress && (
        <div style={{ fontSize: 11, color: colors.accent }}>
          {t.pluginInstalling || 'Installing…'}: {installProgress.message || ''}
          {installProgress.total_bytes && (
            ` (${formatSize(installProgress.downloaded_bytes)} / ${formatSize(installProgress.total_bytes)})`
          )}
        </div>
      )}

      {/* ── Installed Plugins ── */}
      {loading && (
        <div style={{ fontSize: 12, color: colors.text, opacity: 0.5, textAlign: 'center', padding: 20 }}>
          <SpinnerGap size={18} weight="bold" style={{ animation: 'spin 0.8s linear infinite' }} />
        </div>
      )}

      {!loading && plugins.length === 0 && (
        <div style={{ fontSize: 12, color: colors.text, opacity: 0.5, textAlign: 'center', padding: 20 }}>
          {t.pluginNoPlugins || 'No plugins installed'}
        </div>
      )}

      {/* ── 已启用 (Enabled) ── */}
      {!loading && enabledPlugins.length > 0 && (
        <div>
          <div style={sectionTitleStyle}>
            <ToggleRight size={14} weight="fill" color={colors.success} />
            {t.pluginInstalledEnabled || 'Enabled'}
            <span style={{ fontWeight: 400, opacity: 0.5, fontSize: 11 }}>
              ({enabledPlugins.length})
            </span>
          </div>
          {enabledPlugins.map((plugin) => (
            <div key={plugin.manifest.id} style={{ ...cardStyle, marginBottom: 6 }}>
              <PuzzlePiece size={18} weight="bold" color={colors.accent} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: colors.textHeader }}>
                  {pluginLabel(plugin.manifest)}
                </div>
                <div style={{ fontSize: 10, color: colors.text, opacity: 0.5 }}>
                  v{plugin.manifest.version}
                </div>
              </div>

              {/* Status badge */}
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                backgroundColor: colors.success + '20', color: colors.success,
                flexShrink: 0,
              }}>
                {t.pluginEnabled || 'Enabled'}
              </span>

              {/* Toggle → disable */}
              <button
                onClick={() => handleToggle(plugin.manifest.id, true)}
                disabled={actionPluginId === plugin.manifest.id}
                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, flexShrink: 0 }}
                title={t.pluginDisable || 'Disable'}>
                <ToggleRight size={28} weight="fill" color={colors.accent} />
              </button>

              {/* Uninstall (with confirmation) */}
              {confirmUninstall === plugin.manifest.id ? (
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button onClick={() => handleUninstall(plugin.manifest.id)} style={btnStyle(true)}>
                    <Warning size={12} weight="bold" />
                    {t.pluginConfirmUninstall || 'Confirm?'}
                  </button>
                  <button onClick={() => setConfirmUninstall(null)}
                    style={{ ...btnStyle(), backgroundColor: 'transparent', border: `1px solid ${colors.border}` }}>
                    <X size={12} weight="bold" />
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirmUninstall(plugin.manifest.id)} style={btnStyle(true)}>
                  <Trash size={12} weight="bold" />
                  {t.pluginUninstallFull || 'Remove'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── 已禁用 (Disabled) ── */}
      {!loading && disabledPlugins.length > 0 && (
        <div>
          <div style={{ ...sectionTitleStyle, opacity: 0.6 }}>
            <ToggleLeft size={14} weight="fill" color={colors.text} />
            {t.pluginInstalledDisabled || 'Disabled'}
            <span style={{ fontWeight: 400, opacity: 0.5, fontSize: 11 }}>
              ({disabledPlugins.length})
            </span>
          </div>
          {disabledPlugins.map((plugin) => (
            <div key={plugin.manifest.id} style={{ ...cardStyle, marginBottom: 6, opacity: 0.65 }}>
              <PuzzlePiece size={18} weight="bold" color={colors.text} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: colors.text }}>
                  {pluginLabel(plugin.manifest)}
                </div>
                <div style={{ fontSize: 10, color: colors.text, opacity: 0.4 }}>
                  v{plugin.manifest.version}
                </div>
              </div>

              {/* Status badge */}
              <span style={{
                fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                backgroundColor: colors.errorBg, color: colors.error,
                flexShrink: 0,
              }}>
                {t.pluginDisabled || 'Disabled'}
              </span>

              {/* Toggle → enable */}
              <button
                onClick={() => handleToggle(plugin.manifest.id, false)}
                disabled={actionPluginId === plugin.manifest.id}
                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, flexShrink: 0 }}
                title={t.pluginEnable || 'Enable'}>
                <ToggleLeft size={28} weight="fill" color={colors.text} style={{ opacity: 0.4 }} />
              </button>

              {/* Uninstall (with confirmation) */}
              {confirmUninstall === plugin.manifest.id ? (
                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                  <button onClick={() => handleUninstall(plugin.manifest.id)} style={btnStyle(true)}>
                    <Warning size={12} weight="bold" />
                    {t.pluginConfirmUninstall || 'Confirm?'}
                  </button>
                  <button onClick={() => setConfirmUninstall(null)}
                    style={{ ...btnStyle(), backgroundColor: 'transparent', border: `1px solid ${colors.border}` }}>
                    <X size={12} weight="bold" />
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirmUninstall(plugin.manifest.id)} style={btnStyle(true)}>
                  <Trash size={12} weight="bold" />
                  {t.pluginUninstallFull || 'Remove'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PluginManagerTab;
