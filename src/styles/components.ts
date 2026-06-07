/**
 * styles/components.ts
 *
 * 依赖主题色的组件级样式模式：卡片、按钮、文字、输入框、标签等。
 * 需要传入 colors 参数。
 */

import type { AppTheme } from './theme';

// ==========================================
//  卡片（Card）
// ==========================================

/** 基础卡片容器 */
export const card = (colors: AppTheme['colors'], overrides?: React.CSSProperties): React.CSSProperties => ({
  backgroundColor: colors.bg,
  border: `1px solid ${colors.border}`,
  borderRadius: 16,
  padding: 20,
  display: 'flex',
  flexDirection: 'column',
  ...overrides,
});

/** 浅灰底色卡片 */
export const cardGray = (colors: AppTheme['colors'], overrides?: React.CSSProperties): React.CSSProperties => ({
  backgroundColor: colors.grayBg,
  border: `1px solid ${colors.border}`,
  borderRadius: 16,
  padding: 20,
  display: 'flex',
  flexDirection: 'column',
  ...overrides,
});

/** 主题色浅底卡片 */
export const cardAccent = (colors: AppTheme['colors'], overrides?: React.CSSProperties): React.CSSProperties => ({
  backgroundColor: `${colors.accent}10`,
  border: `1px solid ${colors.accent}30`,
  borderRadius: 16,
  padding: 20,
  display: 'flex',
  flexDirection: 'column',
  ...overrides,
});

// ==========================================
//  边框与分隔
// ==========================================

/** 标准边框 */
export const border = (colors: AppTheme['colors']): React.CSSProperties => ({
  border: `1px solid ${colors.border}`,
});

/** 主题色虚线分隔线 */
export const dividerAccent = (colors: AppTheme['colors']): React.CSSProperties => ({
  border: 'none',
  borderTop: `3px dashed ${colors.accent}40`,
  margin: '20px 0',
});

// ==========================================
//  文字（Typography）
// ==========================================

/** 区块标题（14px 粗体） */
export const sectionTitle = (colors: AppTheme['colors']): React.CSSProperties => ({
  fontSize: 14,
  fontWeight: 700,
  color: colors.textHeader,
});

/** 大标题（18px 粗体） */
export const heading = (colors: AppTheme['colors']): React.CSSProperties => ({
  fontSize: 18,
  fontWeight: 700,
  color: colors.textHeader,
});

/** 正文（13px，行高 1.6） */
export const bodyText = (colors: AppTheme['colors']): React.CSSProperties => ({
  fontSize: 13,
  color: colors.text,
  lineHeight: 1.6,
});

/** 辅助文字（12px，半透明） */
export const captionText = (colors: AppTheme['colors'], opacity = 0.5): React.CSSProperties => ({
  fontSize: 12,
  color: colors.text,
  opacity,
});

// ==========================================
//  按钮（Button）
// ==========================================

/** 透明按钮（无背景无边框） */
export const ghostBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'inherit',
  cursor: 'pointer',
  padding: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

/** 图标按钮（方形带边框） */
export const iconBtn = (colors: AppTheme['colors'], overrides?: React.CSSProperties): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 40,
  height: 40,
  borderRadius: 8,
  border: `1px solid ${colors.border}`,
  backgroundColor: colors.bg,
  color: colors.text,
  cursor: 'pointer',
  transition: 'transform 120ms cubic-bezier(0.22, 1.2, 0.36, 1), box-shadow 120ms ease, background-color 120ms ease, border-color 120ms ease',
  ...overrides,
});

/** 主要按钮（主题色填充） */
export const primaryBtn = (colors: AppTheme['colors'], overrides?: React.CSSProperties): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  width: '100%',
  padding: '12px',
  borderRadius: 10,
  border: 'none',
  backgroundColor: colors.accent,
  color: '#000',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'all 150ms ease',
  ...overrides,
});

// ==========================================
//  输入框（Input）
// ==========================================

/** 标准输入框 */
export const input = (colors: AppTheme['colors']): React.CSSProperties => ({
  width: '100%',
  padding: '10px 14px',
  borderRadius: 8,
  border: `1px solid ${colors.border}`,
  backgroundColor: colors.bg,
  color: colors.textHeader,
  fontSize: 13,
  outline: 'none',
  transition: 'border-color 150ms ease',
});

// ==========================================
//  标签/徽章（Tag / Badge）
// ==========================================

/** 标签 pill */
export const tag = (bg: string, color: string): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '4px 10px',
  borderRadius: 8,
  fontSize: 11,
  fontWeight: 600,
  backgroundColor: bg,
  color,
});

// ==========================================
//  阴影（Shadow）
// ==========================================

/** 卡片阴影（根据主题自动适配） */
export const cardShadow = (colors: AppTheme['colors']): React.CSSProperties => ({
  boxShadow: colors.bg === '#F7F7F9'
    ? '0 8px 30px rgba(0, 0, 0, 0.06)'
    : '0 8px 30px rgba(0, 0, 0, 0.4)',
});
