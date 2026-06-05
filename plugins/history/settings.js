(() => {
  const sdk = window.__PLUGIN_SDK__;
  if (!sdk) throw new Error("Plugin SDK not available");
  const React = sdk.lib.React;
  const ReactDOM = sdk.lib.ReactDOM;
  const PluginDropdown = sdk.lib.PluginDropdown;
  const { useState, useEffect } = React;
  const lang = sdk.host.lang;
  const colors = sdk.host.theme.colors;
  const T = {
    title: lang === "zh" ? "\u5386\u53F2\u8BB0\u5F55\u8BBE\u7F6E" : "History Settings",
    maxRecords: lang === "zh" ? "\u6700\u5927\u663E\u793A\u6761\u6570" : "Max Records",
    autoRecord: lang === "zh" ? "\u81EA\u52A8\u4FDD\u5B58\u5206\u6790\u8BB0\u5F55" : "Auto-save analysis records",
    sortOrder: lang === "zh" ? "\u6392\u5E8F\u65B9\u5F0F" : "Sort Order",
    newest: lang === "zh" ? "\u6700\u65B0\u4F18\u5148" : "Newest First",
    oldest: lang === "zh" ? "\u6700\u65E9\u4F18\u5148" : "Oldest First",
    save: lang === "zh" ? "\u4FDD\u5B58" : "Save",
    saved: lang === "zh" ? "\u2713 \u5DF2\u4FDD\u5B58" : "\u2713 Saved"
  };
  const SORT_OPTIONS = [
    { value: "newest", label: T.newest },
    { value: "oldest", label: T.oldest }
  ];
  function SettingsView() {
    const [maxRecords, setMaxRecords] = useState(50);
    const [autoRecord, setAutoRecord] = useState(true);
    const [sortOrder, setSortOrder] = useState("newest");
    const [saved, setSaved] = useState(false);
    useEffect(() => {
      sdk.config.get("maxRecords").then((v) => {
        if (v !== null && v !== void 0) setMaxRecords(Number(v));
      });
      sdk.config.get("autoRecord").then((v) => {
        if (v !== null) setAutoRecord(Boolean(v));
      });
      sdk.config.get("sortOrder").then((v) => {
        if (v) setSortOrder(v);
      });
    }, []);
    const handleSave = () => {
      Promise.all([
        sdk.config.set("maxRecords", maxRecords),
        sdk.config.set("autoRecord", autoRecord),
        sdk.config.set("sortOrder", sortOrder)
      ]).then(() => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2e3);
      });
    };
    const accentBtn = {
      padding: "8px 20px",
      borderRadius: 8,
      border: "none",
      cursor: "pointer",
      backgroundColor: colors.accent,
      color: "#000",
      fontSize: 12,
      fontWeight: 700
    };
    const inputStyle = {
      width: 80,
      padding: "6px 10px",
      borderRadius: 6,
      border: "1px solid " + colors.border,
      backgroundColor: colors.grayBg,
      color: colors.text,
      fontSize: 12,
      outline: "none"
    };
    const labelStyle = { display: "block", fontSize: 12, fontWeight: 600, color: colors.text, marginBottom: 6 };
    const rowStyle = { marginBottom: 18 };
    return /* @__PURE__ */ React.createElement("div", { style: { padding: 4 } }, /* @__PURE__ */ React.createElement("h3", { style: { fontSize: 14, fontWeight: 700, color: colors.textHeader, marginBottom: 20 } }, T.title), /* @__PURE__ */ React.createElement("div", { style: rowStyle }, /* @__PURE__ */ React.createElement("label", { style: labelStyle }, T.maxRecords), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "number",
        value: maxRecords,
        onChange: (e) => setMaxRecords(Number(e.target.value)),
        min: 10,
        max: 5e3,
        style: inputStyle
      }
    )), /* @__PURE__ */ React.createElement("div", { style: rowStyle }, /* @__PURE__ */ React.createElement("label", { style: labelStyle }, T.sortOrder), /* @__PURE__ */ React.createElement("div", { style: { minWidth: 180 } }, /* @__PURE__ */ React.createElement(PluginDropdown, { options: SORT_OPTIONS, value: sortOrder, onChange: setSortOrder, colors }))), /* @__PURE__ */ React.createElement("div", { style: rowStyle }, /* @__PURE__ */ React.createElement("label", { style: { display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: colors.text, cursor: "pointer" } }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: autoRecord, onChange: (e) => setAutoRecord(e.target.checked) }), T.autoRecord)), /* @__PURE__ */ React.createElement("button", { onClick: handleSave, style: accentBtn }, saved ? T.saved : T.save));
  }
  sdk.ui.mount = (container) => {
    const root = ReactDOM.createRoot(container);
    root.render(/* @__PURE__ */ React.createElement(SettingsView, null));
    sdk.ui._root = root;
  };
  sdk.ui.unmount = () => {
    if (sdk.ui._root) {
      sdk.ui._root.unmount();
      delete sdk.ui._root;
    }
  };
})();
