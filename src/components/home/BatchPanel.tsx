import { Trash, X } from '@phosphor-icons/react';
import type { BatchItem } from '../../types';
import zh from '../../locales/zh.json';
import en from '../../locales/en.json';

interface BatchPanelProps {
  batchItems: BatchItem[];
  batchRunning: boolean;
  themeColors: Record<string, string>;
  lang: 'zh' | 'en';
  onStart: () => void;
  onClear: () => void;
  onRemove: (id: string) => void;
}

const BatchPanel = ({ batchItems, batchRunning, themeColors: colors, lang, onStart, onClear, onRemove }: BatchPanelProps) => {
  const t = lang === 'zh' ? zh : en;

  return (
    <div style={{ paddingTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: colors.textHeader }}>{t.batchTitle} ({batchItems.length})</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={onStart} disabled={batchRunning} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8,
            border: 'none', backgroundColor: colors.accent, color: '#000',
            fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: batchRunning ? 0.5 : 1,
          }}>{t.batchStart}</button>
          <button onClick={onClear} disabled={batchRunning} style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', borderRadius: 8,
            border: `1px solid ${colors.border}`, backgroundColor: 'transparent',
            color: colors.text, fontSize: 11, fontWeight: 600, cursor: 'pointer',
          }}><Trash size={14} />{t.batchClear}</button>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {batchItems.map((item) => (
          <div key={item.id} style={{
            display: 'flex', gap: 10, padding: 10, borderRadius: 10,
            backgroundColor: colors.grayBg, border: `1px solid ${colors.border}`, alignItems: 'center',
          }}>
            <img src={item.imageDataUrl} alt="" style={{ width: 48, height: 48, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: colors.textHeader }}>
                {item.status === 'queued' ? t.batchQueued : item.status === 'analyzing' ? t.batchAnalyzing : item.status === 'done' ? t.batchDone : t.batchError}
              </span>
            </div>
            {item.status !== 'analyzing' && (
              <button onClick={() => onRemove(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.text, padding: 4 }}>
                <X size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BatchPanel;
