import { useRef, useState } from 'react';
import { ClipboardText, ImageSquare, Link } from '@phosphor-icons/react';
import { iconBtnStyle } from './HomeHelpers';
import zh from '../../locales/zh.json';
import en from '../../locales/en.json';

interface ImageDropZoneProps {
  config: ReturnType<typeof import('../../hooks/usePreferences').usePreferences>['config'];
  colors: Record<string, string>;
  isAnalyzing?: boolean;
  onClipboard: () => void;
  onFileSelect: (files: FileList) => void;
  onDropFiles: (files: File[]) => void;
  onUrlPaste: (url: string) => void;
}

const URL_RE = /^https?:\/\/\S+\.(png|jpe?g|webp|gif|bmp|svg)(\?\S*)?$/i;

const ImageDropZone = ({ config, colors, isAnalyzing, onClipboard, onFileSelect, onDropFiles, onUrlPaste }: ImageDropZoneProps) => {
  const t = config.prefLang === 'zh' ? zh : en;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [urlInput, setUrlInput] = useState('');

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (dropZoneRef.current) {
      dropZoneRef.current.style.borderColor = colors.accent;
      dropZoneRef.current.style.backgroundColor = colors.accentBg;
    }
  };
  const handleDragLeave = () => {
    if (dropZoneRef.current) {
      dropZoneRef.current.style.borderColor = colors.border;
      dropZoneRef.current.style.backgroundColor = 'transparent';
    }
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleDragLeave();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) onDropFiles(files);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (!config.inputMethods.urlPaste) return;
    const text = e.clipboardData.getData('text/plain').trim();
    if (URL_RE.test(text)) {
      e.preventDefault();
      onUrlPaste(text);
    }
  };

  const hasButtons = config.inputMethods.clipboard || config.inputMethods.filePicker;
  const showDragHint = config.inputMethods.dragDrop && !hasButtons;

  return (
    <div>
      <div
        ref={dropZoneRef}
        {...(config.inputMethods.dragDrop ? { onDrop: handleDrop, onDragOver: handleDragOver, onDragLeave: handleDragLeave } : {})}
        onPaste={handlePaste}
        style={{
          border: `2px dashed ${colors.border}`, borderRadius: 14, padding: hasButtons ? '20px' : '24px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          backgroundColor: 'transparent', transition: 'all 0.2s', minHeight: 64,
        }}>
        {config.inputMethods.clipboard && (
          <button onClick={onClipboard} disabled={isAnalyzing} style={iconBtnStyle(colors)}>
            <ClipboardText size={18} weight="bold" />
            <span style={{ fontSize: 11 }}>{t.fromClipboard}</span>
          </button>
        )}
        {config.inputMethods.filePicker && (
          <button onClick={() => fileInputRef.current?.click()} disabled={isAnalyzing} style={iconBtnStyle(colors)}>
            <ImageSquare size={18} weight="bold" />
            <span style={{ fontSize: 11 }}>{t.dragHere}</span>
          </button>
        )}
        {showDragHint && (
          <span style={{ fontSize: 12, color: colors.text, opacity: 0.4 }}>{t.hintDragDrop || t.dragHint}</span>
        )}
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
        onChange={(e) => { if (e.target.files && e.target.files.length > 0) onFileSelect(e.target.files); }} />

      {config.inputMethods.urlPaste && (
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px', borderRadius: 10, border: `1px solid ${colors.border}`, backgroundColor: colors.bg }}>
            <Link size={16} weight="bold" color={colors.text} style={{ flexShrink: 0 }} />
            <input
              type="text"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onPaste={e => {
                const text = e.clipboardData.getData('text/plain').trim();
                if (URL_RE.test(text)) {
                  e.preventDefault();
                  onUrlPaste(text);
                  setUrlInput('');
                }
              }}
              placeholder={t.urlPlaceholder}
              style={{ flex: 1, padding: '10px 0', border: 'none', background: 'none', color: colors.textHeader, fontSize: 12, outline: 'none' }}
              onKeyDown={e => {
                if (e.key === 'Enter' && urlInput.trim()) {
                  onUrlPaste(urlInput.trim());
                  setUrlInput('');
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageDropZone;
