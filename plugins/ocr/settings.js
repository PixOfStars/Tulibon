(() => {
  const sdk = window.__PLUGIN_SDK__;
  if (!sdk) throw new Error("Plugin SDK not available");
  const React = sdk.lib.React;
  const ReactDOM = sdk.lib.ReactDOM;
  const PluginDropdown = sdk.lib.PluginDropdown;
  const { useState, useEffect } = React;
  const lang = sdk.host.lang;
  const colors = sdk.host.theme.colors;
  const LANG_OPTIONS = [
    { value: "zh-CN", label: "\u4E2D\u6587" },
    { value: "en-US", label: "English" }
  ];
  function SettingsView() {
    const [ocrLang, setOcrLang] = useState("zh-CN");
    const [saved, setSaved] = useState(false);
    useEffect(() => {
      sdk.config.get("ocrLang").then((v) => {
        if (v) setOcrLang(v);
      });
    }, []);
    const handleSave = () => {
      sdk.config.set("ocrLang", ocrLang).then(() => {
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
    return /* @__PURE__ */ React.createElement("div", { style: { padding: 4 } }, /* @__PURE__ */ React.createElement("h3", { style: { fontSize: 14, fontWeight: 700, color: colors.textHeader, marginBottom: 16 } }, lang === "zh" ? "OCR \u8BBE\u7F6E" : "OCR Settings"), /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 20 } }, /* @__PURE__ */ React.createElement("label", { style: { display: "block", fontSize: 12, fontWeight: 600, color: colors.text, marginBottom: 6 } }, lang === "zh" ? "\u9ED8\u8BA4\u8BC6\u522B\u8BED\u8A00" : "Default Language"), /* @__PURE__ */ React.createElement("div", { style: { minWidth: 180 } }, /* @__PURE__ */ React.createElement(PluginDropdown, { options: LANG_OPTIONS, value: ocrLang, onChange: setOcrLang, colors }))), /* @__PURE__ */ React.createElement("button", { onClick: handleSave, style: accentBtn }, saved ? lang === "zh" ? "\u2713 \u5DF2\u4FDD\u5B58" : "\u2713 Saved" : lang === "zh" ? "\u4FDD\u5B58" : "Save"));
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
