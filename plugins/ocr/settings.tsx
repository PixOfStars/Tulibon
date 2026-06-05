declare const __PLUGIN_SDK__: any;
const sdk = (window as any).__PLUGIN_SDK__;
if (!sdk) throw new Error('Plugin SDK not available');

const React = sdk.lib.React; const ReactDOM = sdk.lib.ReactDOM; const PluginDropdown = sdk.lib.PluginDropdown;
const { useState, useEffect } = React;
const lang: 'zh' | 'en' = sdk.host.lang;
const colors: Record<string, string> = sdk.host.theme.colors;

const LANG_OPTIONS = [
  { value: 'zh-CN', label: '中文' },
  { value: 'en-US', label: 'English' },
];

function SettingsView() {
  const [ocrLang, setOcrLang] = useState('zh-CN');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    sdk.config.get('ocrLang').then((v: any) => { if (v) setOcrLang(v); });
  }, []);

  const handleSave = () => {
    sdk.config.set('ocrLang', ocrLang).then(() => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  const accentBtn: React.CSSProperties = {
    padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
    backgroundColor: colors.accent, color: '#000', fontSize: 12, fontWeight: 700,
  };

  return (
    <div style={{ padding: 4 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: colors.textHeader, marginBottom: 16 }}>
        {lang === 'zh' ? 'OCR 设置' : 'OCR Settings'}
      </h3>
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: colors.text, marginBottom: 6 }}>
          {lang === 'zh' ? '默认识别语言' : 'Default Language'}
        </label>
        <div style={{ minWidth: 180 }}>
          <PluginDropdown options={LANG_OPTIONS} value={ocrLang} onChange={setOcrLang} colors={colors} />
        </div>
      </div>
      <button onClick={handleSave} style={accentBtn}>
        {saved ? (lang === 'zh' ? '✓ 已保存' : '✓ Saved') : (lang === 'zh' ? '保存' : 'Save')}
      </button>
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
