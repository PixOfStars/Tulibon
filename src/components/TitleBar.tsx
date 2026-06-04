import { List, Minus, Square, X } from '@phosphor-icons/react';
import type { AppTheme } from '../theme';
import { TITLE_BAR_HEIGHT, SIDEBAR_TOGGLE_SIZE } from '../styles';
import zh from '../locales/zh.json';
import en from '../locales/en.json';

// Direct IPC via __TAURI_INTERNALS__ — dynamic import() of @tauri-apps/api/*
// fails in production because Vite externals leave bare specifiers unresolved.
function tauriInvoke(cmd: string): Promise<unknown> {
  return (window as any).__TAURI_INTERNALS__.invoke(cmd);
}

interface TitleBarProps {
  theme: AppTheme;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  lang: 'zh' | 'en';
}

const TitleBar = ({ theme, sidebarCollapsed, onToggleSidebar, lang }: TitleBarProps) => {
  const t = lang === 'zh' ? zh : en;
  const colors = theme.colors;

  const handleMinimize = () => tauriInvoke('minimize_window');
  const handleToggleMaximize = () => tauriInvoke('toggle_maximize');
  const handleClose = () => tauriInvoke('hide_window');

  return (
    <div style={{
      height: TITLE_BAR_HEIGHT, display: 'flex', alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 8px 0 4px',
      backgroundColor: colors.titleBarBg,
      userSelect: 'none',
      flexShrink: 0,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 2, height: '100%', flex: 1,
        WebkitAppRegion: 'drag', } as React.CSSProperties}>
        <button
          onClick={onToggleSidebar}
          title={sidebarCollapsed ? t.sidebarExpand : t.sidebarCollapse}
          style={{
            width: SIDEBAR_TOGGLE_SIZE, height: SIDEBAR_TOGGLE_SIZE,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', borderRadius: 8,
            backgroundColor: 'transparent', color: colors.text,
            cursor: 'pointer', flexShrink: 0,
            marginLeft: sidebarCollapsed ? 8 : 3,
            WebkitAppRegion: 'no-drag', } as React.CSSProperties}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = colors.accentBg)}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <List size={22} weight="bold" />
        </button>

        <div style={{
          flex: 1, height: '100%', display: 'flex', alignItems: 'center',
          paddingLeft: 8,
        }}>
          <span style={{
            fontSize: 12, fontWeight: 700, color: colors.accent, letterSpacing: '0.5px',
            pointerEvents: 'none',
          }}>
            {t.appName}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 2, WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button onClick={handleMinimize} onMouseDown={e => e.stopPropagation()} aria-label="Minimize"
          style={{
            width: 36, height: 28, border: 'none', background: 'none', color: colors.text,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 6, transition: 'all 0.15s',
            WebkitAppRegion: 'no-drag',
          } as React.CSSProperties}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = colors.accentBg; e.currentTarget.style.color = colors.text; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = colors.text; }}>
          <Minus size={14} weight="bold" />
        </button>
        <button onClick={handleToggleMaximize} onMouseDown={e => e.stopPropagation()} aria-label="Maximize"
          style={{
            width: 36, height: 28, border: 'none', background: 'none', color: colors.text,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 6, transition: 'all 0.15s',
            WebkitAppRegion: 'no-drag',
          } as React.CSSProperties}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = colors.accentBg; e.currentTarget.style.color = colors.text; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = colors.text; }}>
          <Square size={12} weight="bold" />
        </button>
        <button onClick={handleClose} onMouseDown={e => e.stopPropagation()} aria-label="Close"
          style={{
            width: 36, height: 28, border: 'none', background: 'none', color: colors.text,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 6, transition: 'all 0.15s',
            WebkitAppRegion: 'no-drag',
          } as React.CSSProperties}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#E81123'; e.currentTarget.style.color = '#FFF'; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = colors.text; }}>
          <X size={16} weight="bold" />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
