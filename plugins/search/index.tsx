declare const __PLUGIN_SDK__: any;
const sdk = (window as any).__PLUGIN_SDK__;
if (!sdk) throw new Error('Plugin SDK not available');

const React = sdk.lib.React; const ReactDOM = sdk.lib.ReactDOM = sdk.lib;
const { useState, useEffect, useRef } = React;
const lang: 'zh' | 'en' = sdk.host.lang;
const colors: Record<string, string> = sdk.host.theme.colors;

const T = {
  title: lang === 'zh' ? '搜索' : 'Search',
  placeholder: lang === 'zh' ? '输入关键词搜索…' : 'Search records…',
  noResults: lang === 'zh' ? '未找到匹配记录' : 'No matching records',
  results: lang === 'zh' ? '条结果' : 'results',
  loading: lang === 'zh' ? '搜索中…' : 'Searching…',
  hint: lang === 'zh' ? '输入关键词搜索摘要和标签' : 'Search summaries and tags',
  summary: lang === 'zh' ? '摘要' : 'Summary',
  tags: lang === 'zh' ? '标签' : 'Tags',
  mode: lang === 'zh' ? '模式' : 'Mode',
  date: lang === 'zh' ? '日期' : 'Date',
};

function formatDate(ts: number) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString();
}

function highlight(text: string, q: string): any[] {
  if (!q || !text) return [text || ''];
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return [text];
  const result: any[] = [];
  if (idx > 0) result.push(text.substring(0, idx));
  result.push(React.createElement('mark', { style: { backgroundColor: colors.accent + '40', color: colors.accent, borderRadius: 2, padding: '0 2px' } }, text.substring(idx, idx + q.length)));
  const after = text.substring(idx + q.length);
  const rest = highlight(after, q);
  return result.concat(rest);
}

function SearchApp() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSearch = () => {
    if (!query.trim()) return;
    setLoading(true);
    sdk.api.searchRecords(query.trim()).then((r: any[]) => {
      setResults(r || []);
      setSearched(true);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  const inputStyle: React.CSSProperties = {
    flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid ' + colors.border,
    backgroundColor: colors.grayBg, color: colors.text, fontSize: 14, outline: 'none',
  };
  const accentBtn: React.CSSProperties = {
    padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
    backgroundColor: colors.accent, color: '#000', fontSize: 13, fontWeight: 700,
  };

  return (
    <div style={{ padding: 20, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: colors.textHeader, marginBottom: 16 }}>{T.title}</h2>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <input ref={inputRef} type='text' value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
          placeholder={T.placeholder} style={inputStyle} />
        <button onClick={handleSearch} style={accentBtn}>{T.title}</button>
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: colors.text, opacity: 0.5 }}>{T.loading}</div>
      ) : searched && results.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: colors.text, opacity: 0.5 }}>{T.noResults}</div>
      ) : !searched ? (
        <div style={{ textAlign: 'center', padding: 40, color: colors.text, opacity: 0.4 }}>{T.hint}</div>
      ) : (
        <div>
          <div style={{ fontSize: 12, color: colors.text, opacity: 0.5, marginBottom: 12 }}>{results.length} {T.results}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, overflow: 'auto' }}>
            {results.map((rec: any) => (
              <div key={rec.id} style={{ padding: 12, borderRadius: 10, backgroundColor: colors.grayBg, border: '1px solid ' + colors.border }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: colors.textHeader, marginBottom: 4 }}>
                  {highlight((rec.summary || '').substring(0, 100), query.trim())}
                </div>
                <div style={{ fontSize: 11, color: colors.text, opacity: 0.5, display: 'flex', gap: 12 }}>
                  <span>{T.mode}: {rec.mode || '—'}</span>
                  <span>{formatDate(rec.createdAt)}</span>
                  {rec.tags?.length > 0 && <span>{T.tags}: {rec.tags.join(', ')}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

sdk.ui.mount = (container: HTMLElement) => {
  const root = (ReactDOM as any).createRoot(container);
  root.render(<SearchApp />);
  (sdk as any).ui._root = root;
};
sdk.ui.unmount = () => {
  if ((sdk as any).ui._root) { (sdk as any).ui._root.unmount(); delete (sdk as any).ui._root; }
};
