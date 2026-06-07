import { useState, useRef } from 'react';
import type { CropRect } from '../types';

export function useCropHandlers() {
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const draggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const handleCropMouseDown = (e: React.MouseEvent) => {
    const img = (e.currentTarget as HTMLElement).querySelector('img')!;
    const imgRect = img.getBoundingClientRect();
    const scaleX = img.naturalWidth / imgRect.width;
    const scaleY = img.naturalHeight / imgRect.height;
    const x = (e.clientX - imgRect.left) * scaleX;
    const y = (e.clientY - imgRect.top) * scaleY;
    draggingRef.current = true;
    dragStartRef.current = { x: Math.max(0, x), y: Math.max(0, y) };
    setCropRect({ x: Math.max(0, x), y: Math.max(0, y), width: 1, height: 1 });
  };

  const handleCropMouseMove = (e: React.MouseEvent) => {
    if (!draggingRef.current) return;
    const img = (e.currentTarget as HTMLElement).querySelector('img')!;
    const imgRect = img.getBoundingClientRect();
    const scaleX = img.naturalWidth / imgRect.width;
    const scaleY = img.naturalHeight / imgRect.height;
    const cx = Math.max(0, Math.min(img.naturalWidth, (e.clientX - imgRect.left) * scaleX));
    const cy = Math.max(0, Math.min(img.naturalHeight, (e.clientY - imgRect.top) * scaleY));
    setCropRect({ x: Math.min(dragStartRef.current.x, cx), y: Math.min(dragStartRef.current.y, cy), width: Math.abs(cx - dragStartRef.current.x), height: Math.abs(cy - dragStartRef.current.y) });
  };

  const handleCropMouseUp = () => { draggingRef.current = false; };

  return { cropRect, setCropRect, handleCropMouseDown, handleCropMouseMove, handleCropMouseUp };
}
