import { useCallback, useRef } from 'react';
import type { AnalysisRecord, AnalysisResult, ImageSource, Tag, CropRect, ProviderConfig, ModeProfile, StylePreset } from '../../types';
import { analyzeImage } from '../../api';
import { generateId, saveImageToDisk } from '../../utils/helpers';
import { doCrop } from './HomeHelpers';

interface UseAnalysisProps {
  activeProviderConfig: ProviderConfig;
  quickSave: boolean;
  needApiKey: string;
  tags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
  setStatus: (s: 'idle' | 'loading' | 'done' | 'error') => void;
  setErrorMsg: (msg: string) => void;
  modeProfiles: ModeProfile[];
  stylePresets: StylePreset[];
}

export function useAnalysis({ activeProviderConfig, quickSave, needApiKey, tags, onTagsChange, setStatus, setErrorMsg, modeProfiles, stylePresets }: UseAnalysisProps) {
  // Use refs for frequently-changing values to avoid invalidating useCallback on every tag change
  const tagsRef = useRef(tags);
  tagsRef.current = tags;
  const onTagsChangeRef = useRef(onTagsChange);
  onTagsChangeRef.current = onTagsChange;

  const runAnalysis = useCallback(async (
    imageDataUrl: string, profileId: string, source: ImageSource, crop?: CropRect,
  ): Promise<AnalysisRecord | null> => {
    if (!activeProviderConfig.apiKey) { setErrorMsg(needApiKey); setStatus('error'); return null; }
    setStatus('loading');
    let finalImage = imageDataUrl;
    if (crop) finalImage = await doCrop(imageDataUrl, crop);
    try {
      const modeProfile = modeProfiles.find(m => m.id === profileId);
      const result: AnalysisResult = await analyzeImage(activeProviderConfig, finalImage, modeProfile, stylePresets);
      const now = Date.now();
      const zhTags = result.systemTags?.zh || [];
      const enTags = result.systemTags?.en || [];
      const totalTags = Math.max(zhTags.length, enTags.length);
      const newTags: Tag[] = [];
      const systemTagIds: string[] = [];
      const currentTags = tagsRef.current;
      for (let i = 0; i < totalTags; i++) {
        const zhName = zhTags[i] || enTags[i] || '';
        const enName = enTags[i] || zhTags[i] || '';
        const existing = currentTags.find(tg => tg.name.zh === zhName);
        if (existing) {
          systemTagIds.push(existing.id);
        } else {
          const tagId = `tag_${generateId()}`;
          newTags.push({ id: tagId, name: { zh: zhName, en: enName }, source: 'system', createdAt: now });
          systemTagIds.push(tagId);
        }
      }
      if (newTags.length > 0) onTagsChangeRef.current([...currentTags, ...newTags]);
      const recordId = generateId();
      const imagePath = await saveImageToDisk(recordId, finalImage);
      // Derive analysisMode from the modeProfile's modeType (e.g., 'design' or 'ocr')
      const analysisMode: AnalysisRecord['analysisMode'] =
        (modeProfile?.modeType as AnalysisRecord['analysisMode']) || 'design';
      const record: AnalysisRecord = {
        id: recordId,
        imagePath,
        source,
        analysisMode,
        summary: result.summary,
        systemTags: systemTagIds,
        userTags: [],
        collectionIds: quickSave ? ['__inbox'] : ['__inbox'],
        modeData: result.modeData,
        createdAt: now, updatedAt: now,
      };
      return record;
    } catch (e) { setErrorMsg(e instanceof Error ? e.message : String(e)); setStatus('error'); return null; }
  }, [activeProviderConfig, quickSave, needApiKey, setStatus, setErrorMsg, modeProfiles, stylePresets]);

  return runAnalysis;
}
