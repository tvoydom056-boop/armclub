import { defineConfig } from '@playwright/test';

/**
 * Сравнение листа поз с эталоном (tests/visual/sheet.spec.mjs): npm run test:visual.
 * Свой dev-сервер на отдельном порту — не мешает открытым 5173/5174. WebGL в headless через SwiftShader:
 * программный рендер даёт одинаковые кадры от запуска к запуску.
 */
const PORT = 5179;

export default defineConfig({
  testDir: 'tests/visual',
  // лист снимает 21 кадр по очереди; бойцы идут друг за другом, параллельно — только дольше
  workers: 1,
  timeout: 180_000,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    browserName: 'chromium',
    viewport: { width: 1280, height: 900 },
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  },
  webServer: {
    command: `node node_modules/vite/bin/vite.js --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
