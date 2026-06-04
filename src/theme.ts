function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export type ThemeMode = 'light' | 'dark' | 'auto';

function isSystemDark(): boolean {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return false;
}

export function getTheme(mode: ThemeMode, accentColor = '#00C896') {
  const isLight = mode === 'auto' ? !isSystemDark() : mode === 'light';
  return {
    colors: {
      bg: isLight ? '#F9F9FB' : '#1A1A1D',
      sidebarBg: isLight ? '#F0F0F3' : '#141416',
      titleBarBg: isLight ? '#F0F0F3' : '#141416',
      text: isLight ? '#555' : '#999',
      textHeader: isLight ? '#1A1A1A' : '#EEE',
      border: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
      grayBg: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)',
      overlay: isLight ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.6)',
      accent: accentColor,
      accentBg: hexToRgba(accentColor, 0.2),
      error: '#FF3B30',
      errorBg: 'rgba(255,59,48,0.06)',
      success: '#00E676',
      warning: '#F59E0B',
    },
    fonts: {
      sans: `'Sarasa Gothic SC', '更纱黑体', sans-serif`,
      mono: `'Sarasa Mono SC', '等距更纱黑体', monospace`,
    },
    radius: {
      small: '8px',
      medium: '12px',
      large: '18px',
    },
    shadow: {
      card: '0 8px 40px rgba(0,0,0,0.12)',
    },
  };
}

export type AppTheme = ReturnType<typeof getTheme>;
