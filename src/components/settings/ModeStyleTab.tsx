import { useState } from 'react';
import { Plus, CaretDown, CaretUp, Trash, Sparkle } from '@phosphor-icons/react';
import type { ModeProfile, StylePreset, AnalysisMode } from '../../types';
import { Field, inputStyle, iconBtnStyle } from './SettingsField';
import { generateId } from '../../utils/helpers';
import type { TabProps } from './TabProps';
import Dropdown from '../common/Dropdown';

const MODE_TYPE_LABELS: Record<AnalysisMode, { zh: string; en: string }> = {
  design: { zh: '设计分析', en: 'Design Analysis' },
  ocr:    { zh: '文字识别', en: 'Text Recognition' },
};

const ModeStyleTab = ({ config, saveConfig, colors, lang, t, toast }: TabProps) => {
  const [expandedModes, setExpandedModes] = useState<Set<string>>(new Set());
  const [expandedStyles, setExpandedStyles] = useState<Set<string>>(new Set());

  const toggleMode = (id: string) => {
    setExpandedModes(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleStyle = (id: string) => {
    setExpandedStyles(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Mode operations ──

  const addMode = () => {
    const newMode: ModeProfile = {
      id: `mode_${generateId()}`,
      name: { zh: t.untitledMode || 'Untitled Mode', en: t.untitledMode || 'Untitled Mode' },
      persona: '',
      styleId: 'ui_design',
      customInstruction: '',
      modeType: 'design',
      isBuiltIn: false,
    };
    saveConfig({ ...config, modeProfiles: [...config.modeProfiles, newMode] });
    setExpandedModes(prev => new Set([...prev, newMode.id]));
  };

  const updateMode = (index: number, changes: Partial<ModeProfile>) => {
    const updated = [...config.modeProfiles];
    updated[index] = { ...updated[index], ...changes };
    saveConfig({ ...config, modeProfiles: updated });
  };

  const deleteMode = (id: string) => {
    const profile = config.modeProfiles.find(m => m.id === id);
    if (!profile || profile.isBuiltIn) return;
    saveConfig({ ...config, modeProfiles: config.modeProfiles.filter(m => m.id !== id) });
    toast.show(t.deleteModeConfirm || 'Deleted', 'info');
  };

  // ── Style operations ──

  const addStyle = () => {
    const newStyle: StylePreset = {
      id: `style_${generateId()}`,
      name: { zh: t.untitledStyle || 'Untitled Style', en: t.untitledStyle || 'Untitled Style' },
      instruction: '',
      isBuiltIn: false,
    };
    saveConfig({ ...config, stylePresets: [...config.stylePresets, newStyle] });
    setExpandedStyles(prev => new Set([...prev, newStyle.id]));
  };

  const updateStyle = (index: number, changes: Partial<StylePreset>) => {
    const updated = [...config.stylePresets];
    updated[index] = { ...updated[index], ...changes };
    saveConfig({ ...config, stylePresets: updated });
  };

  const deleteStyle = (id: string) => {
    const preset = config.stylePresets.find(s => s.id === id);
    if (!preset || preset.isBuiltIn) return;
    saveConfig({ ...config, stylePresets: config.stylePresets.filter(s => s.id !== id) });
    toast.show(t.deleteStyleConfirm || 'Deleted', 'info');
  };

  const cardStyle: React.CSSProperties = {
    border: `1px solid ${colors.border}`,
    borderRadius: 10,
    overflow: 'hidden',
    transition: 'all 0.15s',
  };

  const cardHeaderStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 14px',
    cursor: 'pointer',
    userSelect: 'none' as const,
  };

  const cardBodyStyle: React.CSSProperties = {
    padding: '0 14px 14px',
    display: 'flex', flexDirection: 'column', gap: 10,
    borderTop: `1px solid ${colors.border}`,
    paddingTop: 12,
  };

  const sectionHeaderStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 8,
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 700, color: colors.textHeader,
    textTransform: 'uppercase' as const, letterSpacing: '0.5px',
  };

  const badgeStyle: React.CSSProperties = {
    fontSize: 10, fontWeight: 600,
    padding: '2px 8px', borderRadius: 100,
    backgroundColor: `${colors.accent}18`, color: colors.accent,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Mode Profiles Section ── */}
      <div>
        <div style={sectionHeaderStyle}>
          <span style={sectionTitleStyle}>{t.modeProfilesTitle || 'Analysis Modes'}</span>
          <button onClick={addMode}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, border: 'none', backgroundColor: colors.accent, color: '#000', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
            <Plus size={14} weight="bold" />{t.addMode || 'New Mode'}
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {config.modeProfiles.map((profile, i) => {
            const expanded = expandedModes.has(profile.id);
            const boundStyle = config.stylePresets.find(s => s.id === profile.styleId);
            const typeLabel = MODE_TYPE_LABELS[profile.modeType] || MODE_TYPE_LABELS.design;

            return (
              <div key={profile.id} style={cardStyle}>
                <div style={cardHeaderStyle}
                  onClick={() => toggleMode(profile.id)}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = colors.accentBg)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: colors.textHeader }}>
                    {lang === 'zh' ? profile.name.zh : profile.name.en}
                  </span>
                  <span style={badgeStyle}>
                    {lang === 'zh' ? typeLabel.zh : typeLabel.en}
                  </span>
                  <span style={{ fontSize: 10, color: colors.text, opacity: 0.6 }}>
                    {boundStyle ? (lang === 'zh' ? boundStyle.name.zh : boundStyle.name.en) : ''}
                  </span>
                  {expanded ? <CaretUp size={14} weight="bold" color={colors.text} /> : <CaretDown size={14} weight="bold" color={colors.text} />}
                </div>
                {expanded && (
                  <div style={cardBodyStyle}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <Field label={t.modeNameZh || 'Chinese Name'}>
                          <input type="text" value={profile.name.zh}
                            onChange={e => updateMode(i, { name: { ...profile.name, zh: e.target.value } })}
                            style={inputStyle(colors)} />
                        </Field>
                      </div>
                      <div style={{ flex: 1 }}>
                        <Field label={t.modeNameEn || 'English Name'}>
                          <input type="text" value={profile.name.en}
                            onChange={e => updateMode(i, { name: { ...profile.name, en: e.target.value } })}
                            style={inputStyle(colors)} />
                        </Field>
                      </div>
                    </div>

                    <Field label={t.modePersona || 'Persona'}>
                      <textarea value={profile.persona}
                        onChange={e => updateMode(i, { persona: e.target.value })}
                        placeholder={t.modePersonaHint || 'Role description…'}
                        rows={3} style={{ ...inputStyle(colors), resize: 'vertical' }} />
                    </Field>

                    <Field label={t.modeStyleBinding || 'Style'}>
                      <Dropdown
                        options={config.stylePresets.map(s => ({ value: s.id, label: lang === 'zh' ? s.name.zh : s.name.en }))}
                        value={profile.styleId}
                        onChange={v => updateMode(i, { styleId: v })}
                        colors={colors}
                      />
                    </Field>

                    <Field label={t.modeCustomInstruction || 'Custom Instruction'}>
                      <textarea value={profile.customInstruction}
                        onChange={e => updateMode(i, { customInstruction: e.target.value })}
                        placeholder={t.modeCustomInstructionHint || 'Additional instructions…'}
                        rows={2} style={{ ...inputStyle(colors), resize: 'vertical' }} />
                    </Field>

                    {!profile.isBuiltIn && (
                      <Field label={t.modeType || 'Analysis Type'}>
                        <Dropdown
                          options={Object.entries(MODE_TYPE_LABELS).map(([key, label]) => ({ value: key, label: lang === 'zh' ? label.zh : label.en }))}
                          value={profile.modeType}
                          onChange={v => updateMode(i, { modeType: v as AnalysisMode })}
                          colors={colors}
                        />
                      </Field>
                    )}

                    {!profile.isBuiltIn && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={() => deleteMode(profile.id)}
                          style={{ ...iconBtnStyle(colors), color: colors.error, borderColor: colors.error, padding: '6px 14px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Trash size={14} weight="bold" />{t.deleteMode || 'Delete'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Style Presets Section ── */}
      <div>
        <div style={sectionHeaderStyle}>
          <span style={sectionTitleStyle}>{t.stylePresetsTitle || 'Style Presets'}</span>
          <button onClick={addStyle}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, border: 'none', backgroundColor: colors.accent, color: '#000', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
            <Plus size={14} weight="bold" />{t.addStyle || 'New Style'}
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {config.stylePresets.map((preset, i) => {
            const expanded = expandedStyles.has(preset.id);
            return (
              <div key={preset.id} style={cardStyle}>
                <div style={cardHeaderStyle}
                  onClick={() => toggleStyle(preset.id)}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = colors.accentBg)}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                  <Sparkle size={14} weight="bold" color={colors.accent} style={{ flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: colors.textHeader }}>
                    {lang === 'zh' ? preset.name.zh : preset.name.en}
                  </span>
                  {preset.isBuiltIn && <span style={badgeStyle}>{t.builtIn || 'Built-in'}</span>}
                  {expanded ? <CaretUp size={14} weight="bold" color={colors.text} /> : <CaretDown size={14} weight="bold" color={colors.text} />}
                </div>
                {expanded && (
                  <div style={cardBodyStyle}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <Field label={t.styleNameZh || 'Chinese Name'}>
                          <input type="text" value={preset.name.zh}
                            onChange={e => updateStyle(i, { name: { ...preset.name, zh: e.target.value } })}
                            style={inputStyle(colors)} />
                        </Field>
                      </div>
                      <div style={{ flex: 1 }}>
                        <Field label={t.styleNameEn || 'English Name'}>
                          <input type="text" value={preset.name.en}
                            onChange={e => updateStyle(i, { name: { ...preset.name, en: e.target.value } })}
                            style={inputStyle(colors)} />
                        </Field>
                      </div>
                    </div>

                    <Field label={t.styleInstruction || 'Style Instruction'}>
                      <textarea value={preset.instruction}
                        onChange={e => updateStyle(i, { instruction: e.target.value })}
                        placeholder={t.styleInstructionHint || 'Style description…'}
                        rows={3} style={{ ...inputStyle(colors), resize: 'vertical' }} />
                    </Field>

                    {!preset.isBuiltIn && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={() => deleteStyle(preset.id)}
                          style={{ ...iconBtnStyle(colors), color: colors.error, borderColor: colors.error, padding: '6px 14px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Trash size={14} weight="bold" />{t.deleteStyle || 'Delete'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ModeStyleTab;
