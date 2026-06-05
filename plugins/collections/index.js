(() => {
  const sdk = window.__PLUGIN_SDK__;
  if (!sdk) throw new Error("Plugin SDK not available");
  const { React: R, ReactDOM } = sdk.lib;
  const { useState, useEffect, useCallback } = R;
  const lang = sdk.host.lang;
  const colors = sdk.host.theme.colors;
  const T = {
    title: lang === "zh" ? "\u6536\u85CF\u5939" : "Collections",
    noCollections: lang === "zh" ? "\u6682\u65E0\u6536\u85CF\u5939" : "No collections yet",
    loading: lang === "zh" ? "\u52A0\u8F7D\u4E2D\u2026" : "Loading\u2026",
    newCollection: lang === "zh" ? "\u65B0\u5EFA\u6536\u85CF\u5939" : "New Collection",
    nameZh: lang === "zh" ? "\u4E2D\u6587\u540D" : "Name (ZH)",
    nameEn: lang === "zh" ? "\u82F1\u6587\u540D" : "Name (EN)",
    create: lang === "zh" ? "\u521B\u5EFA" : "Create",
    cancel: lang === "zh" ? "\u53D6\u6D88" : "Cancel",
    items: lang === "zh" ? "\u6761\u8BB0\u5F55" : "items",
    back: lang === "zh" ? "\u2190 \u8FD4\u56DE" : "\u2190 Back",
    empty: lang === "zh" ? "\u6B64\u6536\u85CF\u5939\u4E3A\u7A7A" : "This collection is empty",
    removeFrom: lang === "zh" ? "\u79FB\u51FA\u6536\u85CF\u5939" : "Remove",
    summary: lang === "zh" ? "\u6458\u8981" : "Summary",
    date: lang === "zh" ? "\u65E5\u671F" : "Date"
  };
  function formatDate(ts) {
    if (!ts) return "";
    return new Date(ts).toLocaleDateString();
  }
  function CollectionsApp() {
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewCollection, setViewCollection] = useState(null);
    const [records, setRecords] = useState([]);
    const [showCreate, setShowCreate] = useState(false);
    const [nameZh, setNameZh] = useState("");
    const [nameEn, setNameEn] = useState("");
    const loadCollections = useCallback(() => {
      setLoading(true);
      sdk.api.getCollections().then((c) => {
        setCollections(c || []);
        setLoading(false);
      }).catch(() => setLoading(false));
    }, []);
    useEffect(() => {
      loadCollections();
    }, [loadCollections]);
    const handleView = (col) => {
      setViewCollection(col);
      sdk.api.getCollectionRecords(col.id).then((r) => setRecords(r || []));
    };
    const handleBack = () => {
      setViewCollection(null);
      setRecords([]);
      loadCollections();
    };
    const handleCreate = () => {
      if (!nameZh.trim() && !nameEn.trim()) return;
      setShowCreate(false);
      setNameZh("");
      setNameEn("");
    };
    const handleRemove = (recordId) => {
      sdk.api.removeFromCollection(recordId, viewCollection.id).then(() => {
        setRecords((prev) => prev.filter((r) => r.id !== recordId));
      });
    };
    const inputStyle = {
      flex: 1,
      padding: "8px 10px",
      borderRadius: 8,
      border: "1px solid " + colors.border,
      backgroundColor: colors.grayBg,
      color: colors.text,
      fontSize: 12,
      outline: "none"
    };
    const accentBtn = {
      padding: "8px 18px",
      borderRadius: 8,
      border: "none",
      cursor: "pointer",
      backgroundColor: colors.accent,
      color: "#000",
      fontSize: 12,
      fontWeight: 700
    };
    const ghostBtn = (danger) => ({
      padding: "6px 12px",
      borderRadius: 6,
      border: "1px solid " + (danger ? colors.error : colors.border),
      backgroundColor: "transparent",
      color: danger ? colors.error : colors.text,
      fontSize: 11,
      fontWeight: 600,
      cursor: "pointer"
    });
    const cardStyle = {
      padding: 14,
      borderRadius: 10,
      backgroundColor: colors.grayBg,
      border: "1px solid " + colors.border,
      cursor: "pointer"
    };
    if (viewCollection) {
      const col = viewCollection;
      return React.createElement(
        "div",
        { style: { padding: 20, height: "100%", overflow: "auto" } },
        React.createElement(
          "div",
          { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 } },
          React.createElement("button", { onClick: handleBack, style: ghostBtn() }, T.back),
          React.createElement(
            "h2",
            { style: { fontSize: 16, fontWeight: 700, color: colors.textHeader, margin: 0 } },
            lang === "zh" ? col.name.zh : col.name.en
          ),
          React.createElement("span", { style: { fontSize: 12, color: colors.text, opacity: 0.5 } }, records.length + " " + T.items)
        ),
        records.length === 0 ? React.createElement("div", { style: { textAlign: "center", padding: 40, color: colors.text, opacity: 0.5 } }, T.empty) : React.createElement(
          "div",
          { style: { display: "flex", flexDirection: "column", gap: 8 } },
          records.map(
            (rec) => React.createElement(
              "div",
              { key: rec.id, style: cardStyle },
              React.createElement(
                "div",
                { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
                React.createElement(
                  "div",
                  { style: { flex: 1, minWidth: 0 } },
                  React.createElement(
                    "div",
                    { style: { fontSize: 13, fontWeight: 600, color: colors.textHeader, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } },
                    (rec.summary || "\u2014").substring(0, 80)
                  ),
                  React.createElement("div", { style: { fontSize: 11, color: colors.text, opacity: 0.5 } }, formatDate(rec.createdAt))
                ),
                React.createElement("button", { onClick: () => handleRemove(rec.id), style: ghostBtn(true) }, T.removeFrom)
              )
            )
          )
        )
      );
    }
    return React.createElement(
      "div",
      { style: { padding: 20, height: "100%", overflow: "auto" } },
      React.createElement(
        "div",
        { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 } },
        React.createElement("h2", { style: { fontSize: 16, fontWeight: 700, color: colors.textHeader, margin: 0 } }, T.title),
        React.createElement("button", { onClick: () => setShowCreate(!showCreate), style: accentBtn }, T.newCollection)
      ),
      showCreate && React.createElement(
        "div",
        { style: { ...cardStyle, marginBottom: 16, display: "flex", gap: 8, alignItems: "flex-end" } },
        React.createElement(
          "div",
          { style: { flex: 1 } },
          React.createElement("label", { style: { fontSize: 10, color: colors.text, opacity: 0.6, display: "block", marginBottom: 4 } }, T.nameZh),
          React.createElement("input", { value: nameZh, onChange: (e) => setNameZh(e.target.value), placeholder: T.nameZh, style: inputStyle })
        ),
        React.createElement(
          "div",
          { style: { flex: 1 } },
          React.createElement("label", { style: { fontSize: 10, color: colors.text, opacity: 0.6, display: "block", marginBottom: 4 } }, T.nameEn),
          React.createElement("input", { value: nameEn, onChange: (e) => setNameEn(e.target.value), placeholder: T.nameEn, style: inputStyle })
        ),
        React.createElement("button", { onClick: handleCreate, style: accentBtn }, T.create),
        React.createElement("button", { onClick: () => setShowCreate(false), style: ghostBtn() }, T.cancel)
      ),
      loading ? React.createElement("div", { style: { textAlign: "center", color: colors.text, opacity: 0.5, padding: 40 } }, T.loading) : collections.length === 0 ? React.createElement("div", { style: { textAlign: "center", padding: 40, color: colors.text, opacity: 0.5 } }, T.noCollections) : React.createElement(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: 8 } },
        collections.map(
          (col) => React.createElement(
            "div",
            { key: col.id, onClick: () => handleView(col), style: cardStyle },
            React.createElement(
              "div",
              { style: { display: "flex", alignItems: "center", gap: 10 } },
              React.createElement("div", { style: { width: 28, height: 28, borderRadius: 8, backgroundColor: (col.color || "#6366F1") + "30", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 } }, "\u{1F4C1}"),
              React.createElement(
                "div",
                null,
                React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: colors.textHeader } }, lang === "zh" ? col.name.zh : col.name.en),
                React.createElement("div", { style: { fontSize: 11, color: colors.text, opacity: 0.5 } }, formatDate(col.createdAt))
              )
            )
          )
        )
      )
    );
  }
  sdk.ui.mount = (container) => {
    const root = ReactDOM.createRoot(container);
    root.render(React.createElement(CollectionsApp));
    sdk.ui._root = root;
  };
  sdk.ui.unmount = () => {
    if (sdk.ui._root) {
      sdk.ui._root.unmount();
      delete sdk.ui._root;
    }
  };
})();
