function hexToRgba(hex: string, alpha: number): string {
  // 1. 移除可能包含的 '#'
  let cleanHex = hex.replace('#', '');

  // 2. 兼容 3 位数的简写颜色 (例如将 #FFF 转换为 FFFFFF)
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }

  // 3. 容错处理：如果输入格式不正确，返回一个安全的透明黑色，避免程序崩溃
  if (cleanHex.length !== 6) return `rgba(0, 0, 0, ${alpha})`;

  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
      // 背景色：微调色阶，让主背景和侧边栏的区分更自然
      bg: isLight ? '#F7F7F9' : '#121214',
      sidebarBg: isLight ? '#EFEFF2' : '#18181B',
      titleBarBg: isLight ? '#EFEFF2' : '#18181B',

      // 文本色：加强了对比度，让文字更清晰易读
      text: isLight ? '#52525B' : '#A1A1AA',
      textHeader: isLight ? '#18181B' : '#FAFAFA',

      // 边框和次级背景：稍微降低透明度，让线框感更柔和
      border: isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.08)',
      grayBg: isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.05)',
      overlay: isLight ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.6)',

      // 主题色
      accent: accentColor,
      accentBg: hexToRgba(accentColor, 0.15), // 调淡了一点，显得更通透
      accentBgVeryLight: hexToRgba(accentColor, 0.03), // 极淡背景，用于一句话总结
      accentHover: hexToRgba(accentColor, 0.25), // 新增：专为按钮悬浮准备的颜色

      // 状态色
      error: '#FF3B30',
      errorBg: 'rgba(255, 59, 48, 0.08)',
      success: '#34C759', // 采用了更柔和护眼的经典绿色
      warning: '#F59E0B',
    },
    fonts: {
      sans: `-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif`,
      mono: `"Cascadia Code", "Fira Code", "JetBrains Mono", "SF Mono", "Menlo", "Consolas", monospace`,
    },
    radius: {
      small: '8px',
      medium: '12px',
      large: '16px', // 16px 是更主流的大圆角比例
    },
    shadow: {
      // 阴影：深浅色模式分别处理，让卡片悬浮感更真实
      card: isLight 
        ? '0 8px 30px rgba(0, 0, 0, 0.06)' 
        : '0 8px 30px rgba(0, 0, 0, 0.4)',
    },
  };
}

export type AppTheme = ReturnType<typeof getTheme>;