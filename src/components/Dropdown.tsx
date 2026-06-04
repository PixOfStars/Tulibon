import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CaretDown, CaretUp } from '@phosphor-icons/react';
import { inputStyle } from './settings/SettingsField';

interface DropdownProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  colors: Record<string, string>;
  placeholder?: string;
}

const Dropdown = ({ options, value, onChange, colors, placeholder }: DropdownProps) => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0, width: 0 });

  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPanelPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onScroll = () => updatePosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selected = options.find(o => o.value === value);
  const display = selected?.label ?? placeholder ?? '';

  const triggerStyle: React.CSSProperties = {
    ...inputStyle(colors),
    padding: '8px 10px', fontSize: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    cursor: 'pointer', userSelect: 'none' as const,
  };

  const panel = open && (
    <div ref={panelRef} style={{
      position: 'fixed',
      top: panelPos.top, left: panelPos.left, width: panelPos.width,
      zIndex: 9999,
      backgroundColor: colors.bg,
      border: `1px solid ${colors.border}`,
      borderRadius: 10,
      boxShadow: '0 8px 32px rgba(0,0,0,0.24)',
      padding: '4px',
      display: 'flex', flexDirection: 'column',
      maxHeight: 240, overflow: 'auto',
    }}>
      {options.map(o => (
        <button
          key={o.value}
          style={{
            display: 'flex', alignItems: 'center',
            padding: '8px 12px', borderRadius: 6,
            border: 'none', background: 'none',
            color: colors.textHeader, fontSize: 12,
            cursor: 'pointer', textAlign: 'left', width: '100%',
            backgroundColor: o.value === value ? colors.accentBg : 'transparent',
            fontWeight: o.value === value ? 700 : 500,
          }}
          onMouseEnter={e => { if (o.value !== value) e.currentTarget.style.backgroundColor = colors.accentBg; }}
          onMouseLeave={e => { if (o.value !== value) e.currentTarget.style.backgroundColor = 'transparent'; }}
          onClick={() => { onChange(o.value); setOpen(false); }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <div ref={triggerRef} style={triggerStyle} onClick={() => setOpen(!open)}>
        <span style={{ color: selected ? colors.textHeader : 'rgba(128,128,128,0.6)', fontSize: 12 }}>{display}</span>
        {open ? <CaretUp size={12} weight="bold" color={colors.text} /> : <CaretDown size={12} weight="bold" color={colors.text} />}
      </div>
      {createPortal(panel, document.body)}
    </>
  );
};

export default Dropdown;
