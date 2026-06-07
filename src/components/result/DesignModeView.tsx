import { useState } from 'react';
import { Copy, Sparkle, Check } from '@phosphor-icons/react';
import type { AnalysisRecord } from '../../types';
import { MODE_FIELD_CONFIGS } from './ModeFieldConfigs';
import Tooltip from '../common/Tooltip';

interface DesignModeViewProps {
  record: AnalysisRecord;
  lang: 'zh' | 'en';
  colors: Record<string, string>;
  fieldLabels: Record<string, string>;
  onCopy: (text: string) => void;
  t: Record<string, string>;
}

// ==========================================
// 子组件：单行面板 (全部默认展开)
// ==========================================
const FieldItem = ({
  label, text, isPrompt, isLast, colors, t, onCopy
}: {
  label: string; text: string;
  isPrompt?: boolean; isLast: boolean;
  colors: Record<string, string>; t: Record<string, string>;
  onCopy: (text: string) => void;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCopy(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // 鼠标悬浮时显示复制按钮
  const showCopy = isHovered;

  return (
    <div
      style={{
        padding: '12px 0',
        borderBottom: isLast ? 'none' : `1px solid ${colors.border}`,
        transition: 'background-color 0.2s ease',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 标题栏 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: colors.textHeader,
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        {/* Prompt 特殊标识 */}
        {isPrompt && <Sparkle size={14} weight="fill" color={colors.accent} />}
        
        <span style={{ flex: 1 }}>{label}</span>

        {/* 右侧复制按钮 */}
        {showCopy && (
          <Tooltip key={colors.accent} content={t.copy} accentColor={colors.accent}>
          <button
            onClick={handleCopy}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 4,
              borderRadius: 6,
              border: 'none',
              backgroundColor: isCopied ? `${colors.success || colors.accent}20` : colors.grayBg,
              color: isCopied ? (colors.success || colors.accent) : colors.text,
              cursor: 'pointer',
              opacity: isHovered || isCopied ? 1 : 0.4,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => { if (!isCopied) e.currentTarget.style.backgroundColor = `${colors.text}15`; }}
            onMouseLeave={(e) => { if (!isCopied) e.currentTarget.style.backgroundColor = colors.grayBg; }}
          >
            {isCopied ? <Check size={14} weight="bold" /> : <Copy size={14} weight="bold" />}
          </button>
          </Tooltip>
        )}
      </div>

      {/* 正文内容 */}
      <div className="fade-in-fast"
        style={{
          marginTop: 8,
          fontSize: 12,
          color: colors.text,
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
        }}
      >
        {text}
      </div>
    </div>
  );
};

// ==========================================
// 主组件
// ==========================================
function DesignModeView({ record, lang, colors, fieldLabels, onCopy, t }: DesignModeViewProps) {
  const data = record.modeData as unknown as Record<string, unknown>;

  // 过滤出有内容的字段
  const fields = MODE_FIELD_CONFIGS.filter((field) => {
    const value = data[field.key];
    if (!value) return false;
    if (typeof value === 'object' && 'zh' in (value as object)) {
      const v = value as Record<string, string>;
      return !!(v.zh || v.en);
    }
    if (typeof value === 'string') return !!value;
    return false;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {fields.map((field, index) => {
        const value = data[field.key];
        const isLast = index === fields.length - 1;
        const label = fieldLabels[field.key] || field.key;

        let text = '';
        if (value && typeof value === 'object' && 'zh' in (value as object)) {
          text = lang === 'zh'
            ? (value as Record<string, string>).zh
            : (value as Record<string, string>).en;
        } else if (typeof value === 'string') {
          text = value;
        }

        return (
          <FieldItem
            key={field.key}
            label={label}
            text={text}
            isPrompt={field.isPrompt}
            isLast={isLast}
            colors={colors}
            t={t}
            onCopy={onCopy}
          />
        );
      })}
    </div>
  );
}

export default DesignModeView;
