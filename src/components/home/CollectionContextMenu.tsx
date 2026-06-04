import { PencilSimple, CopySimple, Palette, Trash, Folder, Tray, Heart, Star, BookmarkSimple, Flag, Lightning } from '@phosphor-icons/react';
import type { Collection } from '../../types';

const ICONS = [
  { icon: Folder, id: 'Folder' },
  { icon: Tray, id: 'Tray' },
  { icon: Heart, id: 'Heart' },
  { icon: Star, id: 'Star' },
  { icon: BookmarkSimple, id: 'BookmarkSimple' },
  { icon: Flag, id: 'Flag' },
  { icon: Lightning, id: 'Lightning' },
  { icon: Palette, id: 'Palette' },
];

export function getCollIcon(iconId: string): any {
  const map: Record<string, any> = { Folder, Tray, Heart, Star, BookmarkSimple, Flag, Lightning, Palette };
  return map[iconId] || Folder;
}

const COLORS = ['#6366F1', '#F59E0B', '#EC4899', '#14B8A6', '#3B82F6', '#EF4444', '#8B5CF6', '#06B6D4'];

interface CollectionContextMenuProps {
  ctxMenu: { collectionId: string; x: number; y: number };
  ctxSubmenu: 'icon' | 'color' | null;
  collection: Collection | undefined;
  colors: Record<string, string>;
  t: Record<string, string>;
  isBuiltIn: boolean;
  onClose: () => void;
  onSetSubmenu: (s: 'icon' | 'color' | null) => void;
  onRename: () => void;
  onCopy: () => void;
  onIcon: (iconId: string) => void;
  onColor: (color: string) => void;
  onDelete: () => void;
}

export function CollectionContextMenu({
  ctxMenu, ctxSubmenu, collection, colors, t, isBuiltIn,
  onClose, onSetSubmenu, onRename, onCopy, onIcon, onColor, onDelete,
}: CollectionContextMenuProps) {
  const ctxMenuStyle: React.CSSProperties = {
    position: 'fixed',
    left: ctxMenu.x, top: ctxMenu.y,
    zIndex: 200,
    backgroundColor: colors.bg,
    border: `1px solid ${colors.border}`,
    borderRadius: 10,
    boxShadow: '0 8px 32px rgba(0,0,0,0.24)',
    padding: '4px',
    minWidth: 140,
    display: 'flex', flexDirection: 'column',
  };

  const itemStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 12px', borderRadius: 6,
    border: 'none', background: 'none',
    color: colors.textHeader, fontSize: 12, fontWeight: 500,
    cursor: 'pointer', textAlign: 'left', width: '100%',
  };

  const gridStyle: React.CSSProperties = {
    display: 'flex', flexWrap: 'wrap', gap: 4,
    padding: '4px 8px 8px',
  };

  return (
    <div style={ctxMenuStyle} onClick={e => e.stopPropagation()}>
      <button style={itemStyle}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = colors.accentBg)}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
        onClick={() => { onClose(); onRename(); }}>
        <PencilSimple size={14} weight="bold" />
        {t.rename}
      </button>
      <button style={itemStyle}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = colors.accentBg)}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
        onClick={() => { onClose(); onCopy(); }}>
        <CopySimple size={14} weight="bold" />
        {t.duplicate}
      </button>
      <div style={{ position: 'relative' }}>
        <button style={{ ...itemStyle, width: '100%' }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = colors.accentBg; onSetSubmenu('icon'); }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
          <Palette size={14} weight="bold" />
          {t.changeIcon}
        </button>
        {ctxSubmenu === 'icon' && (
          <div style={{ ...gridStyle, backgroundColor: colors.bg, borderTop: `1px solid ${colors.border}` }}>
            {ICONS.map(({ icon: Ico, id }) => (
              <button key={id} onClick={() => { onClose(); onIcon(id); }}
                style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: 6, backgroundColor: colors.grayBg, color: colors.text, cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = colors.accentBg)}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = colors.grayBg)}>
                <Ico size={16} weight="bold" />
              </button>
            ))}
          </div>
        )}
      </div>
      <div style={{ position: 'relative' }}>
        <button style={{ ...itemStyle, width: '100%' }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = colors.accentBg; onSetSubmenu('color'); }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
          <span style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: collection?.color || colors.accent, display: 'inline-block' }} />
          {t.changeColor}
        </button>
        {ctxSubmenu === 'color' && (
          <div style={{ ...gridStyle, backgroundColor: colors.bg, borderTop: `1px solid ${colors.border}` }}>
            {COLORS.map(color => (
              <button key={color} onClick={() => { onClose(); onColor(color); }}
                style={{ width: 24, height: 24, borderRadius: 6, border: 'none', backgroundColor: color, cursor: 'pointer', outline: 'none' }}
              />
            ))}
          </div>
        )}
      </div>
      {!isBuiltIn && (
        <>
          <div style={{ height: 1, backgroundColor: colors.border, margin: '2px 8px' }} />
          <button style={{ ...itemStyle, color: colors.error }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = `${colors.error}15`)}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            onClick={() => { onClose(); onDelete(); }}>
            <Trash size={14} weight="bold" />
            {t.delete}
          </button>
        </>
      )}
    </div>
  );
}
