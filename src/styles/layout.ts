/**
 * styles/layout.ts
 *
 * 布局相关的样式模式：flex 容器、边框、圆角、间距、阴影、过渡。
 * 不依赖主题色，或通过参数传入。
 */

// ==========================================
//  Flex 布局
// ==========================================

/** 水平垂直居中 */
export const flexCenter: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

/** 水平居中 flex 行 */
export const flexRow = (gap = 8): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap,
});

/** 垂直 flex 列 */
export const flexCol = (gap = 8): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column' as const,
  gap,
});

/** 水平两端对齐 */
export const flexBetween: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

/** 水平行内 flex */
export const inlineFlex: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
};

// ==========================================
//  边框与圆角
// ==========================================

/** 标准圆角 */
export const radius = {
  sm: { borderRadius: 8 } as React.CSSProperties,
  md: { borderRadius: 12 } as React.CSSProperties,
  lg: { borderRadius: 16 } as React.CSSProperties,
};

// ==========================================
//  过渡
// ==========================================

/** 标准过渡 */
export const transition = (props = 'all', duration = 150): React.CSSProperties => ({
  transition: `${props} ${duration}ms ease`,
});

/** 弹性过渡（用于按钮等交互元素） */
export const springTransition: React.CSSProperties = {
  transition: 'transform 120ms cubic-bezier(0.22, 1.2, 0.36, 1), box-shadow 120ms ease, background-color 120ms ease, border-color 120ms ease',
};

// ==========================================
//  阴影
// ==========================================

/** 浮起阴影（hover 用） */
export const hoverShadow: React.CSSProperties = {
  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
};

// ==========================================
//  滚动容器
// ==========================================

/** 标准滚动容器 */
export const scrollContainer: React.CSSProperties = {
  flex: 1,
  overflow: 'auto',
  position: 'relative',
};
