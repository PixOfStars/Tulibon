import { useState, useRef, useCallback } from 'react';
import { X } from '@phosphor-icons/react';
import type { AppTheme } from '../theme';
import { ABOUT_MODAL_WIDTH } from '../styles';
import { useToast } from './Toast';
import { tauriInvoke, createIpcChannel } from '../utils/tauri';
import AboutTab from './settings/AboutTab';
import zh from '../locales/zh.json';
import en from '../locales/en.json';

interface AboutModalProps {
  theme: AppTheme;
  lang: 'zh' | 'en';
  onClose: () => void;
}

const AboutModal = ({ theme, lang, onClose }: AboutModalProps) => {
  const t = lang === 'zh' ? zh : en;
  const colors = theme.colors;
  const toast = useToast();
  const toastTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [updateState, setUpdateState] = useState<
    'idle' | 'checking' | 'available' | 'uptodate' | 'installing'
  >('idle');
  const [updateInfo, setUpdateInfo] = useState<{
    version: string;
    body: string;
  } | null>(null);
  const updateRef = useRef<any>(null);

  const handleCheckUpdate = useCallback(async () => {
    setUpdateState('checking');
    setUpdateInfo(null);
    const minWait = new Promise((r) => setTimeout(r, 1000));
    try {
      const result = await tauriInvoke('plugin:updater|check');
      await minWait;
      if (result) {
        updateRef.current = result;
        setUpdateInfo({ version: result.version, body: result.body || '' });
        setUpdateState('available');
      } else {
        setUpdateState('uptodate');
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => {
          toast.show(t.updateNotAvailable || '已是最新版本', 'info');
        }, 300);
        setTimeout(() => setUpdateState('idle'), 3000);
      }
    } catch (e) {
      console.error('Update check failed:', e);
      await minWait;
      setUpdateState('idle');
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => {
        toast.show(
          t.updateCheckFailed || '检查更新失败，请检查网络连接',
          'error',
        );
      }, 300);
    }
  }, [t, toast]);

  const handleInstallUpdate = async () => {
    if (!updateRef.current) return;
    setUpdateState('installing');
    try {
      await tauriInvoke('plugin:updater|download_and_install', {
        onEvent: createIpcChannel(),
        rid: updateRef.current.rid,
      });
    } catch (e) {
      console.error('[Updater] download_and_install failed:', e);
      setUpdateState('available');
      toast.show(`${t.updateFailed || 'Update failed'}: ${e}`, 'error');
    }
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: ABOUT_MODAL_WIDTH,
          height: '88vh',
          maxHeight: 620,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: colors.bg,
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: theme.shadow.card,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 700, color: colors.textHeader }}>
            {t.aboutTab || 'About'}
          </span>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              borderRadius: 8,
              backgroundColor: 'transparent',
              color: colors.text,
              cursor: 'pointer',
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = colors.accentBg)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = 'transparent')
            }
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 20, overflow: 'auto' }}>
          <AboutTab
            colors={colors}
            t={t}
            updateState={updateState}
            updateInfo={updateInfo}
            onCheckUpdate={handleCheckUpdate}
            onInstallUpdate={handleInstallUpdate}
          />
        </div>
      </div>
    </div>
  );
};

export default AboutModal;
