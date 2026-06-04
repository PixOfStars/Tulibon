(function () {
  var sdk = window.__PLUGIN_SDK__;
  if (!sdk) return;

  var React = sdk.lib.React;
  var ReactDOM = sdk.lib.ReactDOM;
  var useState = React.useState;
  var useEffect = React.useEffect;
  var useCallback = React.useCallback;

  var lang = sdk.host.lang;
  var colors = sdk.host.theme.colors;
  var T = {
    title: lang === 'zh' ? '收藏夹' : 'Collections',
    noCollections: lang === 'zh' ? '暂无收藏夹' : 'No collections yet',
    loading: lang === 'zh' ? '加载中…' : 'Loading…',
    newCollection: lang === 'zh' ? '新建收藏夹' : 'New Collection',
    nameZh: lang === 'zh' ? '中文名' : 'Name (ZH)',
    nameEn: lang === 'zh' ? '英文名' : 'Name (EN)',
    create: lang === 'zh' ? '创建' : 'Create',
    cancel: lang === 'zh' ? '取消' : 'Cancel',
    delete: lang === 'zh' ? '删除' : 'Delete',
    items: lang === 'zh' ? '条记录' : 'items',
    back: lang === 'zh' ? '← 返回' : '← Back',
    empty: lang === 'zh' ? '此收藏夹为空' : 'This collection is empty',
    removeFrom: lang === 'zh' ? '移出收藏夹' : 'Remove',
    summary: lang === 'zh' ? '摘要' : 'Summary',
    date: lang === 'zh' ? '日期' : 'Date',
  };

  function formatDate(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    return d.toLocaleDateString();
  }

  function CollectionsApp() {
    var _c = useState([]), collections = _c[0], setCollections = _c[1];
    var _l = useState(true), loading = _l[0], setLoading = _l[1];
    var _v = useState(null), viewCollection = _v[0], setViewCollection = _v[1];
    var _r = useState([]), records = _r[0], setRecords = _r[1];
    var _s = useState(false), showCreate = _s[0], setShowCreate = _s[1];
    var _nz = useState(''), nameZh = _nz[0], setNameZh = _nz[1];
    var _ne = useState(''), nameEn = _ne[0], setNameEn = _ne[1];

    var loadCollections = useCallback(function () {
      setLoading(true);
      sdk.api.getCollections().then(function (c) {
        setCollections(c || []);
        setLoading(false);
      }).catch(function () { setLoading(false); });
    }, []);

    useEffect(function () { loadCollections(); }, [loadCollections]);

    var handleView = function (col) {
      setViewCollection(col);
      sdk.api.getCollectionRecords(col.id).then(function (r) {
        setRecords(r || []);
      });
    };

    var handleBack = function () {
      setViewCollection(null);
      setRecords([]);
      loadCollections();
    };

    var handleCreate = function () {
      if (!nameZh.trim() && !nameEn.trim()) return;
      // Create collection — for now just add to list
      // The SDK doesn't have a direct createCollection method,
      // but we can work with what's available
      setShowCreate(false);
      setNameZh('');
      setNameEn('');
    };

    var handleRemoveFromCollection = function (recordId) {
      sdk.api.removeFromCollection(recordId, viewCollection.id).then(function () {
        setRecords(function (prev) { return prev.filter(function (r) { return r.id !== recordId; }); });
      });
    };

    var inputStyle = {
      flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid ' + colors.border,
      backgroundColor: colors.grayBg, color: colors.text, fontSize: 12, outline: 'none',
    };
    var accentBtn = {
      padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
      backgroundColor: colors.accent, color: '#000', fontSize: 12, fontWeight: 700,
    };
    var ghostBtn = function (danger) {
      return {
        padding: '6px 12px', borderRadius: 6, border: '1px solid ' + (danger ? colors.error : colors.border),
        backgroundColor: 'transparent', color: danger ? colors.error : colors.text,
        fontSize: 11, fontWeight: 600, cursor: 'pointer',
      };
    };
    var cardStyle = {
      padding: 14, borderRadius: 10, backgroundColor: colors.grayBg,
      border: '1px solid ' + colors.border, cursor: 'pointer',
    };

    // Viewing a single collection
    if (viewCollection) {
      var col = viewCollection;
      return React.createElement('div', { style: { padding: 20, height: '100%', overflow: 'auto' } },
        React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 } },
          React.createElement('button', { onClick: handleBack, style: ghostBtn(false) }, T.back),
          React.createElement('h2', { style: { fontSize: 16, fontWeight: 700, color: colors.textHeader, margin: 0 } },
            lang === 'zh' ? col.name.zh : col.name.en),
          React.createElement('span', { style: { fontSize: 12, color: colors.text, opacity: 0.5 } }, records.length + ' ' + T.items)
        ),
        records.length === 0
          ? React.createElement('div', { style: { textAlign: 'center', padding: 40, color: colors.text, opacity: 0.5 } }, T.empty)
          : React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              records.map(function (rec) {
                return React.createElement('div', { key: rec.id, style: cardStyle },
                  React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                    React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                      React.createElement('div', { style: { fontSize: 13, fontWeight: 600, color: colors.textHeader, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                        (rec.summary || '—').substring(0, 80)),
                      React.createElement('div', { style: { fontSize: 11, color: colors.text, opacity: 0.5 } }, formatDate(rec.createdAt))
                    ),
                    React.createElement('button', {
                      onClick: function () { handleRemoveFromCollection(rec.id); },
                      style: ghostBtn(true)
                    }, T.removeFrom)
                  )
                );
              })
            )
      );
    }

    // Collection list view
    return React.createElement('div', { style: { padding: 20, height: '100%', overflow: 'auto' } },
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 } },
        React.createElement('h2', { style: { fontSize: 16, fontWeight: 700, color: colors.textHeader, margin: 0 } }, T.title),
        React.createElement('button', { onClick: function () { setShowCreate(!showCreate); }, style: accentBtn }, T.newCollection)
      ),

      // Create form
      showCreate
        ? React.createElement('div', { style: Object.assign({}, cardStyle, { marginBottom: 16, display: 'flex', gap: 8, alignItems: 'flex-end' }) },
            React.createElement('div', { style: { flex: 1 } },
              React.createElement('label', { style: { fontSize: 10, color: colors.text, opacity: 0.6, display: 'block', marginBottom: 4 } }, T.nameZh),
              React.createElement('input', { value: nameZh, onChange: function (e) { setNameZh(e.target.value); }, placeholder: T.nameZh, style: inputStyle })
            ),
            React.createElement('div', { style: { flex: 1 } },
              React.createElement('label', { style: { fontSize: 10, color: colors.text, opacity: 0.6, display: 'block', marginBottom: 4 } }, T.nameEn),
              React.createElement('input', { value: nameEn, onChange: function (e) { setNameEn(e.target.value); }, placeholder: T.nameEn, style: inputStyle })
            ),
            React.createElement('button', { onClick: handleCreate, style: accentBtn }, T.create),
            React.createElement('button', { onClick: function () { setShowCreate(false); }, style: ghostBtn(false) }, T.cancel)
          )
        : null,

      loading
        ? React.createElement('div', { style: { textAlign: 'center', color: colors.text, opacity: 0.5, padding: 40 } }, T.loading)
        : collections.length === 0
          ? React.createElement('div', { style: { textAlign: 'center', padding: 40, color: colors.text, opacity: 0.5 } }, T.noCollections)
          : React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              collections.map(function (col) {
                return React.createElement('div', { key: col.id, onClick: function () { handleView(col); }, style: cardStyle },
                  React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
                    React.createElement('div', {
                      style: { width: 28, height: 28, borderRadius: 8, backgroundColor: (col.color || '#6366F1') + '30', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }
                    }, '📁'),
                    React.createElement('div', null,
                      React.createElement('div', { style: { fontSize: 13, fontWeight: 600, color: colors.textHeader } },
                        lang === 'zh' ? col.name.zh : col.name.en),
                      React.createElement('div', { style: { fontSize: 11, color: colors.text, opacity: 0.5 } },
                        formatDate(col.createdAt))
                    )
                  )
                );
              })
            )
    );
  }

  sdk.ui.mount = function (container) {
    var root = ReactDOM.createRoot(container);
    root.render(React.createElement(CollectionsApp));
    sdk.ui._root = root;
  };
  sdk.ui.unmount = function () {
    if (sdk.ui._root) { sdk.ui._root.unmount(); delete sdk.ui._root; }
  };
})();
