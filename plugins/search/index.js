(function () {
  var sdk = window.__PLUGIN_SDK__;
  if (!sdk) return;

  var React = sdk.lib.React;
  var ReactDOM = sdk.lib.ReactDOM;
  var useState = React.useState;
  var useEffect = React.useEffect;
  var useRef = React.useRef;

  var lang = sdk.host.lang;
  var colors = sdk.host.theme.colors;
  var T = {
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

  function formatDate(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    return d.toLocaleDateString();
  }

  function highlight(text, query) {
    if (!query || !text) return text || '';
    var idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    var before = text.substring(0, idx);
    var match = text.substring(idx, idx + query.length);
    var after = text.substring(idx + query.length);
    return before + '{{HL_START}}' + match + '{{HL_END}}' + after;
  }

  function SearchApp() {
    var _q = useState(''), query = _q[0], setQuery = _q[1];
    var _r = useState([]), results = _r[0], setResults = _r[1];
    var _l = useState(false), loading = _l[0], setLoading = _l[1];
    var _s = useState(false), searched = _s[0], setSearched = _s[1];
    var inputRef = useRef(null);

    useEffect(function () {
      if (inputRef.current) inputRef.current.focus();
    }, []);

    var handleSearch = function () {
      if (!query.trim()) return;
      setLoading(true);
      sdk.api.searchRecords(query.trim()).then(function (r) {
        setResults(r || []);
        setSearched(true);
        setLoading(false);
      }).catch(function () { setLoading(false); });
    };

    var inputStyle = {
      flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid ' + colors.border,
      backgroundColor: colors.grayBg, color: colors.text, fontSize: 14, outline: 'none',
    };

    var accentBtn = {
      padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
      backgroundColor: colors.accent, color: '#000', fontSize: 13, fontWeight: 700,
    };

    return React.createElement('div', { style: { padding: 20, height: '100%', display: 'flex', flexDirection: 'column' } },
      React.createElement('h2', { style: { fontSize: 16, fontWeight: 700, color: colors.textHeader, marginBottom: 16 } }, T.title),
      React.createElement('div', { style: { display: 'flex', gap: 8, marginBottom: 20 } },
        React.createElement('input', {
          ref: inputRef, type: 'text', value: query,
          onChange: function (e) { setQuery(e.target.value); },
          onKeyDown: function (e) { if (e.key === 'Enter') handleSearch(); },
          placeholder: T.placeholder, style: inputStyle,
        }),
        React.createElement('button', { onClick: handleSearch, style: accentBtn }, T.title)
      ),
      loading
        ? React.createElement('div', { style: { textAlign: 'center', padding: 40, color: colors.text, opacity: 0.5 } }, T.loading)
        : searched && results.length === 0
          ? React.createElement('div', { style: { textAlign: 'center', padding: 40, color: colors.text, opacity: 0.5 } }, T.noResults)
          : !searched
            ? React.createElement('div', { style: { textAlign: 'center', padding: 40, color: colors.text, opacity: 0.4 } }, T.hint)
            : React.createElement('div', null,
                React.createElement('div', { style: { fontSize: 12, color: colors.text, opacity: 0.5, marginBottom: 12 } },
                  results.length + ' ' + T.results),
                React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, flex: 1, overflow: 'auto' } },
                  results.map(function (rec) {
                    var hlSummary = highlight((rec.summary || '').substring(0, 100), query.trim());
                    var parts = hlSummary.split('{{HL_START}}');
                    var summaryNodes = [];
                    if (parts.length === 1) {
                      summaryNodes.push(parts[0]);
                    } else {
                      parts.forEach(function (part) {
                        var sub = part.split('{{HL_END}}');
                        if (sub.length === 2) {
                          summaryNodes.push(React.createElement('mark', { style: { backgroundColor: colors.accent + '40', color: colors.accent, borderRadius: 2, padding: '0 2px' } }, sub[0]));
                          summaryNodes.push(sub[1]);
                        } else {
                          summaryNodes.push(sub[0]);
                        }
                      });
                    }
                    return React.createElement('div', {
                      key: rec.id,
                      style: { padding: 12, borderRadius: 10, backgroundColor: colors.grayBg, border: '1px solid ' + colors.border }
                    },
                      React.createElement('div', { style: { fontSize: 13, fontWeight: 600, color: colors.textHeader, marginBottom: 4 } },
                        summaryNodes.length > 0 ? summaryNodes : (rec.summary || '—').substring(0, 80)),
                      React.createElement('div', { style: { fontSize: 11, color: colors.text, opacity: 0.5, display: 'flex', gap: 12 } },
                        React.createElement('span', null, T.mode + ': ' + (rec.mode || '—')),
                        React.createElement('span', null, formatDate(rec.createdAt)),
                        rec.tags && rec.tags.length > 0
                          ? React.createElement('span', null, T.tags + ': ' + rec.tags.join(', '))
                          : null
                      )
                    );
                  })
                )
              )
    );
  }

  sdk.ui.mount = function (container) {
    var root = ReactDOM.createRoot(container);
    root.render(React.createElement(SearchApp));
    sdk.ui._root = root;
  };
  sdk.ui.unmount = function () {
    if (sdk.ui._root) { sdk.ui._root.unmount(); delete sdk.ui._root; }
  };
})();
