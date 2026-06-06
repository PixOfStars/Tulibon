import { ArrowLeft, Trash, Folder, Tray, Heart, Star, BookmarkSimple, Flag, Lightning, Palette } from '@phosphor-icons/react';
import type { Collection } from '../../types';
import { getT } from '../../utils/i18n';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ICON_MAP: Record<string, any> = { Folder, Tray, Heart, Star, BookmarkSimple, Flag, Lightning, Palette };

interface CollectionHeaderProps {
  collection: Collection;
  recordCount: number;
  colors: Record<string, string>;
  lang: 'zh' | 'en';
  isBuiltIn: boolean;
  onBack: () => void;
  onDelete?: () => void;
}

const CollectionHeader = ({ collection, recordCount, colors, lang, isBuiltIn, onBack, onDelete }: CollectionHeaderProps) => {
  const t = getT(lang);
  const IconComp = ICON_MAP[collection.icon] || Folder;
  return (
    <div style={{
      padding: '12px 20px 8px', flexShrink: 0,
      display: 'flex', alignItems: 'center', gap: 10,
      borderBottom: `1px solid ${colors.border}`,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8,
        backgroundColor: collection.color + '20',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <IconComp size={16} weight="fill" color={collection.color} />
      </div>
      <span style={{ fontSize: 15, fontWeight: 700, color: colors.textHeader }}>
        {lang === 'zh' ? collection.name.zh : collection.name.en}
      </span>
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          fontSize: 11, color: colors.text,
          backgroundColor: `${colors.accent}15`, padding: '2px 8px', borderRadius: 10,
          flexShrink: 0,
        }}>
          {recordCount}
        </span>
        <button onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, borderRadius: 8, border: 'none',
            cursor: 'pointer', backgroundColor: 'transparent', color: colors.text,
            flexShrink: 0,
          }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = colors.accentBg)}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
          <ArrowLeft size={16} weight="bold" />
        </button>
        {!isBuiltIn && onDelete && (
          <button onClick={onDelete}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '4px 12px', borderRadius: 8, border: `1px solid ${colors.error}`,
              cursor: 'pointer', backgroundColor: 'transparent', color: colors.error,
              fontSize: 11, fontWeight: 600, flexShrink: 0,
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = colors.errorBg)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
            <Trash size={12} weight="bold" />
            {t.delete}
          </button>
        )}
      </div>
    </div>
  );
};
export default CollectionHeader;
