import { useState } from 'react';
import { Copy, CaretDown, CaretRight } from '@phosphor-icons/react';
import type { AnalysisRecord } from '../../types';
import { MODE_FIELD_CONFIGS, DEFAULT_EXPANDED } from './ModeFieldConfigs';

interface DesignModeViewProps {
  record: AnalysisRecord;
  lang: 'zh' | 'en';
  colors: Record<string, string>;
  fieldLabels: Record<string, string>;
  onCopy: (text: string) => void;
  t: Record<string, string>;
}

function DesignModeView({ record, lang, colors, fieldLabels, onCopy, t }: DesignModeViewProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(DEFAULT_EXPANDED));
  const data = record.modeData as unknown as Record<string, unknown>;

  const toggle = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {MODE_FIELD_CONFIGS.map((field) => {
        const value = data[field.key];
        const isExpanded = expanded.has(field.key);
        const label = fieldLabels[field.key] || field.key;

        let text = '';
        if (value && typeof value === 'object' && 'zh' in (value as object)) {
          text = lang === 'zh'
            ? (value as Record<string, string>).zh
            : (value as Record<string, string>).en;
        } else if (typeof value === 'string') {
          text = value;
        }

        if (!text) return null;

        const bg = field.isPrompt ? `${colors.accent}08` : colors.grayBg;

        return (
          <div key={field.key} style={{
            borderRadius: 10, overflow: 'hidden',
            border: `1px solid ${field.isPrompt ? `${colors.accent}30` : colors.border}`,
            backgroundColor: bg,
          }}>
            <button
              onClick={() => toggle(field.key)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 14px', border: 'none', background: 'none',
                cursor: 'pointer', color: colors.textHeader,
                fontSize: 12, fontWeight: 700,
              }}
            >
              {isExpanded
                ? <CaretDown size={14} weight="bold" color={field.isPrompt ? colors.accent : colors.text} />
                : <CaretRight size={14} weight="bold" color={field.isPrompt ? colors.accent : colors.text} />
              }
              {label}
              {field.isPrompt && (
                <span style={{ fontSize: 9, color: colors.accent, marginLeft: 'auto' }}>Prompt</span>
              )}
            </button>
            {isExpanded && (
              <div style={{ padding: '0 14px 12px' }}>
                <div style={{ fontSize: 12, color: colors.text, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                  {text}
                </div>
                <button
                  onClick={() => onCopy(text)}
                  style={{
                    marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '3px 10px', borderRadius: 6, border: `1px solid ${colors.border}`,
                    backgroundColor: 'transparent', color: colors.text,
                    fontSize: 10, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  <Copy size={12} weight="bold" /> {t.copy}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default DesignModeView;
