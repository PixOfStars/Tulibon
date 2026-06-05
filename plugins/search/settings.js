(() => {
  const sdk = window.__PLUGIN_SDK__;
  if (!sdk) {
    console.error("Search settings: SDK not available");
    throw new Error("SDK");
  }
  const lang = sdk.host.lang;
  const colors = sdk.host.theme.colors;
  const t = lang === "zh" ? "\u641C\u7D22\u63D2\u4EF6\u5F53\u524D\u6CA1\u6709\u989D\u5916\u7684\u914D\u7F6E\u9009\u9879" : "Search plugin has no additional settings";
  sdk.ui.mount = (container) => {
    container.innerHTML = '<div style="padding: 16px; color: ' + colors.text + '; opacity: 0.5; font-size: 12px; text-align: center;">' + t + "</div>";
  };
  sdk.ui.unmount = () => {
  };
})();
