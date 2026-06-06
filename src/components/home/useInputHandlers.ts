import { generateId, base64FromFile, base64FromUrl, clipboardToDataUrl } from '../../utils/helpers';
import type { BatchItem } from '../../types';
import type zh from '../../locales/zh.json';

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
  analysisMode, t, toast,
  setCropImage, setStatus, setBatchItems,
}: UseInputHandlersParams) {

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

  return { handleClipboard, handleUrlPaste, handleFileSelect };
}
