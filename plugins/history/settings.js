(function () {
  var sdk = window.__PLUGIN_SDK__;
  if (!sdk) return;

  var React = sdk.lib.React;
  var ReactDOM = sdk.lib.ReactDOM;
  var useState = React.useState;
  var useEffect = React.useEffect;

  var lang = sdk.host.lang;
  var colors = sdk.host.theme.colors;
  var T = {
    title: lang === 'zh' ? '历史记录设置' : 'History Settings',
    maxRecords: lang === 'zh' ? '最大显示条数' : 'Max Records',
    autoRecord: lang === 'zh' ? '自动保存分析记录' : 'Auto-save analysis records',
    sortOrder: lang === 'zh' ? '排序方式' : 'Sort Order',
    newest: lang === 'zh' ? '最新优先' : 'Newest First',
    oldest: lang === 'zh' ? '最早优先' : 'Oldest First',
    save: lang === 'zh' ? '保存' : 'Save',
    saved: lang === 'zh' ? '✓ 已保存' : '✓ Saved',
  };

  function SettingsView() {
    var _m = useState(50), maxRecords = _m[0], setMaxRecords = _m[1];
    var _a = useState(true), autoRecord = _a[0], setAutoRecord = _a[1];
    var _s = useState('newest'), sortOrder = _s[0], setSortOrder = _s[1];
    var _v = useState(false), saved = _v[0], setSaved = _v[1];

    useEffect(function () {
      sdk.config.get('maxRecords').then(function (v) { if (v !== null && v !== undefined) setMaxRecords(Number(v)); });
      sdk.config.get('autoRecord').then(function (v) { if (v !== null) setAutoRecord(Boolean(v)); });
      sdk.config.get('sortOrder').then(function (v) { if (v) setSortOrder(v); });
    }, []);

    var handleSave = function () {
      Promise.all([
        sdk.config.set('maxRecords', maxRecords),
        sdk.config.set('autoRecord', autoRecord),
        sdk.config.set('sortOrder', sortOrder),
      ]).then(function () {
        setSaved(true);
        setTimeout(function () { setSaved(false); }, 2000);
      });
    };

    var accentBtn = {
      padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
      backgroundColor: colors.accent, color: '#000', fontSize: 12, fontWeight: 700,
    };
    var inputStyle = {
      width: 80, padding: '6px 10px', borderRadius: 6, border: '1px solid ' + colors.border,
      backgroundColor: colors.grayBg, color: colors.text, fontSize: 12, outline: 'none',
    };
    var selectStyle = Object.assign({}, inputStyle, { width: 'auto' });
    var labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: colors.text, marginBottom: 6 };
    var rowStyle = { marginBottom: 18 };

    return React.createElement('div', { style: { padding: 4 } },
      React.createElement('h3', { style: { fontSize: 14, fontWeight: 700, color: colors.textHeader, marginBottom: 20 } }, T.title),

      React.createElement('div', { style: rowStyle },
        React.createElement('label', { style: labelStyle }, T.maxRecords),
        React.createElement('input', {
          type: 'number', value: maxRecords,
          onChange: function (e) { setMaxRecords(Number(e.target.value)); },
          min: 10, max: 5000, style: inputStyle,
        })
      ),

      React.createElement('div', { style: rowStyle },
        React.createElement('label', { style: labelStyle }, T.sortOrder),
        React.createElement('select', {
          value: sortOrder,
          onChange: function (e) { setSortOrder(e.target.value); },
          style: selectStyle,
        },
          React.createElement('option', { value: 'newest' }, T.newest),
          React.createElement('option', { value: 'oldest' }, T.oldest)
        )
      ),

      React.createElement('div', { style: rowStyle },
        React.createElement('label', { style: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: colors.text, cursor: 'pointer' } },
          React.createElement('input', {
            type: 'checkbox', checked: autoRecord,
            onChange: function (e) { setAutoRecord(e.target.checked); },
          }),
          T.autoRecord
        )
      ),

      React.createElement('button', { onClick: handleSave, style: accentBtn },
        saved ? T.saved : T.save
      )
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
