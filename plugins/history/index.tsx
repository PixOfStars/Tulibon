declare const __PLUGIN_SDK__: any;
const sdk = (window as any).__PLUGIN_SDK__;
if (!sdk) throw new Error('Plugin SDK not available');

const React = sdk.lib.React; const ReactDOM = sdk.lib.ReactDOM = sdk.lib;
const { useState, useEffect, useCallback } = React;
const lang: 'zh' | 'en' = sdk.host.lang;
const colors: Record<string, string> = sdk.host.theme.colors;

const T = {
  title: lang === 'zh' ? '历史记录' : 'History',
  noRecords: lang === 'zh' ? '暂无分析记录' : 'No records yet',
  delete: lang === 'zh' ? '删除' : 'Delete',
  export: lang === 'zh' ? '导出' : 'Export',
  confirmDelete: lang === 'zh' ? '确认删除？' : 'Confirm delete?',
  loading: lang === 'zh' ? '加载中…' : 'Loading…',
  summary: lang === 'zh' ? '摘要' : 'Summary',
  date: lang === 'zh' ? '日期' : 'Date',
  tags: lang === 'zh' ? '标签' : 'Tags',
  mode: lang === 'zh' ? '模式' : 'Mode',
};

function formatDate(ts: number) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function HistoryApp() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [maxRecords, setMaxRecords] = useState(50);
  const [sortOrder, setSortOrder] = useState('newest');

  const loadRecords = useCallback(() => {
    setLoading(true);
    Promise.all([
      sdk.api.getRecords(),
      sdk.config.get('maxRecords'),
      sdk.config.get('sortOrder'),
    ]).then(([r, max, sort]: [any[], any, any]) => {
      const list = r || [];
      const maxN = Number(max) || 50;
      const sortS = sort || 'newest';
      setMaxRecords(maxN);
      setSortOrder(sortS);
      list.sort((a, b) => sortS === 'newest'
        ? (b.createdAt || 0) - (a.createdAt || 0)
        : (a.createdAt || 0) - (b.createdAt || 0));
      setRecords(list.slice(0, maxN));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  const handleDelete = (id: string) => {
    if (deleting === id) {
      sdk.api.deleteRecord(id).then(() => { setDeleting(null); loadRecords(); });
    } else {
      setDeleting(id);
    }
  };

  const handleExport = (id: string) => sdk.api.exportRecord(id, 'md');

  const btnStyle = (danger?: boolean): React.CSSProperties => ({
    padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
    fontSize: 11, fontWeight: 600,
    backgroundColor: danger ? colors.errorBg : colors.accentBg,
    color: danger ? colors.error : colors.accent,
  });

  return (
    <div style={{ padding: 20, height: '100%', overflow: 'auto' }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: colors.textHeader, marginBottom: 16 }}>{T.title}</h2>
      {loading ? (
        <div style={{ textAlign: 'center', color: colors.text, opacity: 0.5, padding: 40 }}>{T.loading}</div>
      ) : records.length === 0 ? (
        <div style={{ textAlign: 'center', color: colors.text, opacity: 0.5, padding: 40 }}>{T.noRecords}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {records.map((rec: any) => (
            <div key={rec.id} style={{ padding: 12, borderRadius: 10, backgroundColor: colors.grayBg, border: '1px solid ' + colors.border }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: colors.textHeader, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {(rec.summary || T.noRecords).substring(0, 80)}
                  </div>
                  <div style={{ fontSize: 11, color: colors.text, opacity: 0.5, display: 'flex', gap: 12 }}>
                    <span>{T.mode}: {rec.mode || '—'}</span>
                    <span>{formatDate(rec.createdAt)}</span>
                    {rec.tags?.length > 0 && <span>{T.tags}: {rec.tags.join(', ')}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 12 }}>
                  <button onClick={() => handleExport(rec.id)} style={btnStyle()}>{T.export}</button>
                  <button onClick={() => handleDelete(rec.id)} style={btnStyle(true)}>
                    {deleting === rec.id ? T.confirmDelete : T.delete}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

sdk.ui.mount = (container: HTMLElement) => {
  const root = (ReactDOM as any).createRoot(container);
  root.render(<HistoryApp />);
  (sdk as any).ui._root = root;
};
sdk.ui.unmount = () => {
  if ((sdk as any).ui._root) { (sdk as any).ui._root.unmount(); delete (sdk as any).ui._root; }
};
