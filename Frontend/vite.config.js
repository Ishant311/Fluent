import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
    process: { env: {} }
  },
  optimizeDeps: {
    include: ['simple-peer', 'buffer', 'process']
  },
  resolve: {
    alias: {
      buffer: 'buffer',
      process: 'process/browser',
      stream: 'stream-browserify',
      util: 'util'
    }
  },
  server: {
    port: 5173
  }
})
