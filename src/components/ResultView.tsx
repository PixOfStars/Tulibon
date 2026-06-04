import { useState } from 'react';
import { Copy, CheckCircle, Trash, FileText, Plus, X } from '@phosphor-icons/react';
import type { AnalysisRecord, Collection, Tag } from '../types';
import type { AppTheme } from '../theme';
import { FIELD_LABELS } from './result/ModeFieldConfigs';
import DesignModeView from './result/DesignModeView';
import DiskImage from './DiskImage';
import { exportAsTxt } from '../utils/helpers';
import zh from '../locales/zh.json';
import en from '../locales/en.json';

interface ResultViewProps {
  record: AnalysisRecord;
  theme: AppTheme;
  lang: 'zh' | 'en';
  tags: Tag[];
  collections: Collection[];
  onToggleCollection: (collectionId: string) => void;
  onDelete: () => void;
  onExport: (format: 'txt' | 'md') => void;
  onCopy: (text: string) => void;
  onAddUserTag: (name: { zh: string; en: string }) => void;
  onRemoveUserTag: (tagId: string) => void;
  defaultExportFormat: 'md' | 'txt';
}

const ResultView = ({
  record, theme, lang, tags, collections,
  onToggleCollection, onDelete, onExport, onCopy,
  onAddUserTag, onRemoveUserTag, defaultExportFormat,
}: ResultViewProps) => {
  const [copied, setCopied] = useState(false);
  const [showCollectionPicker, setShowCollectionPicker] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const t = lang === 'zh' ? zh : en;
  const colors = theme.colors;
  const fl = FIELD_LABELS;
  const fieldLabels: Record<string, string> = {};
  for (const [k, v] of Object.entries(fl)) {
    fieldLabels[k] = lang === 'zh' ? v.zh : v.en;
  }

  const handleCopy = (text: string) => {
    onCopy(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyFullReport = () => {
    const labels = {
      report: t.exportReport,
      summary: t.exportSectionSummary,
      tags: t.exportSectionTags,
      analysis: t.exportSectionAnalysis,
    };
    handleCopy(exportAsTxt(record, lang, labels));
  };

  const selectedCollections = collections.filter(c => record.collectionIds.includes(c.id));

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Image preview */}
      <div style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${colors.border}`, backgroundColor: colors.grayBg }}>
        <DiskImage path={record.imagePath} alt={t.analyzedImage}
          style={{ width: '100%', maxHeight: 200, objectFit: 'contain', display: 'block' }} />
      </div>

      {/* Summary */}
      <div style={{ padding: 12, borderRadius: 10, backgroundColor: colors.accentBg, border: `1px solid ${colors.accent}20` }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: colors.accent, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {t.summary}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: colors.textHeader, lineHeight: 1.5 }}>
          {lang === 'zh' ? record.summary.zh : record.summary.en}
        </div>
      </div>

      {/* Design analysis fields */}
      <DesignModeView record={record} lang={lang} colors={colors} fieldLabels={fieldLabels} onCopy={handleCopy} t={t} />

      {/* Tags */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: colors.text, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t.tags}</div>
          <button onClick={() => setShowTagInput(!showTagInput)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, border: 'none', backgroundColor: colors.accentBg, color: colors.accent, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={12} weight="bold" />{t.addTag}
          </button>
        </div>

        {showTagInput && (
          <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
            <input
              type="text"
              value={newTagName}
              onChange={e => setNewTagName(e.target.value)}
              placeholder={t.addTagPlaceholder}
              autoFocus
              style={{
                flex: 1, padding: '4px 8px', borderRadius: 6, border: `1px solid ${colors.border}`,
                backgroundColor: colors.bg, color: colors.textHeader, fontSize: 11,
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && newTagName.trim()) {
                  onAddUserTag({ zh: newTagName.trim(), en: newTagName.trim() });
                  setNewTagName('');
                  setShowTagInput(false);
                } else if (e.key === 'Escape') {
                  setNewTagName('');
                  setShowTagInput(false);
                }
              }}
            />
            <button onClick={() => {
              if (newTagName.trim()) {
                onAddUserTag({ zh: newTagName.trim(), en: newTagName.trim() });
                setNewTagName('');
                setShowTagInput(false);
              }
            }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.accent, padding: 2 }}>
              <X size={14} weight="bold" />
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {record.systemTags.map(tid => {
            const tag = tags.find(tg => tg.id === tid);
            if (!tag) return null;
            return (
              <span key={tid} style={{ padding: '4px 10px', backgroundColor: colors.grayBg, color: colors.textHeader, borderRadius: 6, fontSize: 10, fontWeight: 600, border: `1px solid ${colors.border}` }}>
                #{lang === 'zh' ? tag.name.zh : tag.name.en}
              </span>
            );
          })}
          {record.userTags.map(tid => {
            const tag = tags.find(tg => tg.id === tid);
            if (!tag) return null;
            return (
              <span key={tid} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '4px 8px', backgroundColor: colors.accentBg, color: colors.accent, borderRadius: 6, fontSize: 10, fontWeight: 600, border: `1px solid ${colors.accent}30` }}>
                #{lang === 'zh' ? tag.name.zh : tag.name.en}
                <button onClick={() => onRemoveUserTag(tid)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.accent, padding: 0, display: 'flex' }}>
                  <X size={8} weight="bold" />
                </button>
              </span>
            );
          })}
          {record.systemTags.length === 0 && record.userTags.length === 0 && (
            <span style={{ fontSize: 10, color: colors.text, fontStyle: 'italic' }}>{t.noTags}</span>
          )}
        </div>
      </div>

      {/* Collection picker */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: colors.text, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t.collection}</div>
          <button onClick={() => setShowCollectionPicker(!showCollectionPicker)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, border: 'none', backgroundColor: colors.accentBg, color: colors.accent, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
            <Plus size={12} weight="bold" />{t.saveToCollection}
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {selectedCollections.map(c => (
            <span key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, backgroundColor: c.color + '20', color: c.color, fontSize: 10, fontWeight: 600, border: `1px solid ${c.color}40` }}>
              {lang === 'zh' ? c.name.zh : c.name.en}
              <button onClick={() => onToggleCollection(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.color, padding: 0, display: 'flex' }}>
                <X size={10} weight="bold" />
              </button>
            </span>
          ))}
          {selectedCollections.length === 0 && (
            <span style={{ fontSize: 10, color: colors.text, fontStyle: 'italic' }}>{t.noCollection}</span>
          )}
        </div>

        {showCollectionPicker && (
          <div style={{ marginTop: 6, padding: 8, borderRadius: 10, backgroundColor: colors.grayBg, border: `1px solid ${colors.border}`, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {collections.map(c => {
              const selected = record.collectionIds.includes(c.id);
              return (
                <button key={c.id} onClick={() => onToggleCollection(c.id)}
                  style={{ padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 600, backgroundColor: selected ? c.color + '30' : colors.bg, color: selected ? c.color : colors.text, transition: 'all 0.15s' }}>
                  {lang === 'zh' ? c.name.zh : c.name.en}{selected ? ' ✓' : ''}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Action row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={handleCopyFullReport}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 12, border: 'none', backgroundColor: copied ? colors.success : colors.accent, color: '#000', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>
          {copied ? <CheckCircle size={20} weight="bold" /> : <Copy size={20} weight="bold" />}
          <span>{copied ? t.copied : t.copy}</span>
        </button>
        <div style={{ flex: 1 }} />
        <button onClick={() => onExport(defaultExportFormat)}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 14px', borderRadius: 8, border: `1px solid ${colors.border}`, backgroundColor: colors.bg, color: colors.textHeader, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
          title={t.exportTxt}>
          <FileText size={16} weight="bold" /> {t.exportTxt}
        </button>
        <button onClick={onDelete} style={{ ...iconBtnStyle(colors), color: colors.text }}
          title={t.historyClear}
          onMouseEnter={e => (e.currentTarget.style.color = colors.error)}
          onMouseLeave={e => (e.currentTarget.style.color = colors.text)}>
          <Trash size={18} weight="bold" />
        </button>
      </div>
    </div>
  );
};

const iconBtnStyle = (colors: Record<string, string>): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 40, height: 40, borderRadius: 10,
  border: `1px solid ${colors.border}`,
  backgroundColor: colors.bg, color: colors.text,
  cursor: 'pointer', transition: 'all 0.15s',
});

export default ResultView;
