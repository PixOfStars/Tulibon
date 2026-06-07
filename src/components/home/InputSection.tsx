import ImageDropZone from './ImageDropZone';

interface InputSectionProps {
  config: ReturnType<typeof import('../../hooks/usePreferences').usePreferences>['config'];
  themeColors: Record<string, string>;
  analysisMode: string;
  onModeChange: (modeId: string) => void;
  isAnalyzing: boolean;
  onClipboard: () => void;
  onFileSelect: (files: FileList) => void;
  onUrlPaste: (url: string) => void;
}

const InputSection = ({
  config, themeColors: colors, analysisMode, onModeChange, isAnalyzing,
  onClipboard, onFileSelect, onUrlPaste,
}: InputSectionProps) => {
  const lang = config.prefLang;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px 20px 8px', flexShrink: 0 }}>
      {/* 顶部模式切换：采用类似 iOS 分段控制器 (Segmented Control) 的柔和设计 */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ 
          display: 'flex', 
          gap: 4, 
          backgroundColor: colors.grayBg, 
          borderRadius: 12, 
          padding: 4, 
          flexWrap: 'wrap',
          border: `1px solid ${colors.border}`
        }}>
          {config.modeProfiles.map((m) => {
            const isActive = analysisMode === m.id;
            return (
              <button 
                key={m.id} 
                onClick={() => onModeChange(m.id)}
                style={{
                  padding: '6px 20px', 
                  borderRadius: 8, 
                  border: 'none', 
                  cursor: 'pointer',
                  fontSize: 13, 
                  fontWeight: isActive ? 600 : 500,
                  backgroundColor: isActive ? colors.bg : 'transparent',
                  color: isActive ? colors.textHeader : colors.text,
                  boxShadow: isActive ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.2s ease', 
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={e => {
                  if (!isActive) e.currentTarget.style.color = colors.textHeader;
                }}
                onMouseLeave={e => {
                  if (!isActive) e.currentTarget.style.color = colors.text;
                }}
              >
                {lang === 'zh' ? m.name.zh : m.name.en}
              </button>
            );
          })}
        </div>
      </div>

      {/* 核心输入区域 */}
      <div>
        <ImageDropZone
          config={config} 
          colors={colors} 
          isAnalyzing={isAnalyzing}
          onClipboard={onClipboard} 
          onFileSelect={onFileSelect}
          onUrlPaste={onUrlPaste}
        />
      </div>
    </div>
  );
};

export default InputSection;