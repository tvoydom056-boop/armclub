const { chromium } = require('C:/Users/DPiunov/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const base = process.env.VENYA_PREVIEW_BASE || 'http://127.0.0.1:5173';
const rosterIds = [...fs.readFileSync(path.join(__dirname, '../../../src/core/opponents.ts'), 'utf8').matchAll(/id: '([^']+)'/g)].map(match => match[1]);

(async () => {
  const errors = [];
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 1100 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(String(error)));
    page.on('response', response => {
      if (response.status() >= 400 && response.url().includes('/art/')) {
        errors.push(`${response.status()} ${response.url()}`);
      }
    });
    await page.goto(`${base}/docs/art-reference/venya/preview.html`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForFunction(() => document.title.startsWith('READY') || document.title.startsWith('ERROR'), {}, { timeout: 90000 });
    assert.equal(await page.title(), 'READY: Venya');
    await page.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth > 0));
    for (const [id, file] of [['scene', 'scene-preview.png'], ['heads', 'faces-preview.png'], ['atlas', 'arms-preview.png'], ['parts', 'parts-preview.png']]) {
      await page.locator(`#${id}`).screenshot({ path: path.join(__dirname, file) });
    }
    const poses = [];
    for (const p of [-1, -.75, -.5, -.25, 0, .25, .5, .75, 1]) {
      await page.locator('#position').fill(String(p));
      const metrics = await page.evaluate(() => {
        const { art, frame } = window.venyaPreview;
        frame.p = Number(document.querySelector('#position').value);
        for (let i = 0; i < 90; i++) art.update(frame);
        return { p: frame.p, shoulder: art.arms.shoulder, head: art.head.objects()[0].getBounds(), torso: art.torso.getBounds() };
      });
      for (const number of [metrics.shoulder.x, metrics.shoulder.y, metrics.head.x, metrics.head.y, metrics.torso.x, metrics.torso.y]) {
        assert.ok(Number.isFinite(number));
      }
      poses.push(metrics);
      if ([-1, 0, 1].includes(p)) await page.locator('#scene').screenshot({ path: path.join(__dirname, `pose-${String(p).replace('-', 'minus-')}.png`) });
    }
    await page.locator('#position').fill('0');
    const heads = [];
    for (const head of ['calm', 'strain', 'telegraph', 'tired', 'lose', 'win', 'press']) {
      await page.locator('#expression').selectOption(head);
      const bounds = await page.evaluate(() => {
        const { art, frame } = window.venyaPreview;
        frame.p = 0; frame.head = document.querySelector('#expression').value;
        frame.oppTech = frame.head === 'press' ? 'press' : 'hook';
        for (let i = 0; i < 90; i++) art.update(frame);
        return { head: frame.head, texture: art.head.objects()[0].texture.key, bounds: art.head.objects()[0].getBounds() };
      });
      assert.equal(bounds.texture, `art:opponents/venya/head_${head}`);
      heads.push(bounds);
    }
    await context.addInitScript(priorId => {
      localStorage.setItem('armwrestling-club-save', JSON.stringify({ state: { wins: { [priorId]: 1 } }, version: 1 }));
    }, rosterIds.at(-2));
    await page.goto(`${base}/`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.locator('.opp-venya').waitFor();
    assert.equal(await page.locator('.opp').count(), rosterIds.length);
    assert.equal(await page.locator('.opp').last().getAttribute('class').then(value => value.includes('opp-venya')), true);
    assert.match(await page.locator('.opp-venya').innerText(), /Веня/);
    assert.equal(await page.locator('.opp-venya .fighter-head').evaluate(image => image.complete && image.naturalWidth === 600), true);
    await page.locator('.stage').screenshot({ path: path.join(__dirname, 'hub-preview.png') });
    await page.locator('.opp-venya button').click({ timeout: 90000 });
    await page.locator('.hud').waitFor();
    await page.waitForFunction(() => window.__arm?.artFor === 'venya');
    await page.locator('.stage').screenshot({ path: path.join(__dirname, 'game-preview.png') });
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(__dirname, 'preview-validation.json'), JSON.stringify({ errors, poses, heads, rosterCount: rosterIds.length, playable: true }, null, 2));
    console.log(`Verified nine poses, seven head textures, ${rosterIds.length} roster cards and playable Venya match; no missing images or browser errors.`);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
