import { HEAD_KEYS, TEMPLATE } from '../src/game/characterSpec.mjs';
import { alphaBounds } from './characterValidation.mjs';

/**
 * Подсказка рига по прозрачности картинок — стартовые точки нового бойца вместо копии соседа (docs/adding-opponent.md).
 * Голова: точка шеи — низ шеи под её центром, масштаб — высота головы на экране как у эталона (Бори).
 * Торс: точка шеи ставится так, чтобы макушка и центр головы относительно плеча совпали с эталоном.
 * Плечи (torso.shoulder, torso.freeShoulder) и масштабы рук берутся у эталона: их задают подложки Бори и лист рук,
 * по альфе их не найти (плечо рабочей руки вообще на прозрачности).
 * Чистая функция: картинки (RGBA из pngjs) передаёт вызывающий — tools/characterFiles.mjs.
 */

/** Центр шеи меряется на столько px шаблона выше низа головы: у самого низа срез бывает скруглённым (у Бори промах 3 px). */
const NECK_PROBE = 20;
/** Точка шеи на столько px выше нижнего непрозрачного пикселя — чтобы стояла на рисунке, а не на краю. */
const NECK_INSET = 4;
/** Срез шеи шире эталона во столько раз — предложить растворение (как предупреждение neck-width в проверке). */
const WIDE_NECK = 1.5;

const opaque = (image, x, y, template) => {
  const xx = Math.min(image.width - 1, Math.max(0, Math.round(x * image.width / template.x)));
  const yy = Math.min(image.height - 1, Math.max(0, Math.round(y * image.height / template.y)));
  return image.data[(yy * image.width + xx) * 4 + 3] >= 128;
};

/** Крайние непрозрачные пиксели строки y, px шаблона; null — строка пустая. */
function rowSpan(image, y, template) {
  const yy = Math.min(image.height - 1, Math.max(0, Math.round(y * image.height / template.y)));
  let left = -1, right = -1;
  for (let x = 0; x < image.width; x++) {
    if (image.data[(yy * image.width + x) * 4 + 3] < 128) continue;
    if (left < 0) left = x;
    right = x;
  }
  return left < 0 ? null : { left: left * template.x / image.width, right: (right + 1) * template.x / image.width };
}

/**
 * Низ шеи на картинке головы: x — центр шеи у calm, y — первый непрозрачный пиксель снизу в этом столбце,
 * самый высокий среди лиц (точка должна стоять на рисунке у всех 7, иначе проверка предупредит).
 */
export function headNeck(calm, faces = []) {
  const T = TEMPLATE.head, bounds = alphaBounds(calm, T);
  if (!bounds) return null;
  const span = rowSpan(calm, bounds.bottom - NECK_PROBE, T) ?? rowSpan(calm, bounds.bottom - 1, T);
  const x = (span.left + span.right) / 2;
  const bottom = (image) => {
    let y = Math.ceil(bounds.bottom) - 1;
    while (y > bounds.top && !opaque(image, x, y, T)) y--;
    return y;
  };
  const y = Math.min(bottom(calm), ...faces.filter((f) => f && !f.error).map(bottom));
  return { x: Math.round(x), y: Math.round(y - NECK_INSET) };
}

const round1 = (v) => Math.round(v * 10) / 10;

/**
 * Риг по картинкам нового бойца. sprites — как у validateCharacter (нужны head_calm и torso_motion),
 * referenceArt/referenceSprites — эталон. Возвращает { art, notes } или { error }.
 */
export function suggestRig(sprites, { referenceArt, referenceSprites }) {
  const head = sprites?.head_calm, refHead = referenceSprites?.head_calm;
  if (!head || head.error) return { error: head?.error ?? 'Нет head_calm.png' };
  if (!refHead || refHead.error) return { error: 'Нет head_calm.png у эталона' };
  const T = TEMPLATE.head;
  const bounds = alphaBounds(head, T), refBounds = alphaBounds(refHead, T);
  if (!bounds || !refBounds) return { error: 'head_calm.png полностью прозрачный' };

  const art = structuredClone(referenceArt);
  delete art.bg; delete art.cuff; delete art.bust; delete art.head.fade;
  const notes = [];

  const neck = headNeck(head, HEAD_KEYS.map((h) => sprites[`head_${h}`]));
  const scale = round1(((refBounds.bottom - refBounds.top) * referenceArt.head.scale / (bounds.bottom - bounds.top)) * 100) / 100;
  art.head = { scale, neck };
  notes.push(`Низ шеи головы (${neck.x}, ${neck.y}) — по рисунку; масштаб головы ${scale}: на экране она той же высоты, что у Бори`);

  const cut = (image, b, s) => { const span = rowSpan(image, b.bottom - 8, T); return span ? (span.right - span.left) * s : 0; };
  const width = cut(head, bounds, scale), refWidth = cut(refHead, refBounds, referenceArt.head.scale);
  if (width > refWidth * WIDE_NECK) {
    art.head.fade = { from: neck.y - 80, to: neck.y - 30 };
    notes.push(`Срез шеи ${Math.round(width)} px против ${Math.round(refWidth)} у Бори — включено растворение низа шеи`);
  }

  // где макушка и центр головы относительно плеча рабочей руки у эталона (px сцены) — так же считает проверка head-placement
  const ref = referenceArt, ts = art.torso.scale;
  const top = (ref.torso.neck.y - ref.torso.shoulder.y) * ref.torso.scale + (refBounds.top - ref.head.neck.y) * ref.head.scale;
  const center = (ref.torso.neck.x - ref.torso.shoulder.x) * ref.torso.scale + ((refBounds.left + refBounds.right) / 2 - ref.head.neck.x) * ref.head.scale;
  art.torso.neck = {
    x: round1(art.torso.shoulder.x + (center - ((bounds.left + bounds.right) / 2 - neck.x) * scale) / ts),
    y: round1(art.torso.shoulder.y + (top - (bounds.top - neck.y) * scale) / ts),
  };
  notes.push(`Шея торса (${art.torso.neck.x}, ${art.torso.neck.y}) — голова встаёт относительно плеча туда же, где у Бори`);
  const torso = sprites.torso_motion;
  if (torso && !torso.error && !opaque(torso, art.torso.neck.x, art.torso.neck.y, TEMPLATE.torso)) {
    notes.push('Точка шеи торса попала на прозрачность — торс нарисован не по подложке Бори, подвинь «Торс»/«Шею» руками');
  }
  notes.push('Плечи, масштабы торса и рук — как у Бори (их задают подложки и лист рук)');
  return { art, notes };
}
