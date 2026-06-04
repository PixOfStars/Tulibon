import { useState, useRef } from 'react';
import { Key, Lightning, RocketLaunch, Wrench, Eye, EyeSlash, Copy, Trash } from '@phosphor-icons/react';
import type { ProviderConfig } from '../../types';
import { Field, ToggleRow, inputStyle, iconBtnStyle } from './SettingsField';
import type { TabProps } from './TabProps';

const PROVIDER_ICONS: Record<string, typeof Key> = {
  gemini: Lightning,
  openai: RocketLaunch,
  custom: Wrench,
};

interface ProviderTabProps extends TabProps {
  editingProvider: number;
  setEditingProvider: (i: number) => void;
  updateProvider: (index: number, p: ProviderConfig) => void;
  setActiveProvider: (id: string) => void;
}

const ProviderTab = ({
  config, colors, t, toast,
  editingProvider, setEditingProvider, updateProvider, setActiveProvider,
}: ProviderTabProps) => {
  const [showKey, setShowKey] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const clearTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const updateSingleProvider = (field: keyof ProviderConfig, value: string | boolean) => {
    updateProvider(editingProvider, { ...config.providers[editingProvider], [field]: value });
  };

  const handleClearKey = () => {
    if (!clearConfirm) {
      setClearConfirm(true);
      clearTimer.current = setTimeout(() => setClearConfirm(false), 3000);
      return;
    }
    clearTimeout(clearTimer.current);
    const oldKey = config.providers[editingProvider].apiKey;
    updateSingleProvider('apiKey', '');
    toast.show(t.keyRemoved, 'info', { label: t.undo, onClick: () => updateSingleProvider('apiKey', oldKey) }, 5000);
    setClearConfirm(false);
  };

  const handleCopyKey = async () => {
    const key = config.providers[editingProvider].apiKey;
    if (key) {
      try { await navigator.clipboard.writeText(key); toast.show(t.copied); } catch { /* */ }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Provider selector */}
      <div style={{ display: 'flex', padding: 4, backgroundColor: colors.grayBg, borderRadius: 8, overflow: 'hidden' }}>
        {config.providers.map((p, i) => {
          const Icon = PROVIDER_ICONS[p.id] || Key;
          const active = config.activeProvider === p.id;
          return (
            <button key={p.id}
              onClick={() => { setActiveProvider(p.id); setEditingProvider(i); }}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                padding: '8px 6px', borderRadius: 0, border: 'none', cursor: 'pointer',
                fontSize: 11, fontWeight: active ? 700 : 500,
                backgroundColor: active ? colors.accent : 'transparent',
                color: active ? '#000' : colors.text, transition: 'all 0.2s',
              }}>
              <Icon size={14} weight="bold" />{p.name}
            </button>
          );
        })}
      </div>

      <Field label={t.apiKey}>
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input type={showKey ? 'text' : 'password'} value={config.providers[editingProvider].apiKey}
              onChange={(e) => updateSingleProvider('apiKey', e.target.value)} placeholder={t.apiKeyPlaceholder}
              style={{ ...inputStyle(colors), width: '100%', paddingRight: 34 }} />
            <button onClick={() => setShowKey(!showKey)} title={showKey ? t.hideKey : t.showKey}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: colors.text, padding: 2, display: 'flex', alignItems: 'center' }}>
              {showKey ? <EyeSlash size={14} weight="bold" /> : <Eye size={14} weight="bold" />}
            </button>
          </div>
          <button onClick={handleCopyKey} title={t.copyKey} style={{ ...iconBtnStyle(colors), width: 40, height: 40 }}>
            <Copy size={18} weight="bold" />
          </button>
          <button onClick={handleClearKey} title={clearConfirm ? t.clearKeyConfirm : t.clearKey}
            style={{ ...iconBtnStyle(colors), width: 40, height: 40, color: clearConfirm ? colors.error : colors.text, borderColor: clearConfirm ? colors.error : colors.border }}>
            <Trash size={18} weight="bold" />
          </button>
        </div>
      </Field>

      <Field label={t.endpoint}>
        <input type="text" value={config.providers[editingProvider].endpoint}
          onChange={(e) => updateSingleProvider('endpoint', e.target.value)} style={inputStyle(colors)} />
      </Field>
      <Field label={t.model}>
        <input type="text" value={config.providers[editingProvider].model}
          onChange={(e) => updateSingleProvider('model', e.target.value)} style={inputStyle(colors)} />
      </Field>

      <ToggleRow icon={Lightning} label={t.enableProvider}
        checked={config.providers[editingProvider].enabled}
        onChange={() => updateSingleProvider('enabled', !config.providers[editingProvider].enabled)} colors={colors} />
    </div>
  );
};

export default ProviderTab;
