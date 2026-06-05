declare const __PLUGIN_SDK__: any;
const sdk = (window as any).__PLUGIN_SDK__;
if (!sdk) throw new Error('Plugin SDK not available');

const React = sdk.lib.React; const ReactDOM = sdk.lib.ReactDOM; const PluginDropdown = sdk.lib.PluginDropdown;
const { useState, useEffect } = React;
const lang: 'zh' | 'en' = sdk.host.lang;
const colors: Record<string, string> = sdk.host.theme.colors;

const T = {
  title: lang === 'zh' ? '收藏夹设置' : 'Collections Settings',
  defaultView: lang === 'zh' ? '默认视图' : 'Default View',
  grid: lang === 'zh' ? '网格' : 'Grid',
  list: lang === 'zh' ? '列表' : 'List',
  showEmpty: lang === 'zh' ? '显示空收藏夹' : 'Show Empty Collections',
  confirmDelete: lang === 'zh' ? '删除前确认' : 'Confirm Before Delete',
  save: lang === 'zh' ? '保存' : 'Save',
  saved: lang === 'zh' ? '✓ 已保存' : '✓ Saved',
};

const VIEW_OPTIONS = [
  { value: 'list', label: T.list },
  { value: 'grid', label: T.grid },
];

function SettingsView() {
  const [defaultView, setDefaultView] = useState('list');
  const [showEmpty, setShowEmpty] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    sdk.config.get('defaultView').then((v: any) => { if (v) setDefaultView(v); });
    sdk.config.get('showEmpty').then((v: any) => { if (v !== null) setShowEmpty(Boolean(v)); });
    sdk.config.get('confirmDelete').then((v: any) => { if (v !== null) setConfirmDelete(Boolean(v)); });
  }, []);

  const handleSave = () => {
    Promise.all([
      sdk.config.set('defaultView', defaultView),
      sdk.config.set('showEmpty', showEmpty),
      sdk.config.set('confirmDelete', confirmDelete),
    ]).then(() => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  const accentBtn: React.CSSProperties = {
    padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
    backgroundColor: colors.accent, color: '#000', fontSize: 12, fontWeight: 700,
  };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: colors.text, marginBottom: 6 };
  const rowStyle: React.CSSProperties = { marginBottom: 18 };

  return (
    <div style={{ padding: 4 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: colors.textHeader, marginBottom: 20 }}>{T.title}</h3>
      <div style={rowStyle}>
        <label style={labelStyle}>{T.defaultView}</label>
        <div style={{ minWidth: 180 }}>
          <PluginDropdown options={VIEW_OPTIONS} value={defaultView} onChange={setDefaultView} colors={colors} />
        </div>
      </div>
      <div style={rowStyle}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: colors.text, cursor: 'pointer' }}>
          <input type='checkbox' checked={showEmpty} onChange={e => setShowEmpty(e.target.checked)} />
          {T.showEmpty}
        </label>
      </div>
      <div style={rowStyle}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: colors.text, cursor: 'pointer' }}>
          <input type='checkbox' checked={confirmDelete} onChange={e => setConfirmDelete(e.target.checked)} />
          {T.confirmDelete}
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
