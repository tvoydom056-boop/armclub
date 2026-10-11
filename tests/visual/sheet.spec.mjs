import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { expect, test } from '@playwright/test';

/**
 * Визуальная регрессия: кадры листа поз ?sheet=<id> против утверждённых эталонов в tests/visual/baseline/<id>/.
 * Правка сцены или рига, которая сдвинула бойца, роняет тест; кадры «как стало» и разница — в test-results/.
 * Утвердить новый вид: npm run test:visual:update (перезаписывает эталоны — сначала посмотри на лист глазами).
 */

/** Состав версии 2 (ROSTERS[2] в src/core/opponents.ts) — с ним сейчас и работаем. */
const ROSTER = ['boris', 'leva', 'dench', 'vitalik', 'ilya', 'ermes'];
/** Какие кадры листа сравниваются (data-key = cellKey в src/ui/RigSheet.tsx): позиции пина, лица, техники. */
const FRAMES = [
  'neutral:calm:0',
  'hook:calm:-1', 'hook:calm:-0.5', 'hook:calm:0', 'hook:calm:0.5', 'hook:calm:1',
  'hook:strain:0', 'hook:win:0',
  'press:strain:0', 'toproll:strain:0',
];
/** Эталон хранится уменьшенным JPEG (~50 КБ на кадр): сдвиг на 5 px сцены — это 2.5 px здесь, видно. */
const SIZE = { w: 640, h: 360 };
/** Пиксель «другой», если канал разошёлся больше чем на столько из 255 … */
const PIXEL_DIFF = 32;
/** … а кадр — если таких пикселей больше этой доли. Одинаковый рендер даёт 0. */
const MAX_DIFF = 0.002;

const BASELINE = resolve(import.meta.dirname, 'baseline');
const fileFor = (id, key) => resolve(BASELINE, id, `${key.replaceAll(':', '_')}.jpg`);
const toDataUrl = (bytes) => `data:image/jpeg;base64,${bytes.toString('base64')}`;
const fromDataUrl = (url) => Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');

/** В браузере: кадр 1280×720 → JPEG нужного размера. */
async function shrink({ src, w, h }) {
  const img = new Image();
  img.src = src;
  await img.decode();
  const canvas = Object.assign(document.createElement('canvas'), { width: w, height: h });
  canvas.getContext('2d').drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', 0.85);
}

/** В браузере: доля разошедшихся пикселей и картинка разницы (красное — где разошлось). */
async function compare({ expected, actual, threshold }) {
  const pixels = async (src) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const canvas = Object.assign(document.createElement('canvas'), { width: img.width, height: img.height });
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return { canvas, ctx, data: ctx.getImageData(0, 0, img.width, img.height) };
  };
  const a = await pixels(expected), b = await pixels(actual);
  if (a.data.width !== b.data.width || a.data.height !== b.data.height) return { ratio: 1, diff: actual };
  const out = b.ctx.createImageData(b.data.width, b.data.height);
  let differ = 0;
  for (let i = 0; i < a.data.data.length; i += 4) {
    const d = Math.max(...[0, 1, 2].map((c) => Math.abs(a.data.data[i + c] - b.data.data[i + c])));
    const hit = d > threshold;
    if (hit) differ++;
    const grey = (b.data.data[i] + b.data.data[i + 1] + b.data.data[i + 2]) / 3 * 0.35;
    out.data.set(hit ? [255, 40, 40, 255] : [grey, grey, grey, 255], i);
  }
  b.ctx.putImageData(out, 0, 0);
  return { ratio: differ / (a.data.data.length / 4), diff: b.canvas.toDataURL('image/png') };
}

for (const id of ROSTER) {
  test(`лист поз ${id}`, async ({ page }, info) => {
    const update = info.config.updateSnapshots === 'all' || info.config.updateSnapshots === 'changed';
    await page.goto(`/?sheet=${id}`);
    await expect(page.locator('.rig-sheet header button')).toHaveText('Переснять', { timeout: 150_000 });
    // без WebGL Phaser тихо уходит на Canvas: маски и фильтры там другие — эталон был бы не про ту сцену
    expect(await page.evaluate(() => window.__arm?.sys.game.renderer.type), 'рендер должен быть WebGL').toBe(2);
    await expect(page.locator('.rig-sheet .rig-error')).toHaveCount(0);

    const problems = [];
    for (const key of FRAMES) {
      const src = await page.locator(`figure[data-key="${key}"] img`).first().getAttribute('src');
      const actual = await page.evaluate(shrink, { src, ...SIZE });
      const file = fileFor(id, key);
      if (update || !existsSync(file)) {
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, fromDataUrl(actual));
        if (!update) problems.push(`${key}: эталона не было — записан, проверь его глазами`);
        continue;
      }
      const { ratio, diff } = await page.evaluate(compare, { expected: toDataUrl(readFileSync(file)), actual, threshold: PIXEL_DIFF });
      if (ratio > MAX_DIFF) {
        const name = key.replaceAll(':', '_');
        writeFileSync(info.outputPath(`${name}-actual.jpg`), fromDataUrl(actual));
        writeFileSync(info.outputPath(`${name}-diff.png`), fromDataUrl(diff));
        problems.push(`${key}: разошлось ${(ratio * 100).toFixed(2)}% пикселей (допуск ${MAX_DIFF * 100}%) — ${info.outputPath(`${name}-diff.png`)}`);
      }
    }
    expect(problems, `Кадры листа ${id} не совпали с эталоном (tests/visual/baseline/${id}/)`).toEqual([]);
  });
}
