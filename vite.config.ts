/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { saveRigPlugin } from './tools/saveRigPlugin.mjs';

export default defineConfig({
  plugins: [react(), saveRigPlugin(), {
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
  // tools/*.test.mjs — проверки файлов на диске (без типов Node в tsconfig)
  test: { environment: 'node', include: ['src/**/*.test.ts', 'tools/**/*.test.mjs'] },
});
