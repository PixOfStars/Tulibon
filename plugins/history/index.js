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

  function formatDate(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function HistoryApp() {
    var _r = useState([]), records = _r[0], setRecords = _r[1];
    var _l = useState(true), loading = _l[0], setLoading = _l[1];
    var _d = useState(null), deleting = _d[0], setDeleting = _d[1];
    var _m = useState(50), maxRecords = _m[0], setMaxRecords = _m[1];
    var _s = useState('newest'), sortOrder = _s[0], setSortOrder = _s[1];

    var loadRecords = useCallback(function () {
      setLoading(true);
      Promise.all([
        sdk.api.getRecords(),
        sdk.config.get('maxRecords'),
        sdk.config.get('sortOrder'),
      ]).then(function (_a) {
        var r = _a[0] || [];
        var max = Number(_a[1]) || 50;
        var sort = _a[2] || 'newest';
        setMaxRecords(max);
        setSortOrder(sort);
        // Sort
        r.sort(function (a, b) {
          return sort === 'newest'
            ? (b.createdAt || 0) - (a.createdAt || 0)
            : (a.createdAt || 0) - (b.createdAt || 0);
        });
        // Limit
        setRecords(r.slice(0, max));
        setLoading(false);
      }).catch(function () { setLoading(false); });
    }, []);

    useEffect(function () { loadRecords(); }, [loadRecords]);

    var handleDelete = function (id) {
      if (deleting === id) {
        sdk.api.deleteRecord(id).then(function () {
          setDeleting(null);
          loadRecords();
        });
      } else {
        setDeleting(id);
      }
    };

    var handleExport = function (id) {
      sdk.api.exportRecord(id, 'md');
    };

    var btnStyle = function (danger) {
      return {
        padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
        fontSize: 11, fontWeight: 600,
        backgroundColor: danger ? colors.errorBg : colors.accentBg,
        color: danger ? colors.error : colors.accent,
      };
    };

    return React.createElement('div', { style: { padding: 20, height: '100%', overflow: 'auto' } },
      React.createElement('h2', { style: { fontSize: 16, fontWeight: 700, color: colors.textHeader, marginBottom: 16 } }, T.title),
      loading
        ? React.createElement('div', { style: { textAlign: 'center', color: colors.text, opacity: 0.5, padding: 40 } }, T.loading)
        : records.length === 0
          ? React.createElement('div', { style: { textAlign: 'center', color: colors.text, opacity: 0.5, padding: 40 } }, T.noRecords)
          : React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              records.map(function (rec) {
                return React.createElement('div', {
                  key: rec.id,
                  style: { padding: 12, borderRadius: 10, backgroundColor: colors.grayBg, border: '1px solid ' + colors.border }
                },
                  React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' } },
                    React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                      React.createElement('div', { style: { fontSize: 13, fontWeight: 600, color: colors.textHeader, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                        (rec.summary || T.noRecords).substring(0, 80)),
                      React.createElement('div', { style: { fontSize: 11, color: colors.text, opacity: 0.5, display: 'flex', gap: 12 } },
                        React.createElement('span', null, T.mode + ': ' + (rec.mode || '—')),
                        React.createElement('span', null, formatDate(rec.createdAt)),
                        rec.tags && rec.tags.length > 0
                          ? React.createElement('span', null, T.tags + ': ' + rec.tags.join(', '))
                          : null
                      )
                    ),
                    React.createElement('div', { style: { display: 'flex', gap: 6, flexShrink: 0, marginLeft: 12 } },
                      React.createElement('button', { onClick: function () { handleExport(rec.id); }, style: btnStyle(false) }, T.export),
                      React.createElement('button', { onClick: function () { handleDelete(rec.id); }, style: btnStyle(true) },
                        deleting === rec.id ? T.confirmDelete : T.delete
                      )
                    )
                  )
                );
              })
            )
    );
  }

  sdk.ui.mount = function (container) {
    var root = ReactDOM.createRoot(container);
    root.render(React.createElement(HistoryApp));
    sdk.ui._root = root;
  };
  sdk.ui.unmount = function () {
    if (sdk.ui._root) { sdk.ui._root.unmount(); delete sdk.ui._root; }
  };
})();
