import { useCallback } from 'react';
import type { AnalysisRecord, Collection } from '../../types';
import { exportAsTxt, exportAsMarkdown } from '../../utils/helpers';
import { tauriInvoke } from '../../utils/tauri';
import type { useToast } from '../Toast';

interface UseHomeActionsProps {
  records: AnalysisRecord[];
  collections: Collection[];
  currentResult: AnalysisRecord | null;
  config: { prefLang: 'zh' | 'en' };
  t: Record<string, string>;
  onRecordsChange: (records: AnalysisRecord[]) => void;
  setCurrentResult: (r: AnalysisRecord | null) => void;
  setStatus: (s: 'idle') => void;
  toast: ReturnType<typeof useToast>;
}

export function useHomeActions({
  records, collections, currentResult, config, t, onRecordsChange, setCurrentResult, setStatus, toast,
}: UseHomeActionsProps) {
  const toggleCollection = useCallback(async (recordId: string, collectionId: string) => {
    const updated = records.map(r => {
      if (r.id !== recordId) return r;
      const has = r.collectionIds.includes(collectionId);
      return { ...r, updatedAt: Date.now(), collectionIds: has ? r.collectionIds.filter(cid => cid !== collectionId) : [...r.collectionIds, collectionId] };
    });
    onRecordsChange(updated);
    if (currentResult?.id === recordId) {
      const has = currentResult.collectionIds.includes(collectionId);
      setCurrentResult({ ...currentResult, updatedAt: Date.now(), collectionIds: has ? currentResult.collectionIds.filter(cid => cid !== collectionId) : [...currentResult.collectionIds, collectionId] });
    }
    const coll = collections.find(c => c.id === collectionId);
    const collName = coll ? (config.prefLang === 'zh' ? coll.name.zh : coll.name.en) : collectionId;
    const record = records.find(r => r.id === recordId);
    const wasIn = record?.collectionIds.includes(collectionId);
    toast.show(
      wasIn
        ? t.removedFromCollection.replace('{name}', collName)
        : t.savedToCollection.replace('{name}', collName),
      wasIn ? 'info' : 'success'
    );
  }, [records, currentResult, collections, config.prefLang, toast, onRecordsChange, setCurrentResult]);

  const deleteRecord = useCallback(async (id: string, setUndoData: (d: { prevHistory: AnalysisRecord[]; message: string } | null) => void) => {
    const prev = [...records];
    const target = records.find(r => r.id === id);
    setUndoData({ prevHistory: prev, message: t.undoDelete });
    onRecordsChange(records.filter(r => r.id !== id));
    if (currentResult?.id === id) setCurrentResult(null);
    setStatus('idle');
    // Delete image from disk
    if (target?.imagePath && !target.imagePath.startsWith('data:')) {
      tauriInvoke('delete_image', { path: target.imagePath }).catch(() => {});
    }
  }, [records, currentResult, t.undoDelete, onRecordsChange, setCurrentResult, setStatus]);

  const exportRecord = useCallback(async (record: AnalysisRecord, format: 'txt' | 'md') => {
    const labels = {
      report: t.exportReport,
      summary: t.exportSectionSummary,
      tags: t.exportSectionTags,
      analysis: t.exportSectionAnalysis,
    };
    const content = format === 'txt'
      ? exportAsTxt(record, config.prefLang, labels)
      : exportAsMarkdown(record, config.prefLang, labels);
    try {
      const ext = format === 'txt' ? 'txt' : 'md';
      const filePath = await tauriInvoke('plugin:dialog|save', { options: { defaultPath: `tulibon-analysis.${ext}` } });
      if (filePath && typeof filePath === 'string') {
        const internals = (window as any).__TAURI_INTERNALS__;
        const encoder = new TextEncoder();
        await internals.invoke(
          'plugin:fs|write_text_file',
          encoder.encode(content),
          {
            headers: {
              path: encodeURIComponent(filePath),
              options: '{}',
            },
          },
        );
        toast.show(t.exportSuccess, 'success');
      }
    } catch (e) {
      if (e && typeof e === 'string' && e.includes('cancelled')) return;
      toast.show(`${t.exportFailed}: ${String(e)}`, 'error');
    }
  }, [config.prefLang, t, toast]);

  return { toggleCollection, deleteRecord, exportRecord };
}
