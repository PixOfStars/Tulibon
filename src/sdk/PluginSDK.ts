// ===================================================================
// PluginSDK — 壳暴露给插件的全局 API
// 通过 window.__PLUGIN_SDK__ 提供给每个插件
// ===================================================================

import type { AnalysisRecord, Collection, Tag, AppConfig } from "../types";
import { tauriInvoke } from "../utils/tauri";
import type { AppTheme } from "../theme";

export interface PluginManifest {
  id: string;
  name: { zh: string; en: string };
  version: string;
  entry: string;
  icon: string;
  order?: number;
  permissions?: string[];
  description?: { zh: string; en: string };
  routes?: { main?: string; settings?: string };
}

export interface PluginSDK {
  meta: {
    pluginId: string;
    version: string;
  };
  host: {
    lang: "zh" | "en";
    theme: AppTheme;
    config: AppConfig;
  };
  api: PluginAPI;
  config: PluginConfig;
  events: PluginEvents;
  ui: PluginUI;
  lib: {
    React: unknown;
    ReactDOM: unknown;
  };
}

export interface PluginAPI {
  getRecords(): Promise<AnalysisRecord[]>;
  deleteRecord(id: string): Promise<void>;
  exportRecord(id: string, format: "txt" | "md"): Promise<void>;

  getCollections(): Promise<Collection[]>;
  getCollectionRecords(collectionId: string): Promise<AnalysisRecord[]>;
  addToCollection(recordId: string, collectionId: string): Promise<void>;
  removeFromCollection(recordId: string, collectionId: string): Promise<void>;

  searchRecords(query: string): Promise<AnalysisRecord[]>;

  getTags(): Promise<Tag[]>;
  addTag(recordId: string, tag: Tag): Promise<void>;
  removeTag(recordId: string, tagId: string): Promise<void>;

  toggleFavorite(recordId: string): Promise<void>;

  // OCR
  runOcr(imageBase64: string, lang: string): Promise<string>;
  checkOcrSupport(lang: string): Promise<{ available: boolean; engine?: string }>;
}

export interface PluginConfig {
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<void>;
}

export interface PluginEvents {
  on(event: string, handler: (payload: unknown) => void): () => void;
  emit(event: string, payload: unknown): void;
}

export interface PluginUI {
  mount(container: HTMLElement): void;
  unmount(): void;
}

// ── Event bus for plugin ↔ shell communication ──

const listeners = new Map<string, Set<(payload: unknown) => void>>();

function createEventBus(): PluginEvents {
  return {
    on(event: string, handler: (payload: unknown) => void) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(handler);
      return () => listeners.get(event)?.delete(handler);
    },
    emit(event: string, payload: unknown) {
      listeners.get(event)?.forEach((fn) => fn(payload));
    },
  };
}

// ── API implementation (uses IPC directly) ──

function createAPI(): PluginAPI {
  return {
    async getRecords() {
      return (await tauriInvoke("load_history")) as AnalysisRecord[];
    },
    async deleteRecord(id: string) {
      const records = (await tauriInvoke("load_history")) as AnalysisRecord[];
      const filtered = records.filter((r) => r.id !== id);
      await tauriInvoke("save_history", { records: filtered as unknown as unknown as Record<string, unknown> });
    },
    async exportRecord(id: string, format: "txt" | "md") {
      await tauriInvoke("export_record", { id, format });
    },

    async getCollections() {
      return (await tauriInvoke("load_collections")) as Collection[];
    },
    async getCollectionRecords(collectionId: string) {
      const records = (await tauriInvoke("load_history")) as AnalysisRecord[];
      const collections = (await tauriInvoke("load_collections")) as Collection[];
      // Find collection members (stored in App.tsx as __favorites record list)
      // Simplified: search records that have tag matching collection name
      const collection = collections.find((c: Collection) => c.id === collectionId);
      if (!collection) return [];
      return records.filter((r: AnalysisRecord) =>
        r.userTags?.some((t: string) => t.includes(collectionId))
      );
    },
    async addToCollection(recordId: string, collectionId: string) {
      // Update record's tags to include collection reference
      const records = (await tauriInvoke("load_history")) as AnalysisRecord[];
      const record = records.find((r: AnalysisRecord) => r.id === recordId);
      if (record) {
        const tags = record.userTags || [];
        if (!tags.includes(collectionId)) {
          (record as unknown as Record<string, unknown>).tags = [...tags, collectionId];
          await tauriInvoke("save_history", { records: records as unknown as unknown as Record<string, unknown> });
        }
      }
    },
    async removeFromCollection(recordId: string, collectionId: string) {
      const records = (await tauriInvoke("load_history")) as AnalysisRecord[];
      const record = records.find((r: AnalysisRecord) => r.id === recordId);
      if (record) {
        const tags = (record.userTags || []).filter((t: string) => t !== collectionId);
        (record as unknown as Record<string, unknown>).tags = tags;
        await tauriInvoke("save_history", { records: records as unknown as unknown as Record<string, unknown> });
      }
    },

    async searchRecords(query: string) {
      const records = (await tauriInvoke("load_history")) as AnalysisRecord[];
      const q = query.toLowerCase();
      return records.filter(
        (r: AnalysisRecord) =>
          String(r.summary?.zh || '').toLowerCase().includes(q) ||
          String(r.summary?.en || '').toLowerCase().includes(q) ||
          r.userTags?.some((t: string) => t.toLowerCase().includes(q))
      );
    },

    async getTags() {
      return (await tauriInvoke("load_tags")) as Tag[];
    },
    async addTag(recordId: string, tag: Tag) {
      const records = (await tauriInvoke("load_history")) as AnalysisRecord[];
      const record = records.find((r: AnalysisRecord) => r.id === recordId);
      if (record) {
        const tags = [...(record.userTags || [])];
        if (!tags.includes(tag.id)) {
          tags.push(tag.id);
          (record as unknown as Record<string, unknown>).tags = tags;
          await tauriInvoke("save_history", { records: records as unknown as unknown as Record<string, unknown> });
        }
      }
    },
    async removeTag(recordId: string, tagId: string) {
      const records = (await tauriInvoke("load_history")) as AnalysisRecord[];
      const record = records.find((r: AnalysisRecord) => r.id === recordId);
      if (record) {
        (record as unknown as Record<string, unknown>).tags = (record.userTags || []).filter(
          (t: string) => t !== tagId
        );
        await tauriInvoke("save_history", { records: records as unknown as unknown as Record<string, unknown> });
      }
    },

    async toggleFavorite(recordId: string) {
      const records = (await tauriInvoke("load_history")) as AnalysisRecord[];
      const record = records.find((r: AnalysisRecord) => r.id === recordId);
      if (record) {
        (record as unknown as Record<string, unknown>).favorite = !(record as unknown as Record<string, unknown>).favorite;
        await tauriInvoke("save_history", { records: records as unknown as unknown as Record<string, unknown> });
      }
    },

    async runOcr(imageBase64: string, lang: string) {
      return (await tauriInvoke("run_windows_ocr", { imageBase64, lang })) as string;
    },
    async checkOcrSupport(lang: string) {
      const result = (await tauriInvoke("check_windows_ocr", { lang })) as unknown as Record<string, unknown>;
      return { available: !!result?.available, engine: (result?.engine as string) || 'windows' };
    },
  };
}

// ── Plugin config (scoped to plugin ID, managed by Core) ──

function createPluginConfig(pluginId: string): PluginConfig {
  return {
    async get(key: string) {
      return tauriInvoke('get_plugin_config', { pluginId, key });
    },
    async set(key: string, value: any) {
      await tauriInvoke('set_plugin_config', { pluginId, key, value });
    },
  };
}

// ── Inject SDK for a specific plugin ──

let currentPluginId: string | null = null;

export function injectPluginSDK(
  pluginId: string,
  manifest: PluginManifest,
  hostConfig: { lang: "zh" | "en"; theme: AppTheme; config: AppConfig }
) {
  // Clean previous
  if (currentPluginId) {
    delete (window as unknown as Record<string, unknown>).__PLUGIN_SDK__;
  }

  const sdk: PluginSDK = {
    meta: { pluginId, version: manifest.version },
    host: hostConfig,
    api: createAPI(),
    config: createPluginConfig(pluginId),
    events: createEventBus(),
    ui: {
      mount(_container: HTMLElement) {},
      unmount() {},
    },
    lib: {
      React: (window as unknown as Record<string, unknown>).React,
      ReactDOM: (window as unknown as Record<string, unknown>).ReactDOM,
    },
  };

  (window as unknown as Record<string, unknown>).__PLUGIN_SDK__ = sdk;
  currentPluginId = pluginId;

  return sdk;
}

export function clearPluginSDK() {
  if (currentPluginId) {
    delete (window as unknown as Record<string, unknown>).__PLUGIN_SDK__;
    currentPluginId = null;
  }
}
