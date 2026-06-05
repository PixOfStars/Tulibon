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
    title: lang === "zh" ? "\u6536\u85CF\u5939\u8BBE\u7F6E" : "Collections Settings",
    defaultView: lang === "zh" ? "\u9ED8\u8BA4\u89C6\u56FE" : "Default View",
    grid: lang === "zh" ? "\u7F51\u683C" : "Grid",
    list: lang === "zh" ? "\u5217\u8868" : "List",
    showEmpty: lang === "zh" ? "\u663E\u793A\u7A7A\u6536\u85CF\u5939" : "Show Empty Collections",
    confirmDelete: lang === "zh" ? "\u5220\u9664\u524D\u786E\u8BA4" : "Confirm Before Delete",
    save: lang === "zh" ? "\u4FDD\u5B58" : "Save",
    saved: lang === "zh" ? "\u2713 \u5DF2\u4FDD\u5B58" : "\u2713 Saved"
  };
  const VIEW_OPTIONS = [
    { value: "list", label: T.list },
    { value: "grid", label: T.grid }
  ];
  function SettingsView() {
    const [defaultView, setDefaultView] = useState("list");
    const [showEmpty, setShowEmpty] = useState(true);
    const [confirmDelete, setConfirmDelete] = useState(true);
    const [saved, setSaved] = useState(false);
    useEffect(() => {
      sdk.config.get("defaultView").then((v) => {
        if (v) setDefaultView(v);
      });
      sdk.config.get("showEmpty").then((v) => {
        if (v !== null) setShowEmpty(Boolean(v));
      });
      sdk.config.get("confirmDelete").then((v) => {
        if (v !== null) setConfirmDelete(Boolean(v));
      });
    }, []);
    const handleSave = () => {
      Promise.all([
        sdk.config.set("defaultView", defaultView),
        sdk.config.set("showEmpty", showEmpty),
        sdk.config.set("confirmDelete", confirmDelete)
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
    const labelStyle = { display: "block", fontSize: 12, fontWeight: 600, color: colors.text, marginBottom: 6 };
    const rowStyle = { marginBottom: 18 };
    return /* @__PURE__ */ React.createElement("div", { style: { padding: 4 } }, /* @__PURE__ */ React.createElement("h3", { style: { fontSize: 14, fontWeight: 700, color: colors.textHeader, marginBottom: 20 } }, T.title), /* @__PURE__ */ React.createElement("div", { style: rowStyle }, /* @__PURE__ */ React.createElement("label", { style: labelStyle }, T.defaultView), /* @__PURE__ */ React.createElement("div", { style: { minWidth: 180 } }, /* @__PURE__ */ React.createElement(PluginDropdown, { options: VIEW_OPTIONS, value: defaultView, onChange: setDefaultView, colors }))), /* @__PURE__ */ React.createElement("div", { style: rowStyle }, /* @__PURE__ */ React.createElement("label", { style: { display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: colors.text, cursor: "pointer" } }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: showEmpty, onChange: (e) => setShowEmpty(e.target.checked) }), T.showEmpty)), /* @__PURE__ */ React.createElement("div", { style: rowStyle }, /* @__PURE__ */ React.createElement("label", { style: { display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: colors.text, cursor: "pointer" } }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", checked: confirmDelete, onChange: (e) => setConfirmDelete(e.target.checked) }), T.confirmDelete)), /* @__PURE__ */ React.createElement("button", { onClick: handleSave, style: accentBtn }, saved ? T.saved : T.save));
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
