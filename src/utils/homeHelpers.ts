import type { CropRect } from '../types';

export function doCrop(dataUrl: string, rect: CropRect): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = rect.width;
      canvas.height = rect.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
      resolve(canvas.toDataURL());
    };
    img.src = dataUrl;
  });
}

export const iconBtnStyle = (colors: Record<string, string>): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '8px 14px', borderRadius: 10, border: `1px solid ${colors.border}`,
  backgroundColor: 'transparent', color: colors.textHeader,
  fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
});

export const smallBtnStyle = (colors: Record<string, string>): React.CSSProperties => ({
  padding: '6px 14px', borderRadius: 6, border: `1px solid ${colors.border}`,
  backgroundColor: 'transparent', color: colors.text, fontSize: 11, fontWeight: 600, cursor: 'pointer',
});
