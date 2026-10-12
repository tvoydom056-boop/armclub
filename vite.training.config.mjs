import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** Приёмка идёт без HMR: параллельные правки карьеры не перезагружают подход. */
export default defineConfig({ plugins: [react()], server: { hmr: false, watch: null } });
