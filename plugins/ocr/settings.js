(function () {
  var sdk = window.__PLUGIN_SDK__;
  if (!sdk) return;

  var React = sdk.lib.React;
  var ReactDOM = sdk.lib.ReactDOM;
  var useState = React.useState;
  var useEffect = React.useEffect;

  var lang = sdk.host.lang;
  var colors = sdk.host.theme.colors;

  function SettingsView() {
    var _l = useState('zh-CN'), ocrLang = _l[0], setOcrLang = _l[1];
    var _s = useState(false), saved = _s[0], setSaved = _s[1];

    useEffect(function () {
      sdk.config.get('ocrLang').then(function (v) { if (v) setOcrLang(v); });
    }, []);

    var handleSave = function () {
      sdk.config.set('ocrLang', ocrLang).then(function () {
        setSaved(true);
        setTimeout(function () { setSaved(false); }, 2000);
      });
    };

    var selectStyle = {
      padding: '6px 10px', borderRadius: 6, border: '1px solid ' + colors.border,
      backgroundColor: colors.grayBg, color: colors.text, fontSize: 12, outline: 'none',
    };
    var accentBtn = {
      padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
      backgroundColor: colors.accent, color: '#000', fontSize: 12, fontWeight: 700,
    };

    return React.createElement('div', { style: { padding: 4 } },
      React.createElement('h3', { style: { fontSize: 14, fontWeight: 700, color: colors.textHeader, marginBottom: 16 } },
        lang === 'zh' ? 'OCR 设置' : 'OCR Settings'),

      React.createElement('div', { style: { marginBottom: 20 } },
        React.createElement('label', { style: { display: 'block', fontSize: 12, fontWeight: 600, color: colors.text, marginBottom: 6 } },
          lang === 'zh' ? '默认识别语言' : 'Default Language'),
        React.createElement('select', { value: ocrLang, onChange: function (e) { setOcrLang(e.target.value); }, style: selectStyle },
          React.createElement('option', { value: 'zh-CN' }, '中文'),
          React.createElement('option', { value: 'en-US' }, 'English')
        )
      ),

      React.createElement('button', { onClick: handleSave, style: accentBtn }, saved ? (lang === 'zh' ? '✓ 已保存' : '✓ Saved') : (lang === 'zh' ? '保存' : 'Save'))
    );
  }

  sdk.ui.mount = function (container) {
    var root = ReactDOM.createRoot(container);
    root.render(React.createElement(SettingsView));
    sdk.ui._root = root;
  };
  sdk.ui.unmount = function () {
    if (sdk.ui._root) { sdk.ui._root.unmount(); delete sdk.ui._root; }
  };
})();
