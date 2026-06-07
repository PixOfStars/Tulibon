import type { AppConfig } from '../../types';
import type { useToast } from '../common/Toast';

export interface TabProps {
  config: AppConfig;
  saveConfig: (config: AppConfig) => void;
  colors: Record<string, string>;
  lang: 'zh' | 'en';
  t: Record<string, string>;
  toast: ReturnType<typeof useToast>;
}
