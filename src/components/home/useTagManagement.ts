import { useCallback } from 'react';
import type { AnalysisRecord, Tag } from '../../types';

export function useTagManagement(
  records: AnalysisRecord[],
  tags: Tag[],
  currentResult: AnalysisRecord | null,
  onRecordsChange: (records: AnalysisRecord[]) => void,
  onTagsChange: (tags: Tag[]) => void,
  setCurrentResult: (r: AnalysisRecord | null) => void,
) {
  const handleAddUserTag = useCallback((recordId: string, name: { zh: string; en: string }) => {
    const tagId = `tag_${name.zh.toLowerCase().replace(/\s+/g, '_')}`;
    let newTags = [...tags];
    if (!newTags.find(t => t.id === tagId)) {
      newTags.push({ id: tagId, name, source: 'user' as const, createdAt: Date.now() });
    }
    const newRecords = records.map(r =>
      r.id === recordId ? { ...r, userTags: [...new Set([...r.userTags, tagId])], updatedAt: Date.now() } : r
    );
    onRecordsChange(newRecords);
    onTagsChange(newTags);
    if (currentResult?.id === recordId) {
      setCurrentResult(newRecords.find(r => r.id === recordId) || null);
    }
  }, [records, tags, currentResult, onRecordsChange, onTagsChange, setCurrentResult]);

  const handleRemoveUserTag = useCallback((recordId: string, tagId: string) => {
    const newRecords = records.map(r =>
      r.id === recordId ? { ...r, userTags: r.userTags.filter(tid => tid !== tagId), updatedAt: Date.now() } : r
    );
    onRecordsChange(newRecords);
    if (currentResult?.id === recordId) {
      setCurrentResult(newRecords.find(r => r.id === recordId) || null);
    }
  }, [records, currentResult, onRecordsChange, setCurrentResult]);

  return { handleAddUserTag, handleRemoveUserTag };
}
