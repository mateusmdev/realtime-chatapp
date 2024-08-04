import { defineConfig } from 'vite'
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        app: resolve(__dirname, 'app.html'),
      }
    },
    outdir: '../../dist'
  }
})