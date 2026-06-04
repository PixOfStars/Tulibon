import { ClipboardText, ImageSquare, Link } from '@phosphor-icons/react';
import { ToggleRow, Divider, Field } from './SettingsField';
import type { TabProps } from './TabProps';

interface InputTabProps extends TabProps {
  toggleInputMethod: (key: 'clipboard' | 'dragDrop' | 'urlPaste' | 'filePicker') => void;
}

const InputTab = ({ config, saveConfig, colors, t, toggleInputMethod }: InputTabProps) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    <ToggleRow icon={ClipboardText} label={t.inputClipboard}
      checked={config.inputMethods.clipboard} onChange={() => toggleInputMethod('clipboard')} colors={colors} />

    <Field label={t.clipboardMode}>
      <div style={{ display: 'flex', gap: 4, padding: 4, backgroundColor: colors.grayBg, borderRadius: 8, width: 'fit-content' }}>
        {(['auto', 'manual'] as const).map((mode) => (
          <button key={mode} onClick={() => saveConfig({ ...config, clipboardMode: mode })}
            style={{
              padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: config.clipboardMode === mode ? 700 : 500,
              backgroundColor: config.clipboardMode === mode ? colors.accent : 'transparent',
              color: config.clipboardMode === mode ? '#000' : colors.text,
            }}>
            {mode === 'auto' ? t.clipboardAuto : t.clipboardManual}
          </button>
        ))}
      </div>
    </Field>

    <Divider colors={colors} />

    <ToggleRow icon={ImageSquare} label={t.inputFilePicker}
      checked={config.inputMethods.filePicker} onChange={() => toggleInputMethod('filePicker')} colors={colors} />

    <Divider colors={colors} />

    <ToggleRow icon={ImageSquare} label={t.inputDragDrop}
      checked={config.inputMethods.dragDrop} onChange={() => toggleInputMethod('dragDrop')} colors={colors} />

    <Divider colors={colors} />

    <ToggleRow icon={Link} label={t.inputUrlPaste}
      checked={config.inputMethods.urlPaste} onChange={() => toggleInputMethod('urlPaste')} colors={colors} />
  </div>
);

export default InputTab;
