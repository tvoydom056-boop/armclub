import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** Правки другого разработчика не перезагружают турнир во время браузерной приёмки. */
export default defineConfig({ plugins: [react()], server: { hmr: false, watch: null } });
