import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import { FREE_ANCHORS, TEMPLATE } from '../src/game/characterSpec.mjs';
import { alphaBounds, SILHOUETTE_ZONES } from './characterValidation.mjs';

/**
 * Подложки для рисования новых бойцов по эталону — Дяде Боре (docs/sprite-spec.md):
 * спрайт Бори полупрозрачный + направляющие точек крепления из его манифеста и ARM_POSES.
 * Кладутся слоем поверх нового рисунка в редакторе картинок: всё должно совпасть с крестиками и рамками,
 * а контур культи (рукав, рука) — с пурпурной линией.
 * Запуск: node tools/makeSpriteGuides.mjs → docs/art-reference/boris-guides/*.png
 */
const ROOT = resolve(import.meta.dirname, '..');
const BORIS = resolve(ROOT, 'public/art/opponents/boris');
const OUT = resolve(ROOT, 'docs/art-reference/boris-guides');
const rig = JSON.parse(readFileSync(resolve(ROOT, 'src/game/characters/boris.json'), 'utf8'));

/** ARM_POSES из src/game/armMotion.ts (TS не импортируется из Node без сборки — читаем текстом). */
function armPoses() {
  const text = readFileSync(resolve(ROOT, 'src/game/armMotion.ts'), 'utf8');
  const poses = [...text.matchAll(/grip: \{ x: (\d+), y: (\d+) \}.*shoulder: \{ x: (\d+), y: (\d+) \}/g)]
    .map((m) => ({ grip: { x: +m[1], y: +m[2] }, shoulder: { x: +m[3], y: +m[4] } }));
  if (poses.length !== 9) throw new Error(`ARM_POSES: ожидалось 9 поз, найдено ${poses.length} — поменялся формат armMotion.ts`);
  return poses;
}

const COLORS = { red: [229, 57, 53], green: [46, 204, 64], blue: [33, 150, 243], cyan: [0, 200, 220], magenta: [230, 0, 200], grey: [140, 140, 140] };

/** Спрайт Бори, приведённый к шаблону и ослабленный до opacity. */
function faded(file, template, opacity = 0.35) {
  const src = PNG.sync.read(readFileSync(resolve(BORIS, file)));
  const out = new PNG({ width: template.x, height: template.y });
  for (let y = 0; y < template.y; y++) {
    for (let x = 0; x < template.x; x++) {
      const sx = Math.min(src.width - 1, Math.floor(x * src.width / template.x));
      const sy = Math.min(src.height - 1, Math.floor(y * src.height / template.y));
      const s = (sy * src.width + sx) * 4, d = (y * template.x + x) * 4;
      out.data[d] = src.data[s]; out.data[d + 1] = src.data[s + 1]; out.data[d + 2] = src.data[s + 2];
      out.data[d + 3] = Math.round(src.data[s + 3] * opacity);
    }
  }
  return { png: out, bounds: alphaBounds(src, template) };
}

function dot(png, x, y, color) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const i = (y * png.width + x) * 4;
  [png.data[i], png.data[i + 1], png.data[i + 2]] = COLORS[color];
  png.data[i + 3] = 255;
}
/** Линия толщиной 2 px; dash — длина штриха (0 — сплошная). */
function line(png, a, b, color, dash = 0) {
  const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y));
  for (let i = 0; i <= n; i++) {
    if (dash && Math.floor(i / dash) % 2) continue;
    const x = a.x + (b.x - a.x) * i / n, y = a.y + (b.y - a.y) * i / n;
    dot(png, x, y, color); dot(png, x + 1, y, color); dot(png, x, y + 1, color);
  }
}
function cross(png, p, color, r = 18) {
  line(png, { x: p.x - r, y: p.y }, { x: p.x + r, y: p.y }, color);
  line(png, { x: p.x, y: p.y - r }, { x: p.x, y: p.y + r }, color);
}
function rect(png, b, color) {
  const [l, r, t, d] = [b.left, b.right - 1, b.top, b.bottom - 1];
  for (const [a, c] of [[{ x: l, y: t }, { x: r, y: t }], [{ x: r, y: t }, { x: r, y: d }], [{ x: r, y: d }, { x: l, y: d }], [{ x: l, y: d }, { x: l, y: t }]]) line(png, a, c, color, 8);
}

/** Контур силуэта Бори в зонах культи (SILHOUETTE_ZONES): по этой линии должен идти контур нового бойца. */
function silhouette(png, sprite) {
  const opaque = (x, y) => x >= 0 && y >= 0 && x < png.width && y < png.height && png.data[(y * png.width + x) * 4 + 3] >= 45;
  const edges = [];
  for (const { box } of SILHOUETTE_ZONES.filter((z) => z.sprite === sprite)) {
    for (let y = box.y0; y < box.y1; y++) for (let x = box.x0; x < box.x1; x++) {
      if (opaque(x, y) && (!opaque(x - 1, y) || !opaque(x + 1, y) || !opaque(x, y - 1) || !opaque(x, y + 1))) edges.push([x, y]);
    }
  }
  for (const [x, y] of edges) { dot(png, x, y, 'magenta'); dot(png, x + 1, y, 'magenta'); dot(png, x, y + 1, 'magenta'); }
}

mkdirSync(OUT, { recursive: true });
const save = (name, png) => writeFileSync(resolve(OUT, name), PNG.sync.write(png));

// голова 600×700: рамка головы, центр, срез шеи, точка шеи
{
  const { png, bounds } = faded('head_calm.png', TEMPLATE.head);
  rect(png, bounds, 'cyan');
  line(png, { x: rig.head.neck.x, y: 0 }, { x: rig.head.neck.x, y: TEMPLATE.head.y }, 'grey', 6);
  line(png, { x: 0, y: rig.head.neck.y }, { x: TEMPLATE.head.x, y: rig.head.neck.y }, 'magenta', 6);
  cross(png, rig.head.neck, 'green');
  save('head_guide.png', png);
}
// торс 1572×1001: плечо рабочей руки, шея, свободное плечо
{
  const { png } = faded('torso_motion.png', TEMPLATE.torso);
  cross(png, rig.torso.shoulder, 'red', 24);
  cross(png, rig.torso.neck, 'green', 24);
  cross(png, rig.torso.freeShoulder, 'blue', 24);
  silhouette(png, 'torso_motion');
  save('torso_guide.png', png);
}
// свободная рука 560×620: кулак держит штырь в grip, рукав уходит под торс в origin
{
  const { png } = faded('arm_free.png', TEMPLATE.armFree);
  silhouette(png, 'arm_free');
  cross(png, FREE_ANCHORS.grip, 'red');
  cross(png, FREE_ANCHORS.origin, 'blue');
  save('arm_free_guide.png', png);
}
// лист рук 1670×941: сетка 3×3 и в каждом кадре захват и плечо (как режет src/game/joinedArms.ts)
{
  const { png } = faded('arms_motion.png', TEMPLATE.armsMotion);
  silhouette(png, 'arms_motion');
  const { x: W, y: H } = TEMPLATE.armsMotion;
  for (const k of [1, 2]) {
    line(png, { x: Math.round(k * W / 3), y: 0 }, { x: Math.round(k * W / 3), y: H }, 'grey', 10);
    line(png, { x: 0, y: Math.round(k * H / 3) }, { x: W, y: Math.round(k * H / 3) }, 'grey', 10);
  }
  armPoses().forEach((pose, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const origin = { x: Math.round(col * W / 3) + (i >= 7 ? 10 : 0), y: Math.round(row * H / 3) + (row > 0 ? 7 : 0) };
    cross(png, { x: origin.x + pose.grip.x, y: origin.y + pose.grip.y }, 'red', 14);
    cross(png, { x: origin.x + pose.shoulder.x, y: origin.y + pose.shoulder.y }, 'blue', 14);
  });
  save('arms_motion_guide.png', png);
}
console.log(`Подложки: ${OUT}`);
