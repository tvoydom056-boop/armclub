/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react(), {
    name: 'reload-painted-art',
    handleHotUpdate({ file, server }) {
      // Phaser загружает public/art только при старте: замена PNG требует новой сцены.
      if (file.replace(/\\/g, '/').includes('/public/art/') && file.endsWith('.png')) {
        server.ws.send({ type: 'full-reload' });
        return [];
      }
    },
  }],
  server: { port: 5173, strictPort: true },
  build: { chunkSizeWarningLimit: 2000 },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
