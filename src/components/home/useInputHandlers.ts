import { useRef, useEffect } from 'react';
import { generateId, base64FromFile, base64FromUrl, clipboardToDataUrl } from '../../utils/helpers';
import { tauriListen } from '../../utils/tauri';
import type { BatchItem } from '../../types';
import zh from '../../locales/zh.json';

interface UseInputHandlersParams {
  config: ReturnType<typeof import('../../hooks/usePreferences').usePreferences>['config'];
  analysisMode: string;
  t: typeof zh;
  toast: ReturnType<typeof import('../Toast').useToast>;
  setCropImage: (dataUrl: string | null) => void;
  setStatus: (status: 'idle' | 'loading' | 'done' | 'error') => void;
  setBatchItems: React.Dispatch<React.SetStateAction<BatchItem[]>>;
}

export function useInputHandlers({
  config, analysisMode, t, toast,
  setCropImage, setStatus, setBatchItems,
}: UseInputHandlersParams) {
  const dropRef = useRef<{ handleDropDataUrls?: (dataUrls: string[]) => void }>({});

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;
    tauriListen('file-drop', (dataUrls: string[]) => {
      if (cancelled) return;
      dropRef.current?.handleDropDataUrls?.(dataUrls);
    }).then(fn => { if (!cancelled) unlisten = fn; })
      .catch(e => { console.error('file-drop listener failed:', e); });
    return () => { cancelled = true; unlisten?.(); };
  }, []);

  const handleClipboard = async () => {
    try { const dataUrl = await clipboardToDataUrl(); setCropImage(dataUrl); setStatus('idle'); toast.show(t.clipboardLoaded, 'success'); }
    catch { toast.show(t.clipboardError, 'error'); }
  };

  const handleUrlPaste = async (url: string) => {
    try {
      toast.show(t.downloadImage, 'info');
      const dataUrl = await base64FromUrl(url);
      setCropImage(dataUrl);
      setStatus('idle');
      toast.show(t.imageDownloaded, 'success');
    } catch {
      toast.show(t.imageDownloadFailed, 'error');
    }
  };

  const handleFileSelect = async (files: FileList) => {
    if (files.length === 1) {
      try { const dataUrl = await base64FromFile(files[0]); setCropImage(dataUrl); setStatus('idle'); toast.show(t.imageLoaded, 'success'); }
      catch { toast.show(t.fileReadFailed, 'error'); }
    } else {
      for (const file of Array.from(files)) {
        try {
          const dataUrl = await base64FromFile(file);
          setBatchItems(prev => [...prev, { id: generateId(), imageDataUrl: dataUrl, analysisMode, status: 'queued' }]);
        } catch { /* */ }
      }
    }
  };

  const handleDropDataUrls = (dataUrls: string[]) => {
    if (!config.inputMethods.dragDrop) return;
    if (dataUrls.length === 1) {
      setCropImage(dataUrls[0]);
      setStatus('idle');
      toast.show(t.imageLoaded, 'success');
    } else {
      const items: BatchItem[] = dataUrls.map(dataUrl => ({
        id: generateId(), imageDataUrl: dataUrl, analysisMode, status: 'queued' as const,
      }));
      setBatchItems(prev => [...prev, ...items]);
      toast.show(t.imagesAddedToBatch.replace('{n}', String(items.length)), 'info');
    }
  };

  const handleDropFiles = async (files: File[]) => {
    if (files.length === 1) {
      try { const dataUrl = await base64FromFile(files[0]); setCropImage(dataUrl); setStatus('idle'); toast.show(t.imageLoaded, 'success'); }
      catch { toast.show(t.fileReadFailed, 'error'); }
    } else {
      const items: BatchItem[] = [];
      for (const file of files) {
        try { items.push({ id: generateId(), imageDataUrl: await base64FromFile(file), analysisMode, status: 'queued' }); } catch { /* */ }
      }
      if (items.length > 0) { setBatchItems(prev => [...prev, ...items]); toast.show(t.imagesAddedToBatch.replace('{n}', String(items.length)), 'info'); }
    }
  };

  dropRef.current = { handleDropDataUrls };

  return { handleClipboard, handleUrlPaste, handleFileSelect, handleDropDataUrls, handleDropFiles };
}
