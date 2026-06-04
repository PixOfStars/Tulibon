// Direct IPC via __TAURI_INTERNALS__ — dynamic import() of @tauri-apps/api/*
// fails in production because Vite externals leave bare specifiers unresolved.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function tauriInvoke(cmd: string, args?: Record<string, unknown>): Promise<any> {
  return (window as any).__TAURI_INTERNALS__.invoke(cmd, args);
}

/** Listen to a Tauri event. Returns an unlisten function. */
export async function tauriListen(
  event: string,
  handler: (payload: any) => void,
): Promise<() => void> {
  const unlisten = await (window as any).__TAURI_INTERNALS__.event.listen(
    event,
    (e: { payload: any }) => handler(e.payload),
  );
  return unlisten;
}

/**
 * Create a Channel-compatible object for Tauri IPC.
 * Required for commands like plugin:updater|download_and_install that
 * take a mandatory onEvent: Channel<DownloadEvent> parameter.
 * Uses __TAURI_INTERNALS__.transformCallback() + __TAURI_TO_IPC_KEY__ serialization
 * instead of importing Channel from @tauri-apps/api/core (which fails in production).
 */
export function createIpcChannel(): any {
  const internals = (window as any).__TAURI_INTERNALS__;
  const id = internals.transformCallback(() => {});
  return {
    id,
    __TAURI_TO_IPC_KEY__: () => `__CHANNEL__:${id}`,
    toJSON() { return `__CHANNEL__:${id}`; },
  };
}
