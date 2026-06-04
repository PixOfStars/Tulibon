import { useState, useEffect } from 'react';
import { loadImageFromDisk } from '../utils/helpers';

interface DiskImageProps {
  path: string;
  alt?: string;
  style?: React.CSSProperties;
  className?: string;
}

/** Lazy-loads an image from disk path. Falls back to using path directly (for base64 data URLs). */
function DiskImage({ path, alt = '', style, className }: DiskImageProps) {
  const [src, setSrc] = useState<string>('');

  useEffect(() => {
    let cancelled = false;

    // If it's already a data URL or http URL, use directly
    if (path.startsWith('data:') || path.startsWith('http')) {
      setSrc(path);
      return;
    }

    // Otherwise load from disk
    loadImageFromDisk(path).then(dataUrl => {
      if (!cancelled) setSrc(dataUrl);
    }).catch(() => {
      if (!cancelled) setSrc(''); // keep empty on error
    });

    return () => { cancelled = true; };
  }, [path]);

  if (!src) {
    return <div style={{
      ...style,
      backgroundColor: 'rgba(128,128,128,0.1)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} />;
  }

  return <img src={src} alt={alt} style={style} className={className} />;
}

export default DiskImage;
