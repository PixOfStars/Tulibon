import { useState } from 'react';
import { 
  Copy, CaretDown, CaretRight, Check, 
  Sparkle, ImageSquare, Target, Palette, Layout, TextAa, Lightbulb, ListDashes
} from '@phosphor-icons/react';
import type { AnalysisRecord } from '../../types';
import { MODE_FIELD_CONFIGS, DEFAULT_EXPANDED } from './ModeFieldConfigs';

interface DesignModeViewProps {
  record: AnalysisRecord;
  lang: 'zh' | 'en';
  colors: Record<string, string>;
  fieldLabels: Record<string, string>;
  onCopy: (text: string) => void;
  t: Record<string, string>;
  forceExpand?: boolean;
}

// 智能匹配对应的图标
const getFieldIcon = (key: string, label: string, isPrompt?: boolean) => {
  if (isPrompt || key.toLowerCase().includes('prompt')) return Sparkle;
  if (label.includes('内容') || key.toLowerCase().includes('content')) return ImageSquare;
  if (label.includes('目的') || key.toLowerCase().includes('purpose')) return Target;
  if (label.includes('风格') || key.toLowerCase().includes('style')) return Palette;
  if (label.includes('布局') || label.includes('构图') || key.toLowerCase().includes('layout')) return Layout;
  if (label.includes('配色') || label.includes('排版') || key.toLowerCase().includes('color')) return TextAa;
  if (label.includes('借鉴') || key.toLowerCase().includes('reference')) return Lightbulb;
  return ListDashes; // 默认兜底图标
};

// ==========================================
// 子组件：单行折叠面板
// ==========================================
const FieldItem = ({
  fieldKey, label, text, isExpanded, isPrompt, isLast, colors, t, onToggle, onCopy, forceExpand
}: {
  fieldKey: string; label: string; text: string;
  isExpanded: boolean; isPrompt?: boolean; isLast: boolean;
  colors: Record<string, string>; t: Record<string, string>;
  onToggle: () => void; onCopy: (text: string) => void;
  forceExpand?: boolean;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCopy(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const showCopy = isExpanded || isHovered;
  const IconComponent = getFieldIcon(fieldKey, label, isPrompt);

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
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          cursor: forceExpand ? 'default' : 'pointer',
          color: isExpanded ? colors.textHeader : colors.text,
          fontSize: 13,
          fontWeight: isExpanded ? 700 : 600,
          transition: 'color 0.2s',
        }}
      >
        {/* 折叠箭头：forceExpand 模式下隐藏 */}
        {!forceExpand && (
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 16 }}>
            {isExpanded ? <CaretDown size={14} weight="bold" /> : <CaretRight size={14} weight="bold" />}
          </span>
        )}
        
        {/* 智能匹配的图标 */}
        <IconComponent size={16} weight={isPrompt ? "fill" : "bold"} color={forceExpand ? colors.accent : (isPrompt ? colors.accent : colors.text)} style={{ opacity: isPrompt || forceExpand ? 1 : 0.7 }} />
        
        <span style={{ flex: 1 }}>{label}</span>

        {/* 右侧复制按钮 */}
        {showCopy && (
          <button
            onClick={handleCopy}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 4, borderRadius: 6, border: 'none',
              backgroundColor: isCopied ? `${colors.success || colors.accent}20` : colors.grayBg,
              color: isCopied ? (colors.success || colors.accent) : colors.text,
              cursor: 'pointer', opacity: isHovered || isCopied ? 1 : 0.4,
              transition: 'all 0.2s ease',
            }}
            title={t.copy}
            onMouseEnter={(e) => { if (!isCopied) e.currentTarget.style.backgroundColor = `${colors.text}15`; }}
            onMouseLeave={(e) => { if (!isCopied) e.currentTarget.style.backgroundColor = colors.grayBg; }}
          >
            {isCopied ? <Check size={14} weight="bold" /> : <Copy size={14} weight="bold" />}
          </button>
        )}
      </div>

      {/* 展开的正文内容 */}
      {isExpanded && (
        <div className="fade-in-fast"
          style={{
            marginTop: 8,
            paddingLeft: 24, // 对齐文字
            fontSize: 12,
            color: colors.text,
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
};

// ==========================================
// 主组件
// ==========================================
function DesignModeView({ record, lang, colors, fieldLabels, onCopy, t, forceExpand }: DesignModeViewProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(DEFAULT_EXPANDED));
  const data = record.modeData as unknown as Record<string, unknown>;

  const toggle = (key: string) => {
    if (forceExpand) return; // 强制展开模式下禁止折叠
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

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
          text = lang === 'zh' ? (value as Record<string, string>).zh : (value as Record<string, string>).en;
        } else if (typeof value === 'string') {
          text = value;
        }

        return (
          <FieldItem
            key={field.key}
            fieldKey={field.key}
            label={label}
            text={text}
            isExpanded={forceExpand || expanded.has(field.key)}
            isPrompt={field.isPrompt}
            isLast={isLast}
            colors={colors}
            t={t}
            onToggle={() => toggle(field.key)}
            onCopy={onCopy}
            forceExpand={forceExpand}
          />
        );
      })}
    </div>
  );
}

export default DesignModeView;