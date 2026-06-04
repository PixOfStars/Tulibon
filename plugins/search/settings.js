(() => {
  const SDK = window.__PLUGIN_SDK__;
  if (!SDK) {
    console.error('Search settings: SDK not available');
    return;
  }

  const { config, lib } = SDK;
  const t = SDK.config.lang === 'zh' ? {
    placeholder: '搜索功能配置',
    noSettings: '搜索插件当前没有额外的配置选项'
  } : {
    placeholder: 'Search plugin settings',
    noSettings: 'Search plugin has no additional settings'
  };

  class SearchSettings {
    constructor() {
      this.container = null;
    }

    mount(container) {
      this.container = container;
      const html = `
        <div style="padding: 16px; color: var(--color-text-secondary);">
          <p>${t.noSettings}</p>
        </div>
      `;
      container.innerHTML = html;
    }

    unmount() {
      if (this.container) {
        this.container.innerHTML = '';
      }
    }
  }

  const settings = new SearchSettings();

  SDK.ui = {
    mount: (container) => settings.mount(container),
    unmount: () => settings.unmount(),
  };
})();
