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
      external: [
        '@tauri-apps/api/window',
        '@tauri-apps/api/core',
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
