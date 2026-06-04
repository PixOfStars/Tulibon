import type { TabProps } from './TabProps';

const SHORTCUT_KEYS: { key: string; configKey: string }[] = [
  { key: 'shortcutClipboardRead',  configKey: 'clipboardRead' },
  { key: 'shortcutToggleWindow',   configKey: 'toggleWindow' },
  { key: 'shortcutCopyResult',     configKey: 'copyResult' },
  { key: 'shortcutSwitchLang',     configKey: 'switchLang' },
  { key: 'shortcutAnalyze',        configKey: 'analyze' },
];

interface ShortcutsTabProps extends TabProps {
  capturingShortcut: string | null;
  setCapturingShortcut: (key: string | null) => void;
  onCapture: (configKey: string, e: React.KeyboardEvent) => void;
  onClear: (configKey: string) => void;
}

const ShortcutsTab = ({ config, colors, t, capturingShortcut, setCapturingShortcut, onCapture, onClear }: ShortcutsTabProps) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    {SHORTCUT_KEYS.map(({ key, configKey }) => {
      const currentValue = (config.shortcuts as unknown as Record<string, string>)[configKey] || '';
      const isCapturing = capturingShortcut === configKey;
      return (
        <div key={configKey} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, backgroundColor: colors.grayBg, gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: colors.textHeader }}>{t[key]}</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="text" value={isCapturing ? '...' : currentValue} readOnly
              onClick={() => setCapturingShortcut(configKey)}
              onKeyDown={(e) => isCapturing && onCapture(configKey, e)}
              onBlur={() => setCapturingShortcut(null)}
              placeholder={t.shortcutPlaceholder}
              style={{
                width: 140, padding: '6px 10px', borderRadius: 6, border: `1px solid ${isCapturing ? colors.accent : colors.border}`,
                backgroundColor: colors.bg, color: colors.textHeader, fontSize: 12, fontWeight: 600,
                textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s',
              }} />
            <button onClick={() => onClear(configKey)} title={t.shortcutClear}
              style={{ padding: '4px 8px', borderRadius: 6, border: `1px solid ${colors.border}`, backgroundColor: colors.bg, color: colors.text, cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
              {t.shortcutClear}
            </button>
          </div>
        </div>
      );
    })}
  </div>
);

export default ShortcutsTab;
