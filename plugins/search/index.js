(() => {
  const sdk = window.__PLUGIN_SDK__;
  if (!sdk) throw new Error("Plugin SDK not available");
  const React = sdk.lib.React;
  const ReactDOM = sdk.lib.ReactDOM = sdk.lib;
  const { useState, useEffect, useRef } = React;
  const lang = sdk.host.lang;
  const colors = sdk.host.theme.colors;
  const T = {
    title: lang === "zh" ? "\u641C\u7D22" : "Search",
    placeholder: lang === "zh" ? "\u8F93\u5165\u5173\u952E\u8BCD\u641C\u7D22\u2026" : "Search records\u2026",
    noResults: lang === "zh" ? "\u672A\u627E\u5230\u5339\u914D\u8BB0\u5F55" : "No matching records",
    results: lang === "zh" ? "\u6761\u7ED3\u679C" : "results",
    loading: lang === "zh" ? "\u641C\u7D22\u4E2D\u2026" : "Searching\u2026",
    hint: lang === "zh" ? "\u8F93\u5165\u5173\u952E\u8BCD\u641C\u7D22\u6458\u8981\u548C\u6807\u7B7E" : "Search summaries and tags",
    summary: lang === "zh" ? "\u6458\u8981" : "Summary",
    tags: lang === "zh" ? "\u6807\u7B7E" : "Tags",
    mode: lang === "zh" ? "\u6A21\u5F0F" : "Mode",
    date: lang === "zh" ? "\u65E5\u671F" : "Date"
  };
  function formatDate(ts) {
    if (!ts) return "";
    return new Date(ts).toLocaleDateString();
  }
  function highlight(text, q) {
    if (!q || !text) return [text || ""];
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return [text];
    const result = [];
    if (idx > 0) result.push(text.substring(0, idx));
    result.push(React.createElement("mark", { style: { backgroundColor: colors.accent + "40", color: colors.accent, borderRadius: 2, padding: "0 2px" } }, text.substring(idx, idx + q.length)));
    const after = text.substring(idx + q.length);
    const rest = highlight(after, q);
    return result.concat(rest);
  }
  function SearchApp() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const inputRef = useRef(null);
    useEffect(() => {
      inputRef.current?.focus();
    }, []);
    const handleSearch = () => {
      if (!query.trim()) return;
      setLoading(true);
      sdk.api.searchRecords(query.trim()).then((r) => {
        setResults(r || []);
        setSearched(true);
        setLoading(false);
      }).catch(() => setLoading(false));
    };
    const inputStyle = {
      flex: 1,
      padding: "10px 14px",
      borderRadius: 10,
      border: "1px solid " + colors.border,
      backgroundColor: colors.grayBg,
      color: colors.text,
      fontSize: 14,
      outline: "none"
    };
    const accentBtn = {
      padding: "10px 20px",
      borderRadius: 10,
      border: "none",
      cursor: "pointer",
      backgroundColor: colors.accent,
      color: "#000",
      fontSize: 13,
      fontWeight: 700
    };
    return /* @__PURE__ */ React.createElement("div", { style: { padding: 20, height: "100%", display: "flex", flexDirection: "column" } }, /* @__PURE__ */ React.createElement("h2", { style: { fontSize: 16, fontWeight: 700, color: colors.textHeader, marginBottom: 16 } }, T.title), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, marginBottom: 20 } }, /* @__PURE__ */ React.createElement(
      "input",
      {
        ref: inputRef,
        type: "text",
        value: query,
        onChange: (e) => setQuery(e.target.value),
        onKeyDown: (e) => {
          if (e.key === "Enter") handleSearch();
        },
        placeholder: T.placeholder,
        style: inputStyle
      }
    ), /* @__PURE__ */ React.createElement("button", { onClick: handleSearch, style: accentBtn }, T.title)), loading ? /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: 40, color: colors.text, opacity: 0.5 } }, T.loading) : searched && results.length === 0 ? /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: 40, color: colors.text, opacity: 0.5 } }, T.noResults) : !searched ? /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: 40, color: colors.text, opacity: 0.4 } }, T.hint) : /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: colors.text, opacity: 0.5, marginBottom: 12 } }, results.length, " ", T.results), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8, flex: 1, overflow: "auto" } }, results.map((rec) => /* @__PURE__ */ React.createElement("div", { key: rec.id, style: { padding: 12, borderRadius: 10, backgroundColor: colors.grayBg, border: "1px solid " + colors.border } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: colors.textHeader, marginBottom: 4 } }, highlight((rec.summary || "").substring(0, 100), query.trim())), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: colors.text, opacity: 0.5, display: "flex", gap: 12 } }, /* @__PURE__ */ React.createElement("span", null, T.mode, ": ", rec.mode || "\u2014"), /* @__PURE__ */ React.createElement("span", null, formatDate(rec.createdAt)), rec.tags?.length > 0 && /* @__PURE__ */ React.createElement("span", null, T.tags, ": ", rec.tags.join(", "))))))));
  }
  sdk.ui.mount = (container) => {
    const root = ReactDOM.createRoot(container);
    root.render(/* @__PURE__ */ React.createElement(SearchApp, null));
    sdk.ui._root = root;
  };
  sdk.ui.unmount = () => {
    if (sdk.ui._root) {
      sdk.ui._root.unmount();
      delete sdk.ui._root;
    }
  };
})();
