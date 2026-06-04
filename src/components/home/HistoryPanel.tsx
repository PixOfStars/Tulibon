import { Heart, MagnifyingGlass, Tray } from '@phosphor-icons/react';
import type { AnalysisRecord, Collection, Tag } from '../../types';
import { formatDate } from '../../utils/helpers';
import DiskImage from '../DiskImage';
import zh from '../../locales/zh.json';
import en from '../../locales/en.json';

interface HistoryPanelProps {
  records: AnalysisRecord[];
  tags: Tag[];
  collections: Collection[];
  themeColors: Record<string, string>;
  lang: 'zh' | 'en';
  isCollectionView: boolean;
  onSelectRecord: (record: AnalysisRecord) => void;
}

const MODE_LABEL: Record<string, { zh: string; en: string }> = {
  design: { zh: '设计分析', en: 'Design Analysis' },
  ocr:    { zh: '文字识别', en: 'Text Recognition' },
};

const HistoryPanel = ({ records, tags, themeColors: colors, lang, isCollectionView, onSelectRecord }: HistoryPanelProps) => {
  const t = lang === 'zh' ? zh : en;

  if (records.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: colors.text, fontSize: 13 }}>
        <MagnifyingGlass size={28} weight="light" color={colors.border} style={{ marginBottom: 8 }} />
        <p>{isCollectionView ? t.noRecords : t.noHistorySearch}</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {records.map((record) => {
        const recordTags = record.systemTags.map(tid => tags.find(tg => tg.id === tid)).filter(Boolean) as Tag[];
        const isFav = record.collectionIds.includes('__favorites');
        const modeLabel = MODE_LABEL[record.analysisMode] || MODE_LABEL.design;
        return (
          <div key={record.id}
            onClick={() => onSelectRecord(record)}
            style={{
              display: 'flex', gap: 12, padding: 12, borderRadius: 12,
              backgroundColor: colors.grayBg, cursor: 'pointer',
              border: `1px solid ${colors.border}`, transition: 'all 0.2s',
            }}
            className="fade-in"
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = colors.accentBg; e.currentTarget.style.borderColor = colors.accent; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = colors.grayBg; e.currentTarget.style.borderColor = colors.border; }}>
            <DiskImage path={record.imagePath} alt="" style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 12, fontWeight: 600, color: colors.textHeader,
                overflow: 'hidden', textOverflow: 'ellipsis',
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                marginBottom: 4, lineHeight: 1.4,
              }}>
                {lang === 'zh' ? record.summary.zh : record.summary.en}
              </div>
              {recordTags.length > 0 && (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 4 }}>
                  {recordTags.slice(0, 4).map((tag) => (
                    <span key={tag.id} style={{ fontSize: 10, padding: '2px 8px', backgroundColor: colors.bg, borderRadius: 6, color: colors.text }}>
                      #{lang === 'zh' ? tag.name.zh : tag.name.en}
                    </span>
                  ))}
                  {recordTags.length > 4 && <span style={{ fontSize: 10, color: colors.text }}>+{recordTags.length - 4}</span>}
                </div>
              )}
              <div style={{ fontSize: 10, color: colors.text, display: 'flex', gap: 8, alignItems: 'center' }}>
                <span>{formatDate(record.createdAt, lang)}</span>
                <span style={{ opacity: 0.6 }}>
                  {record.source === 'clipboard' ? t.sourceClipboard : record.source === 'drag' ? t.sourceDrag : t.sourceUrl}
                </span>
                {isFav && <Heart size={10} weight="fill" color={colors.error} />}
              </div>
            </div>
            <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, backgroundColor: colors.bg, color: colors.text, flexShrink: 0, alignSelf: 'flex-start' }}>
              {lang === 'zh' ? modeLabel.zh : modeLabel.en}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const EmptyState = ({ colors, isCollectionView, t }: { colors: Record<string, string>; isCollectionView: boolean; t: Record<string, string> }) => (
  <div style={{ textAlign: 'center', padding: 60, color: colors.text, fontSize: 13 }}>
    <Tray size={32} weight="light" color={colors.border} style={{ marginBottom: 12 }} />
    <p>{isCollectionView ? t.noRecords : t.noHistory}</p>
  </div>
);

export { EmptyState };
export default HistoryPanel;
