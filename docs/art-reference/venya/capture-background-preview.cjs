const { chromium } = require('C:/Users/DPiunov/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  const errors = [];
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
    await context.addInitScript(() => {
      localStorage.setItem('armwrestling-club-save', JSON.stringify({ state: { wins: { spb_friend: 1 } }, version: 1 }));
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(String(error)));
    page.on('response', response => {
      if (response.status() >= 400 && response.url().includes('/art/')) errors.push(`${response.status()} ${response.url()}`);
    });
    await page.goto(process.env.VENYA_PREVIEW_BASE || 'http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded', timeout: 90000 });
    const card = page.locator('.opp-venya');
    await page.waitForFunction(() => !document.querySelector('.opp-venya button')?.disabled, {}, { timeout: 90000 });
    const cardBackground = await card.locator('.opp-pic').evaluate(element => getComputedStyle(element).backgroundImage);
    assert.ok(cardBackground.includes('/art/opponents/venya/bg_birch_park.png'));
    await card.screenshot({ path: path.join(__dirname, 'background-card-preview.png') });
    await card.locator('button').click();
    await page.waitForFunction(() => window.__arm?.artFor === 'venya');
    const match = await page.evaluate(() => {
      const scene = window.__arm;
      const key = 'art:opponents/venya/bg_birch_park';
      const bg = scene.children.list.find(child => child.texture?.key === key);
      const source = scene.textures.get(key).getSourceImage();
      scene.scene.pause();
      return { artFor: scene.artFor, key: bg?.texture.key, width: source.width, height: source.height, visible: bg?.visible, displayWidth: bg?.displayWidth, displayHeight: bg?.displayHeight };
    });
    assert.equal(match.key, 'art:opponents/venya/bg_birch_park');
    assert.equal(match.visible, true);
    assert.equal(match.displayWidth, 1280);
    assert.equal(match.displayHeight, 720);
    assert.ok(Math.abs(match.width / match.height - 16 / 9) < 0.005);
    await page.locator('.stage').screenshot({ path: path.join(__dirname, 'background-game-preview.png') });
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(__dirname, 'background-validation.json'), JSON.stringify({ errors, cardBackground, match }, null, 2));
    console.log(JSON.stringify({ errors, match }));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
