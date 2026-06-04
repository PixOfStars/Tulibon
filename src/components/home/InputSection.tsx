import ImageDropZone from './ImageDropZone';

interface InputSectionProps {
  config: ReturnType<typeof import('../../hooks/usePreferences').usePreferences>['config'];
  themeColors: Record<string, string>;
  analysisMode: string;
  onModeChange: (modeId: string) => void;
  isAnalyzing: boolean;
  onClipboard: () => void;
  onFileSelect: (files: FileList) => void;
  onDropFiles: (files: File[]) => void;
  onUrlPaste: (url: string) => void;
}

const InputSection = ({
  config, themeColors: colors, analysisMode, onModeChange, isAnalyzing,
  onClipboard, onFileSelect, onDropFiles, onUrlPaste,
}: InputSectionProps) => {
  const lang = config.prefLang;

  return (
    <>
      {/* Analysis Mode Selector */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 20px 6px', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 3, backgroundColor: `${colors.accent}10`, borderRadius: 10, padding: 3, flexWrap: 'wrap' }}>
          {config.modeProfiles.map((m) => (
            <button key={m.id} onClick={() => onModeChange(m.id)}
              style={{
                padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: analysisMode === m.id ? 700 : 500,
                backgroundColor: analysisMode === m.id ? colors.accent : 'transparent',
                color: analysisMode === m.id ? '#000' : colors.text,
                transition: 'background-color 0.2s ease, color 0.2s ease, font-weight 0.2s ease', whiteSpace: 'nowrap',
              }}>
              {lang === 'zh' ? m.name.zh : m.name.en}
            </button>
          ))}
        </div>
      </div>

      {/* Input area */}
      <div style={{ padding: '6px 20px', flexShrink: 0 }}>
        <ImageDropZone
          config={config} colors={colors} isAnalyzing={isAnalyzing}
          onClipboard={onClipboard} onFileSelect={onFileSelect}
          onDropFiles={onDropFiles} onUrlPaste={onUrlPaste}
        />
      </div>
    </>
  );
};

export default InputSection;
