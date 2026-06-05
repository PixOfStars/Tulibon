declare const __PLUGIN_SDK__: any;
const sdk = (window as any).__PLUGIN_SDK__;
if (!sdk) throw new Error('Plugin SDK not available');

const { React: R, ReactDOM } = sdk.lib;
const { useState, useEffect, useCallback } = R;
const lang: 'zh' | 'en' = sdk.host.lang;
const colors: Record<string, string> = sdk.host.theme.colors;

const T = {
  title: lang === 'zh' ? '收藏夹' : 'Collections',
  noCollections: lang === 'zh' ? '暂无收藏夹' : 'No collections yet',
  loading: lang === 'zh' ? '加载中…' : 'Loading…',
  newCollection: lang === 'zh' ? '新建收藏夹' : 'New Collection',
  nameZh: lang === 'zh' ? '中文名' : 'Name (ZH)',
  nameEn: lang === 'zh' ? '英文名' : 'Name (EN)',
  create: lang === 'zh' ? '创建' : 'Create',
  cancel: lang === 'zh' ? '取消' : 'Cancel',
  items: lang === 'zh' ? '条记录' : 'items',
  back: lang === 'zh' ? '← 返回' : '← Back',
  empty: lang === 'zh' ? '此收藏夹为空' : 'This collection is empty',
  removeFrom: lang === 'zh' ? '移出收藏夹' : 'Remove',
  summary: lang === 'zh' ? '摘要' : 'Summary',
  date: lang === 'zh' ? '日期' : 'Date',
};

function formatDate(ts: number) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString();
}

function CollectionsApp() {
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewCollection, setViewCollection] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [nameZh, setNameZh] = useState('');
  const [nameEn, setNameEn] = useState('');

  const loadCollections = useCallback(() => {
    setLoading(true);
    sdk.api.getCollections().then((c: any[]) => {
      setCollections(c || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { loadCollections(); }, [loadCollections]);

  const handleView = (col: any) => {
    setViewCollection(col);
    sdk.api.getCollectionRecords(col.id).then((r: any[]) => setRecords(r || []));
  };

  const handleBack = () => {
    setViewCollection(null);
    setRecords([]);
    loadCollections();
  };

  const handleCreate = () => {
    if (!nameZh.trim() && !nameEn.trim()) return;
    setShowCreate(false);
    setNameZh('');
    setNameEn('');
  };

  const handleRemove = (recordId: string) => {
    sdk.api.removeFromCollection(recordId, viewCollection.id).then(() => {
      setRecords((prev: any[]) => prev.filter((r: any) => r.id !== recordId));
    });
  };

  const inputStyle: React.CSSProperties = {
    flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid ' + colors.border,
    backgroundColor: colors.grayBg, color: colors.text, fontSize: 12, outline: 'none',
  };
  const accentBtn: React.CSSProperties = {
    padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
    backgroundColor: colors.accent, color: '#000', fontSize: 12, fontWeight: 700,
  };
  const ghostBtn = (danger?: boolean): React.CSSProperties => ({
    padding: '6px 12px', borderRadius: 6, border: '1px solid ' + (danger ? colors.error : colors.border),
    backgroundColor: 'transparent', color: danger ? colors.error : colors.text,
    fontSize: 11, fontWeight: 600, cursor: 'pointer',
  });
  const cardStyle: React.CSSProperties = {
    padding: 14, borderRadius: 10, backgroundColor: colors.grayBg,
    border: '1px solid ' + colors.border, cursor: 'pointer',
  };

  if (viewCollection) {
    const col = viewCollection;
    return React.createElement('div', { style: { padding: 20, height: '100%', overflow: 'auto' } },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 } },
        React.createElement('button', { onClick: handleBack, style: ghostBtn() }, T.back),
        React.createElement('h2', { style: { fontSize: 16, fontWeight: 700, color: colors.textHeader, margin: 0 } },
          lang === 'zh' ? col.name.zh : col.name.en),
        React.createElement('span', { style: { fontSize: 12, color: colors.text, opacity: 0.5 } }, records.length + ' ' + T.items)
      ),
      records.length === 0
        ? React.createElement('div', { style: { textAlign: 'center', padding: 40, color: colors.text, opacity: 0.5 } }, T.empty)
        : React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            records.map((rec: any) =>
              React.createElement('div', { key: rec.id, style: cardStyle },
                React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                  React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                    React.createElement('div', { style: { fontSize: 13, fontWeight: 600, color: colors.textHeader, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                      (rec.summary || '—').substring(0, 80)),
                    React.createElement('div', { style: { fontSize: 11, color: colors.text, opacity: 0.5 } }, formatDate(rec.createdAt))
                  ),
                  React.createElement('button', { onClick: () => handleRemove(rec.id), style: ghostBtn(true) }, T.removeFrom)
                )
              )
            )
          )
    );
  }

  return React.createElement('div', { style: { padding: 20, height: '100%', overflow: 'auto' } },
    React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 } },
      React.createElement('h2', { style: { fontSize: 16, fontWeight: 700, color: colors.textHeader, margin: 0 } }, T.title),
      React.createElement('button', { onClick: () => setShowCreate(!showCreate), style: accentBtn }, T.newCollection)
    ),
    showCreate && React.createElement('div', { style: { ...cardStyle, marginBottom: 16, display: 'flex', gap: 8, alignItems: 'flex-end' } },
      React.createElement('div', { style: { flex: 1 } },
        React.createElement('label', { style: { fontSize: 10, color: colors.text, opacity: 0.6, display: 'block', marginBottom: 4 } }, T.nameZh),
        React.createElement('input', { value: nameZh, onChange: (e: any) => setNameZh(e.target.value), placeholder: T.nameZh, style: inputStyle })
      ),
      React.createElement('div', { style: { flex: 1 } },
        React.createElement('label', { style: { fontSize: 10, color: colors.text, opacity: 0.6, display: 'block', marginBottom: 4 } }, T.nameEn),
        React.createElement('input', { value: nameEn, onChange: (e: any) => setNameEn(e.target.value), placeholder: T.nameEn, style: inputStyle })
      ),
      React.createElement('button', { onClick: handleCreate, style: accentBtn }, T.create),
      React.createElement('button', { onClick: () => setShowCreate(false), style: ghostBtn() }, T.cancel)
    ),
    loading
      ? React.createElement('div', { style: { textAlign: 'center', color: colors.text, opacity: 0.5, padding: 40 } }, T.loading)
      : collections.length === 0
        ? React.createElement('div', { style: { textAlign: 'center', padding: 40, color: colors.text, opacity: 0.5 } }, T.noCollections)
        : React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            collections.map((col: any) =>
              React.createElement('div', { key: col.id, onClick: () => handleView(col), style: cardStyle },
                React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
                  React.createElement('div', { style: { width: 28, height: 28, borderRadius: 8, backgroundColor: (col.color || '#6366F1') + '30', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 } }, '📁'),
                  React.createElement('div', null,
                    React.createElement('div', { style: { fontSize: 13, fontWeight: 600, color: colors.textHeader } }, lang === 'zh' ? col.name.zh : col.name.en),
                    React.createElement('div', { style: { fontSize: 11, color: colors.text, opacity: 0.5 } }, formatDate(col.createdAt))
                  )
                )
              )
            )
          )
  );
}

sdk.ui.mount = (container: HTMLElement) => {
  const root = (ReactDOM as any).createRoot(container);
  root.render(React.createElement(CollectionsApp));
  (sdk as any).ui._root = root;
};
sdk.ui.unmount = () => {
  if ((sdk as any).ui._root) { (sdk as any).ui._root.unmount(); delete (sdk as any).ui._root; }
};
