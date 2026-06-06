import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const host = undefined

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    host: host || false,
    port: 5173,
    strictPort: true,
    hmr: host ? { protocol: 'ws', host, port: 5174 } : undefined,
    watch: { ignored: ['**/src-tauri/**'] },
  },
  build: {
    rollupOptions: {
      // @tauri-apps/api packages are marked as external because they are
      // provided by the Tauri webview at runtime (not bundled by Vite).
      // The frontend code in src/utils/tauri.ts attempts a dynamic import
      // of these packages first, falling back to __TAURI_INTERNALS__ only
      // when the official packages are unavailable.
      // 
      // IMPORTANT: do NOT remove these externals unless you also update
      // tauri.ts to statically import @tauri-apps/api/core.  The dynamic
      // import pattern relies on these being resolved at runtime.
      external: [
        '@tauri-apps/api/window',
        '@tauri-apps/api/core',
        '@tauri-apps/api/event',
        '@tauri-apps/plugin-dialog',
        '@tauri-apps/plugin-fs',
        '@tauri-apps/plugin-updater',
        '@tauri-apps/plugin-clipboard-manager',
        '@tauri-apps/plugin-global-shortcut',
        '@tauri-apps/plugin-shell',
      ],
    },
  },
})
