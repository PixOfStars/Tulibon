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
    // Single-pass: find the target record once and compute the new state
    const targetRecord = records.find(r => r.id === recordId);
    if (!targetRecord) return;
    const wasIn = targetRecord.collectionIds.includes(collectionId);
    const newCollectionIds = wasIn
      ? targetRecord.collectionIds.filter(cid => cid !== collectionId)
      : [...targetRecord.collectionIds, collectionId];

    const updated = records.map(r =>
      r.id === recordId ? { ...r, updatedAt: Date.now(), collectionIds: newCollectionIds } : r,
    );
    onRecordsChange(updated);
    if (currentResult?.id === recordId) {
      setCurrentResult({ ...currentResult, updatedAt: Date.now(), collectionIds: newCollectionIds });
    }
    const coll = collections.find(c => c.id === collectionId);
    const collName = coll ? (config.prefLang === 'zh' ? coll.name.zh : coll.name.en) : collectionId;
    toast.show(
      wasIn
        ? t.removedFromCollection.replace('{name}', collName)
        : t.savedToCollection.replace('{name}', collName),
      wasIn ? 'info' : 'success'
    );
  }, [records, currentResult, collections, config.prefLang, toast, onRecordsChange, setCurrentResult]);

  const deleteRecord = useCallback(async (id: string, setUndoData: (d: { prevHistory: AnalysisRecord[]; message: string } | null) => void) => {
    const prev = [...records];
    setUndoData({ prevHistory: prev, message: t.undoDelete });
    onRecordsChange(records.filter(r => r.id !== id));
    if (currentResult?.id === id) setCurrentResult(null);
    setStatus('idle');
    // Backend: delete record from history + clean up associated image in one atomic operation
    tauriInvoke('delete_record_by_id', { recordId: id }).catch(() => {});
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
        // __TAURI_INTERNALS__ invoke is used here because the public
        // tauriInvoke wrapper cannot pass raw Uint8Array arguments.
        // This is a known limitation — the fs plugin requires binary
        // data as a raw IPC argument rather than a JSON-serializable object.
        const internals = (window as any).__TAURI_INTERNALS__;
        if (!internals?.invoke) {
          throw new Error('Tauri IPC not available');
        }
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
