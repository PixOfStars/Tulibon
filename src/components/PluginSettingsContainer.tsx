import { useEffect, useRef, useState } from 'react';
import { SpinnerGap } from '@phosphor-icons/react';
import type { AppTheme } from '../theme';
import type { AppConfig } from '../types';
import type { PluginManifest } from '../sdk/PluginSDK';
import { injectPluginSDK, clearPluginSDK } from '../sdk/PluginSDK';
import { tauriInvoke } from '../utils/tauri';
import zh from '../locales/zh.json';
import en from '../locales/en.json';

interface PluginSettingsContainerProps {
  pluginId: string;
  manifest: PluginManifest;
  hostConfig: { lang: 'zh' | 'en'; theme: AppTheme; config: AppConfig };
}

const PluginSettingsContainer = ({ pluginId, manifest, hostConfig }: PluginSettingsContainerProps) => {
  const t = hostConfig.lang === 'zh' ? zh : en;
  const colors = hostConfig.theme.colors;
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const scriptUrlRef = useRef<string | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        // Inject SDK so the settings script can access window.__PLUGIN_SDK__
        injectPluginSDK(pluginId, manifest, hostConfig);

        const settingsEntry = manifest.routes?.settings || 'settings.js';

        // Load settings script via Tauri IPC (bypasses plugin:// protocol caching issues)
        const fileContent = await tauriInvoke('read_plugin_file', {
          pluginId,
          filePath: settingsEntry,
        });

        const blob = new Blob([fileContent], { type: 'application/javascript' });
        const scriptUrl = URL.createObjectURL(blob);
        scriptUrlRef.current = scriptUrl;

        const script = document.createElement('script');
        script.src = scriptUrl;
        script.async = true;

        const loadPromise = new Promise<void>((resolve, reject) => {
          script.onload = () => resolve();
          script.onerror = () => reject(new Error(`Settings script load failed: ${scriptUrl}`));
        });

        document.head.appendChild(script);
        scriptRef.current = script;

        await loadPromise;

        if (cancelled) return;

        const sdk = (window as unknown as Record<string, unknown>).__PLUGIN_SDK__ as {
          ui: { mount: (container: HTMLElement) => void; unmount: () => void };
        } | undefined;

        if (!sdk?.ui || typeof sdk.ui.mount !== 'function') {
          setState('error');
          setErrorMsg('Plugin settings did not register ui.mount()');
          return;
        }

        if (containerRef.current) {
          sdk.ui.mount(containerRef.current);
          setState('ready');
        }
      } catch (e) {
        if (!cancelled) {
          setState('error');
          setErrorMsg(String(e));
        }
      }
    };

    run();

    return () => {
      cancelled = true;
      if (scriptRef.current) {
        scriptRef.current.remove();
        scriptRef.current = null;
      }
      if (scriptUrlRef.current) {
        URL.revokeObjectURL(scriptUrlRef.current);
        scriptUrlRef.current = null;
      }
      const sdk = (window as unknown as Record<string, unknown>).__PLUGIN_SDK__ as {
        ui: { unmount: () => void };
      } | undefined;
      sdk?.ui?.unmount?.();
      clearPluginSDK();
    };
  }, [pluginId, manifest.routes?.settings]);

  if (state === 'error') {
    return (
      <div style={{ padding: 16, color: colors.error, fontSize: 12 }}>
        <strong>{t.pluginLoadFailed || 'Plugin load failed'}</strong>
        {errorMsg && <div style={{ opacity: 0.7, marginTop: 4 }}>{errorMsg}</div>}
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', minHeight: 120 }}>
      <div ref={containerRef} />
      {state === 'loading' && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8,
        }}>
          <SpinnerGap size={20} weight="bold" color={colors.accent}
            style={{ animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontSize: 12, color: colors.text, opacity: 0.5 }}>
            {t.pluginLoading || 'Loading plugin…'}
          </span>
        </div>
      )}
    </div>
  );
};

export default PluginSettingsContainer;
