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
    title: lang === 'zh' ? '收藏夹设置' : 'Collections Settings',
    defaultView: lang === 'zh' ? '默认视图' : 'Default View',
    grid: lang === 'zh' ? '网格' : 'Grid',
    list: lang === 'zh' ? '列表' : 'List',
    showEmpty: lang === 'zh' ? '显示空收藏夹' : 'Show Empty Collections',
    confirmDelete: lang === 'zh' ? '删除前确认' : 'Confirm Before Delete',
    save: lang === 'zh' ? '保存' : 'Save',
    saved: lang === 'zh' ? '✓ 已保存' : '✓ Saved',
  };

  function SettingsView() {
    var _v = useState('list'), defaultView = _v[0], setDefaultView = _v[1];
    var _e = useState(true), showEmpty = _e[0], setShowEmpty = _e[1];
    var _c = useState(true), confirmDelete = _c[0], setConfirmDelete = _c[1];
    var _s = useState(false), saved = _s[0], setSaved = _s[1];

    useEffect(function () {
      sdk.config.get('defaultView').then(function (v) { if (v) setDefaultView(v); });
      sdk.config.get('showEmpty').then(function (v) { if (v !== null) setShowEmpty(Boolean(v)); });
      sdk.config.get('confirmDelete').then(function (v) { if (v !== null) setConfirmDelete(Boolean(v)); });
    }, []);

    var handleSave = function () {
      Promise.all([
        sdk.config.set('defaultView', defaultView),
        sdk.config.set('showEmpty', showEmpty),
        sdk.config.set('confirmDelete', confirmDelete),
      ]).then(function () {
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
    var labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: colors.text, marginBottom: 6 };
    var rowStyle = { marginBottom: 18 };

    return React.createElement('div', { style: { padding: 4 } },
      React.createElement('h3', { style: { fontSize: 14, fontWeight: 700, color: colors.textHeader, marginBottom: 20 } }, T.title),

      React.createElement('div', { style: rowStyle },
        React.createElement('label', { style: labelStyle }, T.defaultView),
        React.createElement('select', {
          value: defaultView,
          onChange: function (e) { setDefaultView(e.target.value); },
          style: selectStyle,
        },
          React.createElement('option', { value: 'list' }, T.list),
          React.createElement('option', { value: 'grid' }, T.grid)
        )
      ),

      React.createElement('div', { style: rowStyle },
        React.createElement('label', { style: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: colors.text, cursor: 'pointer' } },
          React.createElement('input', { type: 'checkbox', checked: showEmpty, onChange: function (e) { setShowEmpty(e.target.checked); } }),
          T.showEmpty
        )
      ),

      React.createElement('div', { style: rowStyle },
        React.createElement('label', { style: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: colors.text, cursor: 'pointer' } },
          React.createElement('input', { type: 'checkbox', checked: confirmDelete, onChange: function (e) { setConfirmDelete(e.target.checked); } }),
          T.confirmDelete
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
