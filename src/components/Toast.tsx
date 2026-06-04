import { useState, useCallback, createContext, useContext } from 'react';
import type { ReactNode } from 'react';

export interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
  action?: { label: string; onClick: () => void };
  duration: number;
}

interface ToastContextValue {
  show: (message: string, type?: ToastItem['type'], action?: ToastItem['action'], duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue>({ show: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let _nextId = 0;

export function ToastProvider({ children, accentColor, errorColor }: { children: ReactNode; accentColor?: string; errorColor?: string }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((message: string, type: ToastItem['type'] = 'success', action?: ToastItem['action'], duration?: number) => {
    const id = _nextId++;
    const d = duration ?? (action ? 8000 : 3000);
    setToasts(prev => [...prev, { id, message, type, action, duration: d }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, d);
  }, []);

  const remove = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div style={{
        position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)',
        zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 6,
        pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <ToastView key={t.id} item={t} onRemove={remove} accentColor={accentColor} errorColor={errorColor} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastView({ item, onRemove, accentColor, errorColor }: { item: ToastItem; onRemove: (id: number) => void; accentColor?: string; errorColor?: string }) {
  const accent = accentColor || '#00C896';
  const error = errorColor || '#FF3B30';
  const colors = {
    success: { bg: accent, text: '#000' },
    error: { bg: error, text: '#fff' },
    info: { bg: 'rgba(255,255,255,0.9)', text: '#1A1A1A' },
  }[item.type];

  return (
    <div className="fade-in" style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 16px', borderRadius: 10,
      backgroundColor: colors.bg, color: colors.text,
      fontSize: 13, fontWeight: 600,
      boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
      pointerEvents: 'auto',
      whiteSpace: 'nowrap',
    }}>
      <span>{item.message}</span>
      {item.action && (
        <button
          onClick={() => {
            item.action!.onClick();
            onRemove(item.id);
          }}
          style={{
            padding: '4px 12px', borderRadius: 6, border: 'none',
            backgroundColor: 'rgba(255,255,255,0.2)',
            color: colors.text, fontSize: 12, fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {item.action.label}
        </button>
      )}
    </div>
  );
}
