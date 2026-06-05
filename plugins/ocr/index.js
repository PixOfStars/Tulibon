(() => {
  const sdk = window.__PLUGIN_SDK__;
  if (!sdk) throw new Error("Plugin SDK not available");
  const React = sdk.lib.React;
  const ReactDOM = sdk.lib.ReactDOM;
  const PluginDropdown = sdk.lib.PluginDropdown;
  const { useState, useEffect, useRef, createElement: h } = R;
  const lang = sdk.host.lang;
  const colors = sdk.host.theme.colors;
  const T = {
    title: lang === "zh" ? "\u6587\u5B57\u8BC6\u522B" : "OCR",
    dropHint: lang === "zh" ? "\u7C98\u8D34\u56FE\u7247\u6216\u62D6\u62FD\u5230\u6B64\u5904\u8FDB\u884C\u8BC6\u522B" : "Paste or drop an image here for OCR",
    recognize: lang === "zh" ? "\u5F00\u59CB\u8BC6\u522B" : "Recognize",
    recognizing: lang === "zh" ? "\u8BC6\u522B\u4E2D\u2026" : "Recognizing\u2026",
    result: lang === "zh" ? "\u8BC6\u522B\u7ED3\u679C" : "Result",
    copy: lang === "zh" ? "\u590D\u5236" : "Copy",
    copied: lang === "zh" ? "\u5DF2\u590D\u5236!" : "Copied!",
    langLabel: lang === "zh" ? "\u8BC6\u522B\u8BED\u8A00" : "Language",
    noImage: lang === "zh" ? "\u8BF7\u5148\u7C98\u8D34\u6216\u62D6\u5165\u56FE\u7247" : "Paste or drop an image first",
    supported: lang === "zh" ? "\u652F\u6301\u4E2D\u6587\u3001\u82F1\u6587\u7B49\u8BED\u8A00" : "Supports Chinese, English, etc.",
    clear: lang === "zh" ? "\u6E05\u9664" : "Clear"
  };
  const LANG_OPTIONS = [
    { value: "zh-CN", label: "\u4E2D\u6587" },
    { value: "en-US", label: "English" }
  ];
  function OcrApp() {
    const [image, setImage] = useState(null);
    const [text, setText] = useState("");
    const [running, setRunning] = useState(false);
    const [copied, setCopied] = useState(false);
    const [ocrLang, setOcrLang] = useState("zh-CN");
    const [support, setSupport] = useState(null);
    const fileRef = useRef(null);
    useEffect(() => {
      sdk.api.checkOcrSupport(ocrLang).then((s) => setSupport(s));
    }, [ocrLang]);
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile();
          if (!blob) continue;
          const reader = new FileReader();
          reader.onload = (ev) => setImage(ev.target?.result);
          reader.readAsDataURL(blob);
          break;
        }
      }
    };
    const handleFile = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => setImage(ev.target?.result);
      reader.readAsDataURL(file);
    };
    const handleRecognize = () => {
      if (!image) return;
      setRunning(true);
      setText("");
      sdk.api.runOcr(image, ocrLang).then((result) => {
        setText(result || "");
        setRunning(false);
      }).catch((err) => {
        setText((lang === "zh" ? "\u8BC6\u522B\u5931\u8D25: " : "OCR failed: ") + String(err));
        setRunning(false);
      });
    };
    const handleCopy = () => {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2e3);
      });
    };
    const accentBtn = {
      padding: "10px 24px",
      borderRadius: 10,
      border: "none",
      cursor: "pointer",
      backgroundColor: colors.accent,
      color: "#000",
      fontSize: 13,
      fontWeight: 700
    };
    const ghostBtn = {
      padding: "8px 16px",
      borderRadius: 8,
      border: "1px solid " + colors.border,
      backgroundColor: "transparent",
      color: colors.text,
      fontSize: 12,
      fontWeight: 600,
      cursor: "pointer"
    };
    return /* @__PURE__ */ React.createElement(
      "div",
      {
        style: { padding: 20, height: "100%", display: "flex", flexDirection: "column", overflow: "auto" },
        onPaste: handlePaste,
        tabIndex: 0
      },
      /* @__PURE__ */ React.createElement("h2", { style: { fontSize: 16, fontWeight: 700, color: colors.textHeader, marginBottom: 16 } }, T.title),
      /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 14 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, color: colors.text } }, T.langLabel, ":"), /* @__PURE__ */ React.createElement("div", { style: { minWidth: 160 } }, /* @__PURE__ */ React.createElement(PluginDropdown, { options: LANG_OPTIONS, value: ocrLang, onChange: setOcrLang, colors })), support !== null && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: support.available ? colors.success : colors.error } }, support.available ? "\u2713" : "\u2717 " + (support.engine || ""))),
      image ? /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 14 } }, /* @__PURE__ */ React.createElement("img", { src: image, alt: "OCR", style: { maxWidth: "100%", maxHeight: 200, borderRadius: 10, border: "1px solid " + colors.border, objectFit: "contain" } }), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 6 } }, /* @__PURE__ */ React.createElement("button", { onClick: () => {
        setImage(null);
        setText("");
      }, style: ghostBtn }, T.clear))) : /* @__PURE__ */ React.createElement(
        "div",
        {
          style: { padding: 40, borderRadius: 12, border: "2px dashed " + colors.border, textAlign: "center", color: colors.text, opacity: 0.5, marginBottom: 14, cursor: "pointer" },
          onClick: () => fileRef.current?.click()
        },
        /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, marginBottom: 4 } }, T.dropHint),
        /* @__PURE__ */ React.createElement("input", { ref: fileRef, type: "file", accept: "image/*", onChange: handleFile, style: { display: "none" } }),
        /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11 } }, T.supported)
      ),
      /* @__PURE__ */ React.createElement("div", { style: { marginBottom: 16 } }, /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: handleRecognize,
          disabled: running || !image,
          style: { ...accentBtn, opacity: running || !image ? 0.5 : 1 }
        },
        running ? T.recognizing : T.recognize
      )),
      text && /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 8 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 13, fontWeight: 600, color: colors.textHeader } }, T.result), /* @__PURE__ */ React.createElement("button", { onClick: handleCopy, style: ghostBtn }, copied ? T.copied : T.copy)), /* @__PURE__ */ React.createElement("div", { style: { padding: 14, borderRadius: 10, backgroundColor: colors.grayBg, border: "1px solid " + colors.border, fontSize: 13, color: colors.text, whiteSpace: "pre-wrap", lineHeight: 1.6, maxHeight: 300, overflow: "auto" } }, text))
    );
  }
  sdk.ui.mount = (container) => {
    const root = ReactDOM.createRoot(container);
    root.render(/* @__PURE__ */ React.createElement(OcrApp, null));
    sdk.ui._root = root;
  };
  sdk.ui.unmount = () => {
    if (sdk.ui._root) {
      sdk.ui._root.unmount();
      delete sdk.ui._root;
    }
  };
})();
