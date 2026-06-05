declare const __PLUGIN_SDK__: any;
const sdk = (window as any).__PLUGIN_SDK__;
if (!sdk) throw new Error('Plugin SDK not available');

const React = sdk.lib.React; const ReactDOM = sdk.lib.ReactDOM; const PluginDropdown = sdk.lib.PluginDropdown;
const { useState, useEffect } = React;
const lang: 'zh' | 'en' = sdk.host.lang;
const colors: Record<string, string> = sdk.host.theme.colors;

const T = {
  title: lang === 'zh' ? '历史记录设置' : 'History Settings',
  maxRecords: lang === 'zh' ? '最大显示条数' : 'Max Records',
  autoRecord: lang === 'zh' ? '自动保存分析记录' : 'Auto-save analysis records',
  sortOrder: lang === 'zh' ? '排序方式' : 'Sort Order',
  newest: lang === 'zh' ? '最新优先' : 'Newest First',
  oldest: lang === 'zh' ? '最早优先' : 'Oldest First',
  save: lang === 'zh' ? '保存' : 'Save',
  saved: lang === 'zh' ? '✓ 已保存' : '✓ Saved',
};

const SORT_OPTIONS = [
  { value: 'newest', label: T.newest },
  { value: 'oldest', label: T.oldest },
];

function SettingsView() {
  const [maxRecords, setMaxRecords] = useState(50);
  const [autoRecord, setAutoRecord] = useState(true);
  const [sortOrder, setSortOrder] = useState('newest');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    sdk.config.get('maxRecords').then((v: any) => { if (v !== null && v !== undefined) setMaxRecords(Number(v)); });
    sdk.config.get('autoRecord').then((v: any) => { if (v !== null) setAutoRecord(Boolean(v)); });
    sdk.config.get('sortOrder').then((v: any) => { if (v) setSortOrder(v); });
  }, []);

  const handleSave = () => {
    Promise.all([
      sdk.config.set('maxRecords', maxRecords),
      sdk.config.set('autoRecord', autoRecord),
      sdk.config.set('sortOrder', sortOrder),
    ]).then(() => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  const accentBtn: React.CSSProperties = {
    padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
    backgroundColor: colors.accent, color: '#000', fontSize: 12, fontWeight: 700,
  };
  const inputStyle: React.CSSProperties = {
    width: 80, padding: '6px 10px', borderRadius: 6, border: '1px solid ' + colors.border,
    backgroundColor: colors.grayBg, color: colors.text, fontSize: 12, outline: 'none',
  };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: colors.text, marginBottom: 6 };
  const rowStyle: React.CSSProperties = { marginBottom: 18 };

  return (
    <div style={{ padding: 4 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: colors.textHeader, marginBottom: 20 }}>{T.title}</h3>
      <div style={rowStyle}>
        <label style={labelStyle}>{T.maxRecords}</label>
        <input type='number' value={maxRecords} onChange={e => setMaxRecords(Number(e.target.value))}
          min={10} max={5000} style={inputStyle} />
      </div>
      <div style={rowStyle}>
        <label style={labelStyle}>{T.sortOrder}</label>
        <div style={{ minWidth: 180 }}>
          <PluginDropdown options={SORT_OPTIONS} value={sortOrder} onChange={setSortOrder} colors={colors} />
        </div>
      </div>
      <div style={rowStyle}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: colors.text, cursor: 'pointer' }}>
          <input type='checkbox' checked={autoRecord} onChange={e => setAutoRecord(e.target.checked)} />
          {T.autoRecord}
        </label>
      </div>
      <button onClick={handleSave} style={accentBtn}>{saved ? T.saved : T.save}</button>
    </div>
  );
}

sdk.ui.mount = (container: HTMLElement) => {
  const root = (ReactDOM as any).createRoot(container);
  root.render(<SettingsView />);
  (sdk as any).ui._root = root;
};
sdk.ui.unmount = () => {
  if ((sdk as any).ui._root) { (sdk as any).ui._root.unmount(); delete (sdk as any).ui._root; }
};
