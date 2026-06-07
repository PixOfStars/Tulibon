import type React from 'react';

type Colors = Record<string, string>;

// ==========================================
// 1. 全局混入样式 (Mixins)
// ==========================================

export const inputStyle = (colors: Colors): React.CSSProperties => ({
  width: '100%',
  padding: '10px 14px',
  backgroundColor: colors.grayBg,
  border: `1px solid ${colors.border}`,
  borderRadius: 10, // 统一使用 10px 以配合整体 UI 语言
  color: colors.textHeader,
  fontSize: 13,
  boxSizing: 'border-box',
  transition: 'border-color 0.2s ease, box-shadow 0.2s ease', // 为外部的 focus 状态预留平滑过渡
  outline: 'none',
});

export const iconBtnStyle = (colors: Colors): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: `1px solid ${colors.border}`,
  backgroundColor: colors.bg,
  color: colors.textHeader,
  borderRadius: 8,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
});

// ==========================================
// 2. 表单布局组件
// ==========================================

export const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    <span style={{ 
      fontSize: 11, 
      fontWeight: 700, 
      textTransform: 'uppercase', 
      letterSpacing: '1px', 
      color: 'var(--text)', // 兼容 CSS 变量
      opacity: 0.6 
    }}>
      {label}
    </span>
    {children}
  </div>
);

export const Divider = ({ colors }: { colors: Colors }) => (
  <div style={{ height: 1, backgroundColor: colors.border, margin: '8px 0' }} />
);

// ==========================================
// 3. 交互组件
// ==========================================

export const ToggleRow = ({
  icon: Icon, label, checked, onChange, colors,
}: {
  icon: React.ElementType;
  label: string;
  checked: boolean;
  onChange: () => void;
  colors: Colors;
}) => (
  <div 
    onClick={onChange}
    style={{
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      padding: '10px 14px', 
      borderRadius: 12, // 更圆润的点击区域
      backgroundColor: colors.grayBg, 
      cursor: 'pointer',
      border: `1px solid ${checked ? colors.accent : 'transparent'}`,
      boxShadow: checked ? `0 2px 8px ${colors.accentBg}` : 'none',
      transition: 'all 0.2s ease',
    }}
    onMouseEnter={(e) => {
      if (!checked) e.currentTarget.style.backgroundColor = `${colors.text}10`; // 悬浮微量变色
    }}
    onMouseLeave={(e) => {
      if (!checked) e.currentTarget.style.backgroundColor = colors.grayBg;
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <Icon size={20} weight={checked ? "fill" : "bold"} color={checked ? colors.accent : colors.text} />
      <span style={{ fontSize: 13, fontWeight: 600, color: checked ? colors.textHeader : colors.text }}>
        {label}
      </span>
    </div>

    {/* 优化的 Switch 开关主体 */}
    <div style={{
      position: 'relative', // 为内部小圆点的绝对定位做准备
      width: 44, 
      height: 24, 
      borderRadius: 12,
      backgroundColor: checked ? colors.accent : 'rgba(128,128,128,0.25)',
      transition: 'background-color 0.3s ease',
      flexShrink: 0,
    }}>
      {/* 利用 transform 代替 justify-content。
        使用 translateY(-50%) 居中，translateX 控制位移，
        这是前端性能最高、最顺滑的动画方案。
      */}
      <div style={{ 
        position: 'absolute',
        top: '50%',
        left: 2, // 距离左侧 2px
        width: 20, 
        height: 20, 
        borderRadius: '50%', 
        backgroundColor: checked ? '#000' : '#fff', 
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        transform: `translateY(-50%) translateX(${checked ? 20 : 0}px)`,
        transition: 'transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1)', // iOS 风格的弹性阻尼动画
      }} />
    </div>
  </div>
);