import { TEMPLATE, HEAD_KEYS, FREE_ANCHORS } from '../src/game/characterSpec.mjs';

/**
 * Проверка набора персонажа: манифест src/game/characters/<id>.json + спрайты public/art/opponents/<id>/.
 * Ошибки (errors) — набор сломан: сохранение из редактора отклоняется, тест падает.
 * Предупреждения (warnings) — геометрия подозрительна: видно в редакторе и тесте, решает человек по листу ?sheet=<id>.
 * Чистая функция: картинки (RGBA из pngjs) передаёт вызывающий — tools/characterFiles.mjs.
 */

const object = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const finite = (v) => typeof v === 'number' && Number.isFinite(v);
const safeName = (v) => typeof v === 'string' && /^[a-z0-9_]+$/.test(v);
export const validCharacterId = safeName;

/** Лицо `press` нарисовано повёрнутым (наклон при прессе): с calm сравнивается только низ шеи. */
const TURNED_FACE = 'press';
/** Насколько контур лица может отличаться от calm (px шаблона): мимика двигает брови и рот, а не голову. */
const FACE_DRIFT = 12;
/** Голова на экране выше или ниже эталона больше чем на столько — пропорции поехали. */
const HEAD_SIZE_DRIFT = 0.25;
/** Обрубок шеи шире, чем у эталона во столько раз, без head.fade ложится на одежду прямоугольником. */
const WIDE_NECK = 1.5;
/** Смещение головы относительно плеча от эталона, px сцены. */
const HEAD_PLACEMENT = 50;
/**
 * Доля площади силуэта Бори, на которую может разойтись «культя» (docs/sprite-spec.md §0).
 * На 2026-10-11: Виталик (рукав по Боре) — до 12%, голые и раздутые руки Дэнча/Ильи, широкий рукав Лёвы — 15–35%.
 */
const SILHOUETTE_DRIFT = 0.15;
const thirds = (size, k) => Math.round(k * size / 3);
/** Где контур обязан совпадать с Борей, px шаблона: плечо рабочей руки на торсе, свободная рука, каждый кадр листа рук. */
export const SILHOUETTE_ZONES = [
  { sprite: 'torso_motion', label: 'плечо рабочей руки на торсе', template: TEMPLATE.torso, box: { x0: 0, y0: 300, x1: 660, y1: TEMPLATE.torso.y } },
  { sprite: 'arm_free', label: 'свободная рука', template: TEMPLATE.armFree, box: { x0: 0, y0: 0, x1: TEMPLATE.armFree.x, y1: TEMPLATE.armFree.y } },
  ...Array.from({ length: 9 }, (_, i) => {
    const { x, y } = TEMPLATE.armsMotion, col = i % 3, row = Math.floor(i / 3);
    return { sprite: 'arms_motion', label: `кадр ${i + 1}`, template: TEMPLATE.armsMotion, box: { x0: thirds(x, col), y0: thirds(y, row), x1: thirds(x, col + 1), y1: thirds(y, row + 1) } };
  }),
];

export function requiredSprites(art) {
  const names = ['torso_motion', 'arm_free', 'arms_motion', ...HEAD_KEYS.map((h) => `head_${h}`)];
  if (art?.cuff) names.push('cuff');
  if (safeName(art?.bg)) names.push(art.bg);
  return names;
}

const alphaAt = (image, x, y) => image.data[(y * image.width + x) * 4 + 3];

/** Рамка непрозрачного (alpha ≥ 128, без полупрозрачного шума) в px шаблона, а не исходного разрешения. */
export function alphaBounds(image, template) {
  let left = image.width, right = -1, top = image.height, bottom = -1;
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      if (alphaAt(image, x, y) < 128) continue;
      left = Math.min(left, x); right = Math.max(right, x);
      top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
  }
  return right < 0 ? null : {
    left: left * template.x / image.width, right: (right + 1) * template.x / image.width,
    top: top * template.y / image.height, bottom: (bottom + 1) * template.y / image.height,
  };
}

/** Ширина непрозрачного в строке y (px шаблона). */
function rowWidth(image, y, template) {
  const yy = Math.min(image.height - 1, Math.max(0, Math.round(y * image.height / template.y)));
  let left = -1, right = -1;
  for (let x = 0; x < image.width; x++) {
    if (alphaAt(image, x, yy) < 128) continue;
    if (left < 0) left = x;
    right = x;
  }
  return left < 0 ? 0 : (right - left + 1) * template.x / image.width;
}

function opaqueNear(image, point, template, radius = 4) {
  const x0 = Math.max(0, Math.floor((point.x - radius) * image.width / template.x));
  const x1 = Math.min(image.width - 1, Math.ceil((point.x + radius) * image.width / template.x));
  const y0 = Math.max(0, Math.floor((point.y - radius) * image.height / template.y));
  const y1 = Math.min(image.height - 1, Math.ceil((point.y + radius) * image.height / template.y));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (alphaAt(image, x, y) >= 128) return true;
  }
  return false;
}

/** Непрозрачна ли точка шаблона (картинка может быть в другом разрешении). */
const opaqueAt = (image, x, y, template) =>
  alphaAt(image, Math.floor(x * image.width / template.x), Math.floor(y * image.height / template.y)) >= 128;

/** Доля площади силуэта эталона в box, где силуэты не совпадают (лишнее + недостающее). */
function silhouetteDrift(image, reference, { template, box }) {
  let diff = 0, area = 0;
  for (let y = box.y0; y < box.y1; y++) {
    for (let x = box.x0; x < box.x1; x++) {
      const ref = opaqueAt(reference, x, y, template);
      if (ref) area++;
      if (ref !== opaqueAt(image, x, y, template)) diff++;
    }
  }
  return area ? diff / area : 0;
}

/** Ширина среза шеи головы на экране (px сцены): 8 px шаблона выше нижнего края рисунка. */
const neckCut = (art, head, bounds) => rowWidth(head, bounds.bottom - 8, TEMPLATE.head) * art.head.scale;

/** Общий для теста, CLI и эндпоинта сохранения. Возвращает { errors, warnings }: [{ code, path, message }]. */
export function validateCharacter(art, sprites, { referenceArt, referenceSprites } = {}) {
  const errors = [], warnings = [];
  const issue = (list, code, path, message) => list.push({ code, path, message });
  const error = (code, path, message) => issue(errors, code, path, message);
  const warn = (code, path, message) => issue(warnings, code, path, message);
  const record = (v, path, required, optional = []) => {
    if (!object(v)) { error('schema', path, 'Ожидается объект'); return false; }
    for (const k of required) if (!Object.hasOwn(v, k)) error('schema', `${path}.${k}`, 'Обязательное поле отсутствует');
    for (const k of Object.keys(v)) if (![...required, ...optional].includes(k)) error('schema', `${path}.${k}`, 'Неизвестное поле');
    return true;
  };
  const num = (v, path, min, max) => {
    if (!finite(v) || v < min || v > max) error('number', path, `Нужно конечное число от ${min} до ${max}`);
  };
  const point = (v, path, template) => {
    if (!record(v, path, ['x', 'y'])) return;
    num(v.x, `${path}.x`, 0, template.x - 0.001);
    num(v.y, `${path}.y`, 0, template.y - 0.001);
  };
  // масштаб головы не сравниваем: голову рисуют разного размера на холсте, важна её высота на экране (ниже)
  const scale = (v, path, reference) => {
    num(v, path, 0.01, 3);
    if (finite(v) && finite(reference) && (v < reference * 0.75 || v > reference * 1.25)) {
      warn('scale-reference', path, `Масштаб отличается от Бори (${reference}) больше чем на 25%: проверь пропорции на листе`);
    }
  };
  if (!record(art, 'art', ['torso', 'head', 'arms', 'freeArm'], ['bg', 'cuff', 'bust'])) return { errors, warnings };
  if (record(art.torso, 'torso', ['scale', 'shoulder', 'neck', 'freeShoulder'])) {
    scale(art.torso.scale, 'torso.scale', referenceArt?.torso.scale);
    for (const k of ['shoulder', 'neck', 'freeShoulder']) point(art.torso[k], `torso.${k}`, TEMPLATE.torso);
  }
  if (record(art.head, 'head', ['scale', 'neck'], ['fade'])) {
    num(art.head.scale, 'head.scale', 0.01, 3);
    point(art.head.neck, 'head.neck', TEMPLATE.head);
    if (art.head.fade !== undefined && record(art.head.fade, 'head.fade', ['from', 'to'])) {
      num(art.head.fade.from, 'head.fade.from', 0, TEMPLATE.head.y);
      num(art.head.fade.to, 'head.fade.to', 0, TEMPLATE.head.y);
      if (finite(art.head.fade.from) && finite(art.head.fade.to) && art.head.fade.from >= art.head.fade.to) {
        error('fade-order', 'head.fade', 'Начало растворения должно быть выше конца (from < to)');
      }
    }
  }
  if (record(art.arms, 'arms', ['scale', 'drop', 'sag'])) {
    scale(art.arms.scale, 'arms.scale', referenceArt?.arms.scale);
    num(art.arms.drop, 'arms.drop', -720, 720);
    if (record(art.arms.sag, 'arms.sag', ['angle', 'drop'])) {
      num(art.arms.sag.angle, 'arms.sag.angle', -Math.PI, Math.PI);
      num(art.arms.sag.drop, 'arms.sag.drop', -720, 720);
    }
  }
  if (record(art.freeArm, 'freeArm', ['scale'])) scale(art.freeArm.scale, 'freeArm.scale', referenceArt?.freeArm.scale);
  if (art.cuff !== undefined && record(art.cuff, 'cuff', ['scale'])) scale(art.cuff.scale, 'cuff.scale', referenceArt?.cuff?.scale);
  if (art.bust !== undefined && record(art.bust, 'bust', ['width', 'bottom'])) {
    num(art.bust.width, 'bust.width', 0.1, 30); num(art.bust.bottom, 'bust.bottom', -30, 30);
  }
  if (art.bg !== undefined && !safeName(art.bg)) error('name', 'bg', 'Имя PNG без расширения: только a–z, 0–9 и _');
  // кривой манифест — понятные ошибки, а не падение на геометрии ниже
  if (errors.length) return { errors, warnings };

  const templates = { torso_motion: TEMPLATE.torso, arm_free: TEMPLATE.armFree, arms_motion: TEMPLATE.armsMotion, cuff: TEMPLATE.cuff };
  const bounds = {};
  for (const name of requiredSprites(art)) {
    const image = sprites?.[name];
    if (!image || image.error) { error('sprite-file', name, image?.error ?? `Отсутствует ${name}.png`); continue; }
    if (!Number.isInteger(image.width) || !Number.isInteger(image.height) || image.width <= 0 || image.height <= 0 || image.data?.length !== image.width * image.height * 4) {
      error('sprite-data', name, 'Не удалось прочитать RGBA-пиксели PNG'); continue;
    }
    const template = name.startsWith('head_') ? TEMPLATE.head : templates[name] ?? { x: 1280, y: 720 };
    if (name === 'arms_motion' && (image.width !== template.x || image.height !== template.y)) {
      error('sprite-size', name, 'Лист рук должен быть ровно 1670×941');
    } else if (Math.abs(image.width / image.height - template.x / template.y) >= 0.015) {
      error('sprite-aspect', name, `Пропорции должны соответствовать ${template.x}×${template.y}`);
    }
    bounds[name] = alphaBounds(image, template);
    if (!bounds[name]) error('sprite-empty', name, 'Картинка полностью прозрачная');
    if (name !== art.bg) {
      let transparent = false;
      for (let i = 3; i < image.data.length; i += 4) if (image.data[i] < 16) { transparent = true; break; }
      if (!transparent) error('sprite-alpha', name, 'Нужен прозрачный фон, а не закрашенный холст');
    }
  }
  if (errors.length) return { errors, warnings };

  // точка плеча виртуальная (туда входит рукав листа рук, у всех она на прозрачности) — её не проверяем
  if (!opaqueNear(sprites.torso_motion, art.torso.neck, TEMPLATE.torso)) {
    warn('anchor-alpha', 'torso.neck', 'Точка шеи торса на прозрачности: голова повиснет в воздухе');
  }
  if (!opaqueNear(sprites.torso_motion, art.torso.freeShoulder, TEMPLATE.torso, 12)) {
    warn('anchor-alpha', 'torso.freeShoulder', 'Свободное плечо на прозрачности: рука может расти из пустоты');
  }
  const blankNecks = HEAD_KEYS.filter((h) => !opaqueNear(sprites[`head_${h}`], art.head.neck, TEMPLATE.head));
  if (blankNecks.length) warn('anchor-alpha', 'head.neck', `Низ шеи на прозрачности у лиц: ${blankNecks.join(', ')} (рисунок кончается выше — точка скопирована с другого бойца?)`);
  if (!opaqueNear(sprites.arm_free, FREE_ANCHORS.grip, TEMPLATE.armFree, 8)) {
    error('free-grip', 'arm_free', 'В точке захвата (501, 493) нет рисунка: кулак со штырём не по шаблону');
  }

  const calm = bounds.head_calm;
  const shifted = HEAD_KEYS.filter((h) => h !== TURNED_FACE && Object.keys(calm).some((k) => Math.abs(bounds[`head_${h}`][k] - calm[k]) > FACE_DRIFT));
  if (shifted.length) warn('head-bounds', 'head', `Контур отличается от calm больше чем на ${FACE_DRIFT} px: ${shifted.join(', ')} — голова прыгнет при смене лица`);
  // ниже calm — не страшно (опущенная голова, борода ложится на одежду), щель бывает, только если низ поднялся
  if (calm.bottom - bounds[`head_${TURNED_FACE}`].bottom > FACE_DRIFT) {
    warn('head-bounds', 'head', `Низ шеи у ${TURNED_FACE} не там же, где у calm: при прессе шея оторвётся от торса`);
  }
  if (!art.head.fade && referenceArt && referenceSprites?.head_calm && !referenceSprites.head_calm.error) {
    const width = neckCut(art, sprites.head_calm, calm);
    const refWidth = neckCut(referenceArt, referenceSprites.head_calm, alphaBounds(referenceSprites.head_calm, TEMPLATE.head));
    if (width > refWidth * WIDE_NECK) {
      warn('neck-width', 'head.fade', `Срез шеи ${Math.round(width)} px против ${Math.round(refWidth)} у Бори: ляжет на одежду прямоугольником — включи растворение (head.fade)`);
    }
  }
  if (referenceArt && referenceSprites?.head_calm && !referenceSprites.head_calm.error) {
    const refBounds = alphaBounds(referenceSprites.head_calm, TEMPLATE.head);
    if (refBounds) {
      // где макушка и центр головы относительно плеча рабочей руки, px сцены
      const offset = (a, b) => ({
        top: (a.torso.neck.y - a.torso.shoulder.y) * a.torso.scale + (b.top - a.head.neck.y) * a.head.scale,
        center: (a.torso.neck.x - a.torso.shoulder.x) * a.torso.scale + ((b.left + b.right) / 2 - a.head.neck.x) * a.head.scale,
        height: (b.bottom - b.top) * a.head.scale,
      });
      const actual = offset(art, calm), reference = offset(referenceArt, refBounds);
      const dy = Math.round(actual.top - reference.top), dx = Math.round(actual.center - reference.center);
      if (Math.abs(dy) > HEAD_PLACEMENT || Math.abs(dx) > HEAD_PLACEMENT) {
        warn('head-placement', 'head', `Относительно плеча макушка смещена от Бори на ${dy} px, центр головы на ${dx} px: проверь точки шеи и масштабы`);
      }
      const size = actual.height / reference.height;
      if (Math.abs(size - 1) > HEAD_SIZE_DRIFT) {
        warn('head-size', 'head.scale', `Голова на экране ${Math.round(actual.height)} px против ${Math.round(reference.height)} у Бори (${Math.round(size * 100)}%)`);
      }
    }
  }
  // культя: рукав и рука — по контуру Бори, своё у бойца только заливка (цвет одежды, кожа)
  const drifted = {};
  for (const zone of SILHOUETTE_ZONES) {
    const reference = referenceSprites?.[zone.sprite];
    if (!reference || reference.error) continue;
    const drift = silhouetteDrift(sprites[zone.sprite], reference, zone);
    if (drift > SILHOUETTE_DRIFT) (drifted[zone.sprite] ??= []).push(`${zone.label} — ${Math.round(drift * 100)}%`);
  }
  for (const [sprite, parts] of Object.entries(drifted)) {
    warn('silhouette', sprite, `Контур культи не по Боре (допуск ${SILHOUETTE_DRIFT * 100}%): ${parts.join(', ')} — перерисовать по подложке boris-guides (sprite-spec.md §0)`);
  }
  return { errors, warnings };
}
