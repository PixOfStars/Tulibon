import { useRef, useEffect } from 'react';
import { clipboardToDataUrl } from '../../utils/helpers';
import type { AnalysisRecord, ImageSource } from '../../types';
import { getT } from "../../utils/i18n";
import en from '../../locales/en.json';

interface UseGlobalShortcutsParams {
  handleClipboard: () => Promise<void>;
  handleSingleAnalysis: (imageDataUrl: string, profileId: string, source: ImageSource) => Promise<void>;
  analysisMode: string;
  currentResult: AnalysisRecord | null;
  config: ReturnType<typeof import('../../hooks/usePreferences').usePreferences>['config'];
  t: typeof zh;
  toast: ReturnType<typeof import('../Toast').useToast>;
  prefs: ReturnType<typeof import('../../hooks/usePreferences').usePreferences>;
  hidden: boolean;
}

export function useGlobalShortcuts(params: UseGlobalShortcutsParams) {
  const ref = useRef(params);
  ref.current = params;

  useEffect(() => {
    const handler = (e: Event) => {
      const action = (e as CustomEvent).detail?.action as string;
      const { handleClipboard: hc, handleSingleAnalysis: hsa, analysisMode: am, currentResult: cr, config: cfg, t: lt, toast: tst, prefs: p, hidden: h } = ref.current;
      if (!action || h) return;
      switch (action) {
        case 'clipboardRead':
          hc();
          break;
        case 'analyze':
          (async () => {
            try {
              tst.show(lt.loading, 'info');
              const dataUrl = await clipboardToDataUrl();
              hsa(dataUrl, am, 'clipboard');
            } catch {
              tst.show(lt.clipboardError, 'error');
            }
          })();
          break;
        case 'copyResult':
          if (cr) {
            const text = cfg.prefLang === 'zh' ? cr.summary.zh : cr.summary.en;
            navigator.clipboard.writeText(text).catch(() => {});
            tst.show(lt.copiedToClipboard, 'success');
          }
          break;
        case 'switchLang': {
          const newLang = cfg.prefLang === 'zh' ? 'en' : 'zh';
          p.saveConfig({ ...cfg, prefLang: newLang });
          const nextT = newLang === 'zh' ? zh : en;
          tst.show(nextT.langSwitched.replace('{lang}', nextT[newLang === 'zh' ? 'langZh' : 'langEn']), 'success');
          break;
        }
      }
    };
    window.addEventListener('global-shortcut', handler);
    return () => window.removeEventListener('global-shortcut', handler);
  }, []);
}
