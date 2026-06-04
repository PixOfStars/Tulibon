import { useState, useEffect } from 'react';
import { Plus, X, Check } from '@phosphor-icons/react';
import type { Collection, AnalysisRecord } from '../../types';
import { CollectionContextMenu, getCollIcon } from './CollectionContextMenu';
import zh from '../../locales/zh.json';
import en from '../../locales/en.json';

interface CollectionsViewProps {
  collections: Collection[];
  records: AnalysisRecord[];
  lang: 'zh' | 'en';
  colors: Record<string, string>;
  onCreateCollection?: (name: { zh: string; en: string }, onCreated?: (id: string) => void) => void;
  onUpdateCollection?: (collection: Collection) => void;
  onDeleteCollection?: (id: string) => void;
  onNavigate?: (view: string) => void;
}

const CollectionsView = ({
  collections, records, lang, colors,
  onCreateCollection, onUpdateCollection, onDeleteCollection, onNavigate,
}: CollectionsViewProps) => {
  const t = lang === 'zh' ? zh : en;

  const [ctxMenu, setCtxMenu] = useState<{ collectionId: string; x: number; y: number } | null>(null);
  const [ctxSubmenu, setCtxSubmenu] = useState<'icon' | 'color' | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');

  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => { setCtxMenu(null); setCtxSubmenu(null); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [ctxMenu]);

  // Context menu action handlers
  const handleCtxRename = (collectionId: string) => {
    if (!onUpdateCollection) return;
    const c = collections.find(col => col.id === collectionId);
    if (!c) return;
    setRenameId(c.id);
    setRenameText(lang === 'zh' ? c.name.zh : c.name.en);
  };

  const handleCtxDelete = (collectionId: string) => {
    if (!onDeleteCollection || collectionId.startsWith('__')) return;
    onDeleteCollection(collectionId);
  };

  const handleCtxCopy = (collectionId: string) => {
    if (!onCreateCollection) return;
    const c = collections.find(col => col.id === collectionId);
    if (!c) return;
    onCreateCollection({ zh: c.name.zh + t.copySuffix, en: c.name.en + t.copySuffix });
  };

  const handleCtxIcon = (collectionId: string, iconId: string) => {
    if (!onUpdateCollection) return;
    const c = collections.find(col => col.id === collectionId);
    if (!c) return;
    onUpdateCollection({ ...c, icon: iconId, updatedAt: Date.now() });
  };

  const handleCtxColor = (collectionId: string, color: string) => {
    if (!onUpdateCollection) return;
    const c = collections.find(col => col.id === collectionId);
    if (!c) return;
    onUpdateCollection({ ...c, color, updatedAt: Date.now() });
  };

  const handleRenameConfirm = (c: Collection) => {
    if (renameText.trim() && onUpdateCollection) {
      onUpdateCollection({ ...c, name: { zh: renameText.trim(), en: renameText.trim() }, updatedAt: Date.now() });
    }
    setRenameId(null);
    setRenameText('');
  };

  return (
    <div className="fade-in-fast" style={{ padding: '12px 20px 6px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: colors.textHeader }}>
          {t.collectionsWithCount.replace('{n}', String(collections.length))}
        </div>
        {onCreateCollection && (
          <button
            onClick={() => {
              const defaultName = t.newCollectionDefault;
              onCreateCollection({ zh: defaultName, en: defaultName }, (newId) => {
                setRenameId(newId);
                setRenameText(defaultName);
              });
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 4, padding: '6px 14px', borderRadius: 8,
              border: 'none', backgroundColor: colors.accent, color: '#000',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}>
            <Plus size={14} weight="bold" />{t.newCollection}
          </button>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {collections.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: colors.text, opacity: 0.4, fontSize: 13 }}>
            {t.noCollection}
          </div>
        )}
        {collections.map(c => {
          const count = records.filter(r => r.collectionIds.includes(c.id)).length;
          const isRenaming = renameId === c.id;
          const IconComp = getCollIcon(c.icon);
          return (
            <div key={c.id}
              onClick={isRenaming ? undefined : () => onNavigate?.(c.id)}
              onContextMenu={e => {
                e.preventDefault();
                setCtxMenu({ collectionId: c.id, x: e.clientX, y: e.clientY });
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', borderRadius: 10, cursor: isRenaming ? 'default' : 'pointer',
                backgroundColor: `${colors.accent}08`, border: `1px solid transparent`,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!isRenaming) e.currentTarget.style.borderColor = c.color; }}
              onMouseLeave={e => { if (!isRenaming) e.currentTarget.style.borderColor = 'transparent'; }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                backgroundColor: `${c.color}20`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <IconComp size={20} weight="fill" color={c.color} />
              </div>
              <div style={{ flex: 1 }}>
                {isRenaming ? (
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <input
                      value={renameText}
                      onChange={e => setRenameText(e.target.value)}
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); handleRenameConfirm(c); }
                        else if (e.key === 'Escape') { setRenameId(null); setRenameText(''); }
                      }}
                      onBlur={() => setTimeout(() => {
                        setRenameId(pid => pid === c.id ? null : pid);
                        setRenameText('');
                      }, 120)}
                      style={{
                        flex: 1, padding: '2px 6px', borderRadius: 6, border: `1px solid ${colors.accent}`,
                        backgroundColor: colors.bg, color: colors.textHeader, fontSize: 13, fontWeight: 600, outline: 'none',
                      }}
                    />
                    <button onMouseDown={e => { e.preventDefault(); handleRenameConfirm(c); }}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 5, border: 'none', backgroundColor: colors.accent, color: '#000', cursor: 'pointer' }}>
                      <Check size={12} weight="bold" />
                    </button>
                    <button onMouseDown={e => { e.preventDefault(); setRenameId(null); setRenameText(''); }}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 5, border: `1px solid ${colors.border}`, backgroundColor: colors.bg, color: colors.text, cursor: 'pointer' }}>
                      <X size={12} weight="bold" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 600, color: colors.textHeader }}>
                      {lang === 'zh' ? c.name.zh : c.name.en}
                    </div>
                    <div style={{ fontSize: 11, color: colors.text, opacity: 0.5 }}>
                      {t.recordCount.replace('{n}', String(count))}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {ctxMenu && (
        <CollectionContextMenu
          ctxMenu={ctxMenu}
          ctxSubmenu={ctxSubmenu}
          collection={collections.find(c => c.id === ctxMenu.collectionId)}
          colors={colors}
          t={t}
          isBuiltIn={ctxMenu.collectionId.startsWith('__')}
          onClose={() => { setCtxMenu(null); setCtxSubmenu(null); }}
          onSetSubmenu={setCtxSubmenu}
          onRename={() => handleCtxRename(ctxMenu.collectionId)}
          onCopy={() => handleCtxCopy(ctxMenu.collectionId)}
          onIcon={(iconId) => handleCtxIcon(ctxMenu.collectionId, iconId)}
          onColor={(color) => handleCtxColor(ctxMenu.collectionId, color)}
          onDelete={() => handleCtxDelete(ctxMenu.collectionId)}
        />
      )}
    </div>
  );
};

export default CollectionsView;
