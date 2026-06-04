import { useEffect, useRef, useState, useCallback } from 'react';
import { SpinnerGap } from '@phosphor-icons/react';
import type { AppTheme } from '../theme';
import type { AppConfig } from '../types';
import type { PluginManifest } from '../sdk/PluginSDK';
import { injectPluginSDK, clearPluginSDK } from '../sdk/PluginSDK';
import zh from '../locales/zh.json';
import en from '../locales/en.json';

interface PluginContainerProps {
  pluginId: string;
  manifest: PluginManifest;
  hostConfig: { lang: 'zh' | 'en'; theme: AppTheme; config: AppConfig };
  onError?: (error: string) => void;
}

const PluginContainer = ({ pluginId, manifest, hostConfig, onError }: PluginContainerProps) => {
  const t = hostConfig.lang === 'zh' ? zh : en;
  const colors = hostConfig.theme.colors;
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  const handleError = useCallback((msg: string) => {
    setState('error');
    setErrorMsg(msg);
    onError?.(msg);
  }, [onError]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        // Inject SDK so the plugin script can access window.__PLUGIN_SDK__
        injectPluginSDK(pluginId, manifest, hostConfig);

        // Load plugin entry script via plugin:// protocol
        const scriptUrl = `plugin://${pluginId}/${manifest.entry}`;

        // Try fetch first for better error diagnostics
        try {
          const res = await fetch(scriptUrl);
          if (!res.ok) {
            throw new Error(`HTTP ${res.status} ${res.statusText} for ${scriptUrl}`);
          }
        } catch (fetchErr: any) {
          // fetch may fail on custom protocols; fall through to script load
          if (fetchErr.message && fetchErr.message.includes('HTTP')) {
            throw fetchErr; // re-throw if we got a real HTTP error
          }
        }

        const script = document.createElement('script');
        script.src = scriptUrl;
        script.async = true;

        const loadPromise = new Promise<void>((resolve, reject) => {
          script.onload = () => resolve();
          script.onerror = () => reject(new Error(`Script load failed: ${scriptUrl}`));
        });

        document.head.appendChild(script);
        scriptRef.current = script;

        await loadPromise;

        if (cancelled) return;

        // After script loads, mount plugin UI
        const sdk = (window as unknown as Record<string, unknown>).__PLUGIN_SDK__ as {
          ui: { mount: (container: HTMLElement) => void; unmount: () => void };
        } | undefined;

        if (!sdk?.ui || typeof sdk.ui.mount !== 'function') {
          handleError('Plugin did not register ui.mount()');
          return;
        }

        if (containerRef.current) {
          sdk.ui.mount(containerRef.current);
          setState('ready');
        }
      } catch (e) {
        if (!cancelled) {
          handleError(String(e));
        }
      }
    };

    run();

    return () => {
      cancelled = true;
      // Cleanup script tag
      if (scriptRef.current) {
        scriptRef.current.remove();
        scriptRef.current = null;
      }
      // Unmount plugin UI
      const sdk = (window as unknown as Record<string, unknown>).__PLUGIN_SDK__ as {
        ui: { unmount: () => void };
      } | undefined;
      sdk?.ui?.unmount?.();
      clearPluginSDK();
    };
  }, [pluginId, manifest.entry]);

  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  if (state === 'error') {
    return (
      <div style={{
        ...containerStyle,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 24,
      }}>
        <div style={{ fontSize: 13, color: colors.error, textAlign: 'center' }}>
          {t.pluginLoadFailed || 'Plugin load failed'}: {errorMsg}
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* Plugin content container — plugin renders into this div */}
      <div ref={containerRef} style={{ flex: 1, overflow: 'hidden' }} />

      {/* Loading overlay */}
      {state === 'loading' && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 10,
          backgroundColor: colors.bg,
          zIndex: 10,
        }}>
          <SpinnerGap size={24} weight="bold" color={colors.accent}
            style={{ animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontSize: 12, color: colors.text, opacity: 0.6 }}>
            {t.pluginLoading || 'Loading plugin…'}
          </span>
        </div>
      )}
    </div>
  );
};

export default PluginContainer;
