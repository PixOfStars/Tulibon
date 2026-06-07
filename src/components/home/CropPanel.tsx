import { useRef } from 'react';
import { Scissors, X } from '@phosphor-icons/react';
import type { CropRect } from '../../types';
import { smallBtnStyle } from './HomeHelpers';
import { getT } from '../../utils/i18n';

interface CropPanelProps {
  cropImage: string;
  cropRect: CropRect | null;
  themeColors: Record<string, string>;
  lang: 'zh' | 'en';
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onCropReset: () => void;
  onCropConfirm: () => void;
  onCancel: () => void;
}

const CropPanel = ({
  cropImage, cropRect, themeColors: colors, lang,
  onMouseDown, onMouseMove, onMouseUp, onCropReset, onCropConfirm, onCancel,
}: CropPanelProps) => {
  const t = getT(lang);
  const cropRef = useRef<HTMLDivElement>(null);
  const hasValidCrop = cropRect && cropRect.width > 5 && cropRect.height > 5;
  const imgNatural = cropRef.current?.querySelector('img');

  return (
    <div style={{ padding: '6px 20px', flexShrink: 0 }}>
      <div style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${colors.accent}30`, backgroundColor: `${colors.accent}08`, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderBottom: `1px solid ${colors.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Scissors size={16} weight="bold" color={colors.accent} />
            <span style={{ fontSize: 12, fontWeight: 700, color: colors.textHeader }}>{t.cropTitle}</span>
            <span style={{ fontSize: 11, color: colors.text, opacity: 0.45 }}>{t.cropHint}</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={onCropReset} style={smallBtnStyle(colors)}>{t.cropReset}</button>
            <button onClick={onCropConfirm} style={{ ...smallBtnStyle(colors), backgroundColor: colors.accent, color: '#000', border: 'none' }}>{t.cropConfirm}</button>
          </div>
        </div>

        <div ref={cropRef} style={{ position: 'relative', cursor: 'crosshair', userSelect: 'none' }}
          onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp}>
          <img src={cropImage} alt="" style={{ width: '100%', maxHeight: '60vh', objectFit: 'contain', display: 'block' }} draggable={false} />

          {/* X close button top-right */}
          <button onClick={onCancel}
            style={{
              position: 'absolute', top: 6, right: 6,
              width: 24, height: 24, borderRadius: 6,
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff',
              zIndex: 2,
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,59,48,0.8)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.5)')}>
            <X size={14} weight="bold" />
          </button>

          {hasValidCrop && cropRect && (
            <div style={{
              position: 'absolute',
              left: `${(cropRect.x / (imgNatural?.naturalWidth || 1)) * 100}%`,
              top: `${(cropRect.y / (imgNatural?.naturalHeight || 1)) * 100}%`,
              width: `${(cropRect.width / (imgNatural?.naturalWidth || 1)) * 100}%`,
              height: `${(cropRect.height / (imgNatural?.naturalHeight || 1)) * 100}%`,
              border: `2px dashed ${colors.accent}`, backgroundColor: colors.accentBg, pointerEvents: 'none',
            }} />
          )}
        </div>
      </div>
    </div>
  );
};

export default CropPanel;
