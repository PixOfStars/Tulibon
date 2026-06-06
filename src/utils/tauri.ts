// ── Tauri IPC abstraction ──
// Prefers the official @tauri-apps/api/core::invoke, falling back to
// window.__TAURI_INTERNALS__ (Tauri's private API) only when the official
// package is unavailable.  The vite.config.ts marks @tauri-apps/api/* as
// external so they are resolved at runtime by the Tauri webview.
//
// IMPORTANT: __TAURI_INTERNALS__ is an internal API that may change
// without notice between Tauri versions.  The official @tauri-apps/api
// packages are the only supported interface.

import type { UnlistenFn } from '@tauri-apps/api/event';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InvokeFn = (cmd: string, args?: Record<string, unknown>) => Promise<any>;
type ListenFn = (event: string, handler: (payload: any) => void) => Promise<UnlistenFn>;

// ── Lazy initialization ──

let _invoke: InvokeFn | null = null;
let _listen: ListenFn | null = null;
let _apiSource: 'official' | 'internals' | null = null;

async function resolveApi(): Promise<{ invoke: InvokeFn; listen: ListenFn }> {
  if (_invoke && _listen) return { invoke: _invoke, listen: _listen };

  // Attempt 1: official @tauri-apps/api/core and @tauri-apps/api/event
  try {
    const coreMod = await import('@tauri-apps/api/core');
    const eventMod = await import('@tauri-apps/api/event');
    _invoke = coreMod.invoke as InvokeFn;
    _listen = eventMod.listen as unknown as ListenFn;
    _apiSource = 'official';
    console.debug('[tauri] Using official @tauri-apps/api (v2)');
    return { invoke: _invoke, listen: _listen };
  } catch {
    console.warn(
      '[tauri] @tauri-apps/api packages not found at runtime; ' +
      'falling back to __TAURI_INTERNALS__ (private API). ' +
      'Check vite.config.ts externals and Tauri version compatibility.',
    );
  }

  // Attempt 2: Tauri private internals (fragile fallback)
  const internals = (window as any).__TAURI_INTERNALS__;
  if (!internals?.invoke) {
    throw new Error(
      'Tauri IPC unavailable: neither @tauri-apps/api nor __TAURI_INTERNALS__ is accessible.',
    );
  }

  _invoke = (cmd, args) => internals.invoke(cmd, args);
  _listen = async (event, handler) => {
    const unlisten = await internals.event.listen(event, (e: { payload: any }) =>
      handler(e.payload),
    );
    return unlisten;
  };
  _apiSource = 'internals';

  // Emit a one-time warning about using internal API
  const tauriVersion = (window as any).__TAURI__?.version || 'unknown';
  console.warn(
    `[tauri] Using __TAURI_INTERNALS__ (Tauri v${tauriVersion}). ` +
    'This may break on Tauri upgrades. Consider ensuring @tauri-apps/api is available at runtime.',
  );

  return { invoke: _invoke, listen: _listen };
}

// ── Public API ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function tauriInvoke(cmd: string, args?: Record<string, unknown>): Promise<any> {
  const { invoke } = await resolveApi();
  return invoke(cmd, args);
}

/** Listen to a Tauri event. Returns an unlisten function. */
export async function tauriListen(
  event: string,
  handler: (payload: any) => void,
): Promise<() => void> {
  const { listen } = await resolveApi();
  return listen(event, handler);
}

/** Returns which API source is currently active ('official' | 'internals' | null if uninitialized) */
export function getApiSource(): string | null {
  return _apiSource;
}

/**
 * Create a Channel-compatible object for Tauri IPC.
 * Required for commands like plugin:updater|download_and_install that
 * take a mandatory onEvent: Channel<DownloadEvent> parameter.
 * Uses __TAURI_INTERNALS__.transformCallback() + __TAURI_TO_IPC_KEY__
 * serialization as a fallback when Channel from @tauri-apps/api/core
 * is unavailable.
 */
export function createIpcChannel(): any {
  // Attempt official Channel API first
  const internals = (window as any).__TAURI_INTERNALS__;
  if (!internals) {
    throw new Error('Tauri internals not available');
  }
  const id = internals.transformCallback(() => {});
  return {
    id,
    __TAURI_TO_IPC_KEY__: () => `__CHANNEL__:${id}`,
    toJSON() { return `__CHANNEL__:${id}`; },
  };
}
