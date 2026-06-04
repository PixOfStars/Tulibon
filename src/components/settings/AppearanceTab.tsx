import { Sun, Moon, Monitor, FolderOpen } from '@phosphor-icons/react';
import { Field } from './SettingsField';
import type { TabProps } from './TabProps';

const COLOR_PRESETS = ['#00C896', '#4A90D9', '#FF6B4A', '#8B5CF6', '#EC4899', '#06B6D4', '#F59E0B'];

interface AppearanceTabProps extends TabProps {
  onSelectFont: () => void;
}

const AppearanceTab = ({ config, saveConfig, colors, t, onSelectFont }: AppearanceTabProps) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    <Field label={t.modeLabel}>
      <div style={{ display: 'flex', gap: 4, padding: 4, backgroundColor: `${colors.accent}10`, borderRadius: 8, width: 'fit-content' }}>
        {([
          { val: 'auto' as const, icon: Monitor, label: t.themeAuto },
          { val: 'light' as const, icon: Sun, label: t.modeLight },
          { val: 'dark' as const, icon: Moon, label: t.modeDark },
        ]).map(({ val, icon: Icon, label }) => (
          <button key={val} onClick={() => saveConfig({ ...config, prefMode: val })}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontSize: 11, fontWeight: config.prefMode === val ? 700 : 500,
              backgroundColor: config.prefMode === val ? colors.accent : 'transparent',
              color: config.prefMode === val ? '#000' : colors.text,
            }}>
            <Icon size={14} weight={val === 'dark' ? 'fill' : 'bold'} />{label}
          </button>
        ))}
      </div>
    </Field>

    <Field label={t.accentColor}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {COLOR_PRESETS.map((c) => (
          <button key={c} onClick={() => saveConfig({ ...config, accentColor: c })}
            style={{
              width: 28, height: 28, borderRadius: '50%', backgroundColor: c,
              border: config.accentColor === c ? `2px solid ${colors.textHeader}` : `2px solid transparent`,
              cursor: 'pointer', padding: 0,
              outline: config.accentColor === c ? `2px solid ${c}` : 'none', outlineOffset: 2,
            }} />
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
        <span style={{ fontSize: 10, color: colors.text }}>{t.accentColorCustom}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, backgroundColor: colors.grayBg, border: `1px solid ${colors.border}` }}>
          <span style={{ width: 16, height: 16, borderRadius: 4, backgroundColor: config.accentColor }} />
          <input type="text" value={config.accentColor}
            onChange={(e) => { const val = e.target.value; if (/^#[0-9a-fA-F]{0,6}$/.test(val)) saveConfig({ ...config, accentColor: val }); }}
            onBlur={(e) => { const val = e.target.value; if (/^#[0-9a-fA-F]{6}$/.test(val)) saveConfig({ ...config, accentColor: val }); else saveConfig({ ...config, accentColor: config.accentColor || '#00C896' }); }}
            placeholder="#00C896" maxLength={7}
            style={{ width: 64, border: 'none', background: 'none', fontSize: 12, fontWeight: 600, color: colors.textHeader }} />
        </div>
      </div>
    </Field>

    <Field label={t.fontFamily}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={onSelectFont}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: `1px solid ${colors.border}`, backgroundColor: colors.bg, color: colors.text, cursor: 'pointer', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
          <FolderOpen size={16} weight="bold" />{t.selectFont}
        </button>
        <span style={{ fontSize: 11, color: colors.text }}>{config.customFontPath ? config.customFontPath.split(/[/\\]/).pop() : t.fontFamilyPlaceholder}</span>
      </div>
    </Field>

    <Field label={t.fontSize}>
      <div style={{ display: 'flex', gap: 4, padding: 4, backgroundColor: `${colors.accent}10`, borderRadius: 8, width: 'fit-content' }}>
        {([
          { val: 'small' as const, label: t.fontSizeSmall },
          { val: 'medium' as const, label: t.fontSizeMedium },
          { val: 'large' as const, label: t.fontSizeLarge },
        ]).map(({ val, label }) => (
          <button key={val} onClick={() => saveConfig({ ...config, fontSize: val })}
            style={{
              padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: config.fontSize === val ? 700 : 500,
              backgroundColor: config.fontSize === val ? colors.accent : 'transparent',
              color: config.fontSize === val ? '#000' : colors.text,
            }}>{label}</button>
        ))}
      </div>
    </Field>
  </div>
);

export default AppearanceTab;
