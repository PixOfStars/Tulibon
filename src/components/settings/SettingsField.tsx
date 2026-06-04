import type React from 'react';

type Colors = Record<string, string>;

export const inputStyle = (colors: Colors): React.CSSProperties => ({
  width: '100%', padding: '10px 14px',
  backgroundColor: colors.grayBg, border: `1px solid ${colors.border}`,
  borderRadius: 8, color: colors.textHeader, fontSize: 13,
  boxSizing: 'border-box',
});

export const iconBtnStyle = (colors: Colors): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  border: `1px solid ${colors.border}`,
  backgroundColor: colors.bg, color: colors.textHeader,
  borderRadius: 8, cursor: 'pointer',
  transition: 'all 0.15s',
});

export const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.5 }}>{label}</span>
    {children}
  </div>
);

export const ToggleRow = ({
  icon: Icon, label, checked, onChange, colors,
}: {
  icon: React.ElementType;
  label: string;
  checked: boolean;
  onChange: () => void;
  colors: Colors;
}) => (
  <div onClick={onChange}
    style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 14px', borderRadius: 10,
      backgroundColor: colors.grayBg, cursor: 'pointer',
      border: `1px solid ${checked ? colors.accent : 'transparent'}`,
      transition: 'border-color 0.2s',
    }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <Icon size={20} weight="bold" color={checked ? colors.accent : colors.text} />
      <span style={{ fontSize: 13, fontWeight: 600, color: checked ? colors.textHeader : colors.text }}>{label}</span>
    </div>
    <div style={{
      width: 44, height: 26, borderRadius: 13, padding: 3,
      backgroundColor: checked ? colors.accent : 'rgba(128,128,128,0.3)',
      transition: 'background-color 0.2s',
      display: 'flex', alignItems: 'center',
      justifyContent: checked ? 'flex-end' : 'flex-start',
    }}>
      <div style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: checked ? '#000' : '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </div>
  </div>
);

export const Divider = ({ colors }: { colors: Colors }) => (
  <div style={{ height: 1, backgroundColor: colors.border, margin: '4px 0' }} />
);
