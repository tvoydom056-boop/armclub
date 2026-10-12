import { defineConfig } from '@playwright/test';

/** Проверка лиг на отдельном порту; не мешает разработке тренировок. */
export default defineConfig({
  testDir: 'tests/visual',
  testMatch: 'leagues.spec.mjs',
  workers: 1,
  timeout: 60_000,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5188',
    browserName: 'chromium',
    channel: process.env.LEAGUES_BROWSER_CHANNEL,
    viewport: { width: 1280, height: 900 },
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --config vite.leagues.config.mjs --port 5188 --strictPort',
    url: 'http://localhost:5188',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
