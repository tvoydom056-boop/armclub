import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';
import { SHEETS, SINGLES, artWarnings, exerciseIds, keyMagenta, knownPaths, sliceGrid } from './importTrainingArt.mjs';

const ROOT = resolve(import.meta.dirname, '..');

/** Картинка из списка пикселей [r, g, b] в одну строку. */
function strip(pixels) {
  const png = new PNG({ width: pixels.length, height: 1 });
  pixels.forEach(([r, g, b], i) => png.data.set([r, g, b, 255], i * 4));
  return png;
}
const px = (png, i) => [...png.data.subarray(i * 4, i * 4 + 4)];

describe('приём арта тренировок', () => {
  it('фон #FF00FF прозрачный, рисунок не тронут, край очищен от пурпура', () => {
    // пурпур, бордовый рисунка, красный пополам с фоном, кремовый
    const png = keyMagenta(strip([[255, 0, 255], [128, 0, 32], [255, 0, 128], [240, 220, 190]]));
    expect(px(png, 0)[3]).toBe(0);
    expect(px(png, 1)).toEqual([128, 0, 32, 255]);
    const [r, g, b, a] = px(png, 2);
    expect(a).toBeGreaterThan(80);
    expect(a).toBeLessThan(200);
    expect(r).toBe(255);
    expect(b).toBeLessThan(60);
    expect(g).toBe(0);
    expect(px(png, 3)).toEqual([240, 220, 190, 255]);
  });

  it('сетка режется по строкам слева направо', () => {
    const png = new PNG({ width: 6, height: 4 });
    for (let y = 0; y < 4; y++) for (let x = 0; x < 6; x++) png.data.set([x, y, 0, 255], (y * 6 + x) * 4);
    const cells = sliceGrid(png, 3, 2);
    expect(cells).toHaveLength(6);
    expect(cells.every((c) => c.width === 2 && c.height === 2)).toBe(true);
    expect(px(cells[1], 0).slice(0, 2)).toEqual([2, 0]);
    expect(px(cells[3], 0).slice(0, 2)).toEqual([0, 2]);
  });

  it('приёмка ловит пурпур в рисунке и обрезанный край', () => {
    const png = new PNG({ width: 20, height: 20 });
    for (let i = 0; i < 400; i++) png.data.set([230, 40, 230, 255], i * 4);
    expect(artWarnings(png)).toEqual(expect.arrayContaining([expect.stringContaining('пурпур'), expect.stringContaining('края')]));
    expect(artWarnings(new PNG({ width: 4, height: 4 }))).toEqual(['пустая ячейка']);
  });

  it('у каждой сетки столько имён, сколько ячеек', () => {
    for (const [name, { grid: [c, r], out }] of Object.entries(SHEETS)) expect(out, name).toHaveLength(c * r);
  });

  it('иконка есть у каждого снаряда лавки и у клубной карты', () => {
    const text = readFileSync(resolve(ROOT, 'src/core/training.ts'), 'utf8');
    const items = [...text.slice(text.indexOf('export const ITEMS'), text.indexOf('export const itemById')).matchAll(/\{ id: '([a-z_]+)'/g)].map((m) => m[1]);
    const icons = [...Object.values(SHEETS), { out: Object.values(SINGLES) }].flatMap((s) => s.out);
    for (const id of [...items, 'gym_card']) expect(icons, id).toContain(`items/${id}.png`);
    expect(exerciseIds()).toContain('pushups');
  });

  it('src/game/trainingArt.json перечисляет только известные файлы, и они лежат на диске', () => {
    const { files } = JSON.parse(readFileSync(resolve(ROOT, 'src/game/trainingArt.json'), 'utf8'));
    const known = new Set(knownPaths());
    for (const f of files) {
      expect(known.has(f), f).toBe(true);
      expect(existsSync(resolve(ROOT, 'public/art/training', f)), f).toBe(true);
    }
  });
});
