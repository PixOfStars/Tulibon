import { useState, useRef, useEffect, useCallback } from 'react';
import type { AnalysisRecord } from '../types';

export function useUndoManager() {
  const [undoData, setUndoData] = useState<{ prevHistory: AnalysisRecord[]; message: string } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!undoData) return;
    undoTimerRef.current = setTimeout(() => setUndoData(null), 5000);
    return () => clearTimeout(undoTimerRef.current);
  }, [undoData]);

  const triggerUndo = useCallback((d: { prevHistory: AnalysisRecord[]; message: string } | null) => {
    setUndoData(d);
  }, []);

  const handleUndo = useCallback((onRecordsChange: (records: AnalysisRecord[]) => void, onClear: () => void) => {
    if (!undoData) return;
    clearTimeout(undoTimerRef.current);
    onRecordsChange(undoData.prevHistory);
    setUndoData(null);
    onClear();
  }, [undoData]);

  const dismissUndo = useCallback(() => {
    clearTimeout(undoTimerRef.current);
    setUndoData(null);
  }, []);

  return { undoData, triggerUndo, handleUndo, dismissUndo };
}
