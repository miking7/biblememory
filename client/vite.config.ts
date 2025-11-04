import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: '../server/public/dist',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  }
})
