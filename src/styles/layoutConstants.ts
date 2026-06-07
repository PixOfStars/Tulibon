/**
 * styles/layoutConstants.ts
 *
 * 全局布局常量：尺寸、间距、字号、断点。
 * 所有硬编码的魔法数字都应提取到这里。
 */

// ==========================================
//  窗口（Window）
// ==========================================
export const WINDOW_RADIUS = 12;
export const TITLE_BAR_HEIGHT = 40;

// ==========================================
//  侧边栏（Sidebar）
// ==========================================
export const SIDEBAR_EXPANDED = 180;
export const SIDEBAR_COLLAPSED = 56;
export const SIDEBAR_ITEM_SIZE = 44;
export const SIDEBAR_ICON_SIZE = 22;
export const SIDEBAR_TOGGLE_SIZE = 32;

// ==========================================
//  模态框（Modal）
// ==========================================
export const SETTINGS_MODAL_WIDTH = 580;
export const ABOUT_MODAL_WIDTH = 420;

// ==========================================
//  提示（Toast）
// ==========================================
export const TOAST_DURATION = 3000;
export const TOAST_UNDO_DURATION = 5000;

// ==========================================
//  窗口最小尺寸
// ==========================================
export const MIN_WINDOW_WIDTH = 920;
export const MIN_WINDOW_HEIGHT = 680;

// ==========================================
//  间距（Spacing）— 8px 基准网格
// ==========================================
export const SPACE = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

// ==========================================
//  字号（Font Size）
// ==========================================
export const FONT_SIZE = {
  caption: 11,   // 标签、辅助信息
  small: 12,     // 次要文字
  body: 13,      // 正文
  normal: 14,    // 默认/区块标题
  sub: 16,       // 小标题
  title: 18,     // 标题
  large: 24,     // 大标题
} as const;

// ==========================================
//  圆角（Border Radius）
// ==========================================
export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 9999,    // 胶囊形
} as const;

// ==========================================
//  图标尺寸（Icon Size）
// ==========================================
export const ICON_SIZE = {
  sm: 14,
  md: 18,
  lg: 22,
  xl: 28,
} as const;
