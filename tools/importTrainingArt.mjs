import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PNG } from 'pngjs';

/**
 * Приём арта тренировок (docs/training-art-prompt.md): картинки от GPT → public/art/training/.
 * Сетки режутся на ячейки, фон #FF00FF становится прозрачным, кадры мини-игр кладутся в games/.
 * Затем по тому, что лежит в public/art/training/, пересобирается src/game/trainingArt.json —
 * интерфейс берёт спрайт только из этого списка, остальное рисует заглушками.
 * Запуск: node tools/importTrainingArt.mjs [папка с картинками]   (по умолчанию — папка из промта)
 * Только список, без обработки PNG: node tools/importTrainingArt.mjs --manifest-only
 */
const ROOT = resolve(import.meta.dirname, '..');
const OUT = resolve(ROOT, 'public/art/training');
const MANIFEST = resolve(ROOT, 'src/game/trainingArt.json');
const DEFAULT_SRC = 'C:/Users/DPiunov/Desktop/vladten/sprite/training';

/** Сетки: файл от GPT → ячейки по строкам слева направо (порядок как в промте). */
export const SHEETS = {
  'items_sheet_1.png': { grid: [3, 2], out: ['jump_rope', 'gripper', 'strap', 'tricep_rope', 'fat_grip', 'roller'].map((id) => `items/${id}.png`) },
  'items_sheet_2.png': { grid: [3, 2], out: ['medball', 'cone', 'gripper_pro', 'eccentric', 'triple', 'multispin'].map((id) => `items/${id}.png`) },
  'fx_sheet.png': { grid: [3, 2], out: ['sweat', 'dust', 'motion', 'impact', 'steam', 'sparks'].map((n) => `fx/${n}.png`) },
  'stamps.png': { grid: [2, 2], out: ['weak', 'ok', 'great', 'level'].map((n) => `stamps/${n}.png`) },
  'map_buildings.png': { grid: [2, 2], out: ['home', 'shop', 'gym', 'bar'].map((n) => `map/${n}.png`) },
  'map_marks.png': { grid: [3, 2], out: ['chain', 'shutter', 'player', 'star', 'steam', 'sign'].map((n) => `map/${n}.png`) },
};
/** Одиночные спрайты на пурпурном фоне. */
export const SINGLES = {
  'gym_card.png': 'items/gym_card.png',
  ...Object.fromEntries(['shopkeeper', 'shopkeeper_happy', 'shopkeeper_doubt', 'dog', 'weight_stack'].map((n) => [`${n}.png`, `${n}.png`])),
};
/** Непрозрачные сцены копируются без удаления цвета. */
export const BACKGROUNDS = ['map_base.png', 'room_home.png', 'room_gym.png', 'room_shop.png', 'run_street.png'];

/** id упражнений из src/core/training.ts (TS из Node не импортируется — читаем текстом). */
export function exerciseIds() {
  const text = readFileSync(resolve(ROOT, 'src/core/training.ts'), 'utf8');
  const block = text.slice(text.indexOf('export const EXERCISES'));
  const ids = [...block.matchAll(/\{ id: '([a-z_]+)', name:/g)].map((m) => m[1]);
  if (ids.length === 0) throw new Error('EXERCISES не найдены — поменялся формат training.ts');
  return ids;
}

/** Все пути, которые знает интерфейс (src/game/trainingArt.ts). */
export function knownPaths() {
  const frames = exerciseIds().flatMap((id) => [`games/${id}_rest.png`, `games/${id}_peak.png`]);
  return [...Object.values(SHEETS).flatMap((s) => s.out), ...Object.values(SINGLES), ...BACKGROUNDS, ...frames];
}

/** Насколько пиксель «пурпурный»: 255 у #FF00FF, около 0 у обычных цветов рисунка. */
const magenta = (r, g, b) => Math.min(r, b) - g;
const KEY_FROM = 60;
const KEY_TO = 200;

/**
 * Вырезает фон #FF00FF на месте. Край рисунка, смешанный с фоном, становится полупрозрачным,
 * а его цвет очищается от пурпура (пиксель считаем смесью цвета рисунка и фона).
 */
export function keyMagenta(png) {
  const d = png.data;
  for (let i = 0; i < d.length; i += 4) {
    const m = magenta(d[i], d[i + 1], d[i + 2]);
    if (m <= KEY_FROM) continue;
    const a = Math.max(0, 1 - (m - KEY_FROM) / (KEY_TO - KEY_FROM));
    if (a === 0) {
      d[i] = d[i + 1] = d[i + 2] = d[i + 3] = 0;
      continue;
    }
    const unmix = (c, k) => Math.round(Math.min(255, Math.max(0, (c - (1 - a) * k) / a)));
    d[i] = unmix(d[i], 255);
    d[i + 1] = unmix(d[i + 1], 0);
    d[i + 2] = unmix(d[i + 2], 255);
    d[i + 3] = Math.round(d[i + 3] * a);
  }
  return png;
}

/** Режет картинку на cols × rows равных ячеек (по строкам). */
export function sliceGrid(png, cols, rows) {
  const w = Math.floor(png.width / cols), h = Math.floor(png.height / rows);
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = new PNG({ width: w, height: h });
      PNG.bitblt(png, cell, c * w, r * h, w, h, 0, 0);
      cells.push(cell);
    }
  }
  return cells;
}

/** Приёмка §«Приёмка» промта: пурпур внутри рисунка и рисунок у самого края ячейки. */
export function artWarnings(png, { edge = 2 } = {}) {
  const warnings = [];
  const { width: w, height: h, data: d } = png;
  let leftover = 0, touches = false, opaque = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (d[i + 3] < 128) continue;
      opaque++;
      if (magenta(d[i], d[i + 1], d[i + 2]) > 100) leftover++;
      if (x < edge || y < edge || x >= w - edge || y >= h - edge) touches = true;
    }
  }
  if (opaque === 0) warnings.push('пустая ячейка');
  if (leftover > 50) warnings.push(`в рисунке остался пурпур (${leftover} px)`);
  if (touches) warnings.push('рисунок касается края — возможно, обрезан');
  return warnings;
}

function writePng(rel, png) {
  const file = resolve(OUT, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, PNG.sync.write(png));
}

const readPng = (file) => PNG.sync.read(readFileSync(file));

/** Раскладывает картинки из src в public/art/training. Возвращает отчёт строками. */
export function importArt(src) {
  const report = [];
  const frames = new Set(exerciseIds().flatMap((id) => [`${id}_rest.png`, `${id}_peak.png`]));
  for (const name of readdirSync(src).filter((n) => n.endsWith('.png')).sort()) {
    const file = resolve(src, name);
    const note = (rel, png) => {
      const w = artWarnings(png);
      report.push(`${w.length ? '⚠' : '✓'} ${name} → ${rel}${w.length ? ` — ${w.join('; ')}` : ''}`);
    };
    if (BACKGROUNDS.includes(name)) {
      writePng(name, readPng(file));
      report.push(`✓ ${name} → ${name} (фон без обработки)`);
    } else if (SHEETS[name]) {
      const { grid: [cols, rows], out } = SHEETS[name];
      const sheet = keyMagenta(readPng(file));
      if (sheet.width % cols || sheet.height % rows) report.push(`⚠ ${name}: ${sheet.width}×${sheet.height} не делится на сетку ${cols}×${rows}`);
      sliceGrid(sheet, cols, rows).forEach((cell, i) => { writePng(out[i], cell); note(out[i], cell); });
    } else if (SINGLES[name]) {
      const png = keyMagenta(readPng(file));
      writePng(SINGLES[name], png);
      note(SINGLES[name], png);
    } else if (frames.has(name)) {
      const png = keyMagenta(readPng(file));
      writePng(`games/${name}`, png);
      report.push(`✓ ${name} → games/${name}`);
    } else {
      report.push(`· ${name} — интерфейс его пока не использует, пропущен`);
    }
  }
  // кадры покоя и пика накладываются друг на друга — размер обязан совпадать
  for (const id of exerciseIds()) {
    const [rest, peak] = ['rest', 'peak'].map((p) => resolve(OUT, `games/${id}_${p}.png`));
    if (!existsSync(rest) || !existsSync(peak)) continue;
    const [a, b] = [readPng(rest), readPng(peak)];
    if (a.width !== b.width || a.height !== b.height) report.push(`⚠ ${id}: покой ${a.width}×${a.height}, пик ${b.width}×${b.height} — должны совпадать`);
  }
  return report;
}

/** Список готовых спрайтов для интерфейса: только известные пути, которые есть на диске. */
export function buildManifest() {
  const files = knownPaths().filter((rel) => existsSync(resolve(OUT, rel))).sort();
  const text = `${JSON.stringify({ files }, null, 2)}\n`;
  if (!existsSync(MANIFEST) || readFileSync(MANIFEST, 'utf8') !== text) writeFileSync(MANIFEST, text);
  return files;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const src = resolve(process.argv[2] ?? DEFAULT_SRC);
  if (process.argv.includes('--manifest-only')) { /* Готовые PNG сохраняются побайтно. */ }
  else if (existsSync(src)) for (const line of importArt(src)) console.log(line);
  else console.log(`Папки ${src} нет — только пересобираю список готовых спрайтов.`);
  const files = buildManifest();
  console.log(`src/game/trainingArt.json: ${files.length} из ${knownPaths().length} спрайтов.`);
}
