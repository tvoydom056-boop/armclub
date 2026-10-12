import base from './playwright.config.mjs';
import { defineConfig } from '@playwright/test';

/** Отдельная приёмка тренировок. TRAINING_BROWSER_CHANNEL=msedge — системный Edge. */
export default defineConfig({
  ...base,
  testMatch: 'training.spec.mjs',
  outputDir: 'artifacts/training/playwright-results',
  use: { ...base.use, baseURL: 'http://localhost:5293', channel: process.env.TRAINING_BROWSER_CHANNEL },
  webServer: { ...base.webServer, url: 'http://localhost:5293', command: 'node node_modules/vite/bin/vite.js --config vite.training.config.mjs --port 5293 --strictPort' },
});
