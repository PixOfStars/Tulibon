import { RocketLaunch, FolderOpen } from '@phosphor-icons/react';
import { ToggleRow, Divider, Field } from './SettingsField';
import { tauriInvoke } from '../../utils/tauri';
import type { TabProps } from './TabProps';

interface GeneralTabProps extends TabProps {
  onSelectFolder: () => void;
}

const GeneralTab = ({ config, saveConfig, colors, t, onSelectFolder }: GeneralTabProps) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    <Field label={t.langLabel}>
      <div style={{ display: 'flex', gap: 4, padding: 4, backgroundColor: `${colors.accent}10`, borderRadius: 8, width: 'fit-content' }}>
        {(['zh', 'en'] as const).map((lang) => (
          <button key={lang} onClick={() => saveConfig({ ...config, prefLang: lang })}
            style={{
              padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: config.prefLang === lang ? 700 : 500,
              backgroundColor: config.prefLang === lang ? colors.accent : 'transparent',
              color: config.prefLang === lang ? '#000' : colors.text,
            }}>
            {lang === 'zh' ? t.langZh : t.langEn}
          </button>
        ))}
      </div>
    </Field>

    <Divider colors={colors} />

    <Field label={t.exportFormat}>
      <div style={{ display: 'flex', gap: 4, padding: 4, backgroundColor: `${colors.accent}10`, borderRadius: 8, width: 'fit-content' }}>
        {(['md', 'txt'] as const).map((fmt) => (
          <button key={fmt} onClick={() => saveConfig({ ...config, exportFormat: fmt })}
            style={{
              padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: config.exportFormat === fmt ? 700 : 500,
              backgroundColor: config.exportFormat === fmt ? colors.accent : 'transparent',
              color: config.exportFormat === fmt ? '#000' : colors.text,
            }}>
            {fmt === 'md' ? 'Markdown' : 'TXT'}
          </button>
        ))}
      </div>
    </Field>

    <Divider colors={colors} />

    <Field label={t.storageLocation}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={onSelectFolder}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: `1px solid ${colors.border}`, backgroundColor: colors.bg, color: colors.text, cursor: 'pointer', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
          <FolderOpen size={16} weight="bold" />{t.selectFolder}
        </button>
        <span style={{ fontSize: 11, color: colors.text }}>{config.dataDir || t.storageLocationHint}</span>
      </div>
    </Field>

    <Divider colors={colors} />

    <div>
      <div style={{ fontSize: 10, fontWeight: 600, color: colors.textHeader, textTransform: 'uppercase', opacity: 0.4, marginBottom: 8 }}>
        {t.generalTab}
      </div>
      <ToggleRow icon={RocketLaunch} label={t.autoStart}
        checked={config.autoStart} onChange={async () => {
          const newVal = !config.autoStart;
          saveConfig({ ...config, autoStart: newVal });
          try {
            await tauriInvoke('set_autostart', { enabled: newVal });
          } catch {}
        }} colors={colors} />
    </div>
  </div>
);

export default GeneralTab;
