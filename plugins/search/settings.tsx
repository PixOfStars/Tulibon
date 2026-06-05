declare const __PLUGIN_SDK__: any;
const sdk = (window as any).__PLUGIN_SDK__;
if (!sdk) { console.error('Search settings: SDK not available'); throw new Error('SDK'); }

const lang: 'zh' | 'en' = sdk.host.lang;
const colors: Record<string, string> = sdk.host.theme.colors;

const t = lang === 'zh' ? '搜索插件当前没有额外的配置选项' : 'Search plugin has no additional settings';

sdk.ui.mount = (container: HTMLElement) => {
  container.innerHTML = '<div style="padding: 16px; color: ' + colors.text + '; opacity: 0.5; font-size: 12px; text-align: center;">' + t + '</div>';
};
sdk.ui.unmount = () => {};
