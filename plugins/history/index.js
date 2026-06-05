(() => {
  const sdk = window.__PLUGIN_SDK__;
  if (!sdk) throw new Error("Plugin SDK not available");
  const React = sdk.lib.React;
  const ReactDOM = sdk.lib.ReactDOM = sdk.lib;
  const { useState, useEffect, useCallback } = React;
  const lang = sdk.host.lang;
  const colors = sdk.host.theme.colors;
  const T = {
    title: lang === "zh" ? "\u5386\u53F2\u8BB0\u5F55" : "History",
    noRecords: lang === "zh" ? "\u6682\u65E0\u5206\u6790\u8BB0\u5F55" : "No records yet",
    delete: lang === "zh" ? "\u5220\u9664" : "Delete",
    export: lang === "zh" ? "\u5BFC\u51FA" : "Export",
    confirmDelete: lang === "zh" ? "\u786E\u8BA4\u5220\u9664\uFF1F" : "Confirm delete?",
    loading: lang === "zh" ? "\u52A0\u8F7D\u4E2D\u2026" : "Loading\u2026",
    summary: lang === "zh" ? "\u6458\u8981" : "Summary",
    date: lang === "zh" ? "\u65E5\u671F" : "Date",
    tags: lang === "zh" ? "\u6807\u7B7E" : "Tags",
    mode: lang === "zh" ? "\u6A21\u5F0F" : "Mode"
  };
  function formatDate(ts) {
    if (!ts) return "";
    const d = new Date(ts);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  function HistoryApp() {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(null);
    const [maxRecords, setMaxRecords] = useState(50);
    const [sortOrder, setSortOrder] = useState("newest");
    const loadRecords = useCallback(() => {
      setLoading(true);
      Promise.all([
        sdk.api.getRecords(),
        sdk.config.get("maxRecords"),
        sdk.config.get("sortOrder")
      ]).then(([r, max, sort]) => {
        const list = r || [];
        const maxN = Number(max) || 50;
        const sortS = sort || "newest";
        setMaxRecords(maxN);
        setSortOrder(sortS);
        list.sort((a, b) => sortS === "newest" ? (b.createdAt || 0) - (a.createdAt || 0) : (a.createdAt || 0) - (b.createdAt || 0));
        setRecords(list.slice(0, maxN));
        setLoading(false);
      }).catch(() => setLoading(false));
    }, []);
    useEffect(() => {
      loadRecords();
    }, [loadRecords]);
    const handleDelete = (id) => {
      if (deleting === id) {
        sdk.api.deleteRecord(id).then(() => {
          setDeleting(null);
          loadRecords();
        });
      } else {
        setDeleting(id);
      }
    };
    const handleExport = (id) => sdk.api.exportRecord(id, "md");
    const btnStyle = (danger) => ({
      padding: "4px 10px",
      borderRadius: 6,
      border: "none",
      cursor: "pointer",
      fontSize: 11,
      fontWeight: 600,
      backgroundColor: danger ? colors.errorBg : colors.accentBg,
      color: danger ? colors.error : colors.accent
    });
    return /* @__PURE__ */ React.createElement("div", { style: { padding: 20, height: "100%", overflow: "auto" } }, /* @__PURE__ */ React.createElement("h2", { style: { fontSize: 16, fontWeight: 700, color: colors.textHeader, marginBottom: 16 } }, T.title), loading ? /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", color: colors.text, opacity: 0.5, padding: 40 } }, T.loading) : records.length === 0 ? /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", color: colors.text, opacity: 0.5, padding: 40 } }, T.noRecords) : /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8 } }, records.map((rec) => /* @__PURE__ */ React.createElement("div", { key: rec.id, style: { padding: 12, borderRadius: 10, backgroundColor: colors.grayBg, border: "1px solid " + colors.border } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 0 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: colors.textHeader, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, (rec.summary || T.noRecords).substring(0, 80)), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: colors.text, opacity: 0.5, display: "flex", gap: 12 } }, /* @__PURE__ */ React.createElement("span", null, T.mode, ": ", rec.mode || "\u2014"), /* @__PURE__ */ React.createElement("span", null, formatDate(rec.createdAt)), rec.tags?.length > 0 && /* @__PURE__ */ React.createElement("span", null, T.tags, ": ", rec.tags.join(", ")))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, flexShrink: 0, marginLeft: 12 } }, /* @__PURE__ */ React.createElement("button", { onClick: () => handleExport(rec.id), style: btnStyle() }, T.export), /* @__PURE__ */ React.createElement("button", { onClick: () => handleDelete(rec.id), style: btnStyle(true) }, deleting === rec.id ? T.confirmDelete : T.delete)))))));
  }
  sdk.ui.mount = (container) => {
    const root = ReactDOM.createRoot(container);
    root.render(/* @__PURE__ */ React.createElement(HistoryApp, null));
    sdk.ui._root = root;
  };
  sdk.ui.unmount = () => {
    if (sdk.ui._root) {
      sdk.ui._root.unmount();
      delete sdk.ui._root;
    }
  };
})();
