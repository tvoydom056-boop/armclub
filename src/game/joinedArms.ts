import Phaser from 'phaser';
import { joinedArmsKey, type ClaspPose } from './art';
import { clamp } from '../core/rng';
import { ARM_FIT, ARM_POSES, ARM_SCALE, joinedArmsCenter, mixPoint, motionFrames, paintedOffset } from './armMotion';
import type { Pt } from './layout';

/** Сколько строк (px кадра) дорисовываем под срезом нашего предплечья — с запасом за низ экрана. */
const FOREARM_EXTEND = 380;
/** Строка среза берётся на столько выше нижней обводки; наклон меряем по строке ещё на SPAN выше. */
const FOREARM_MARGIN = 4;
const FOREARM_SPAN = 16;

/**
 * В листе наше предплечье обрезано низом ячейки, и в сцене срез висел над столом — рука казалась короткой.
 * Один раз собираем копию листа: под последней чистой строкой предплечья (выше тёмной обводки среза)
 * эта же строка тянется вниз по наклону руки. Кадры motion_i лежат в копии, координаты ячеек прежние.
 */
function longArmsKey(scene: Phaser.Scene, key: string): string {
  const longKey = `${key}:long`;
  if (scene.textures.exists(longKey)) return longKey;
  const source = scene.textures.get(key).getSourceImage() as HTMLImageElement;
  const sheet = document.createElement('canvas');
  sheet.width = source.width;
  sheet.height = source.height;
  const sheetCtx = sheet.getContext('2d', { willReadFrequently: true })!;
  sheetCtx.drawImage(source, 0, 0);
  const px = sheetCtx.getImageData(0, 0, sheet.width, sheet.height).data;
  const at = (x: number, y: number) => (y * sheet.width + x) * 4;

  const cells = Array.from({ length: 9 }, (_, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const trimX = i >= 7 ? 10 : 0;
    const trimY = row > 0 ? 7 : 0;
    const x = Math.round(col * source.width / 3) + trimX;
    const y = Math.round(row * source.height / 3) + trimY;
    const w = Math.round((col + 1) * source.width / 3) - x;
    const h = Math.round((row + 1) * source.height / 3) - y;
    // самый длинный непрозрачный отрезок строки — это наше предплечье
    const run = (yy: number) => {
      let l = 0, r = 0, start = -1;
      for (let xx = 0; xx <= w; xx++) {
        const on = xx < w && px[at(x + xx, y + yy) + 3] > 200;
        if (on && start < 0) start = xx;
        if (!on && start >= 0) {
          if (xx - start > r - l) { l = start; r = xx; }
          start = -1;
        }
      }
      return { l, r };
    };
    // средняя яркость середины отрезка: кожа ≈ 420–470, обводка среза < 250
    const skin = (yy: number, l: number, r: number) => {
      const q = Math.floor((r - l) / 4);
      let sum = 0;
      for (let xx = l + q; xx < r - q; xx++) {
        const p = at(x + xx, y + yy);
        sum += px[p] + px[p + 1] + px[p + 2];
      }
      return sum / (r - l - 2 * q);
    };
    // снизу вверх до первой строки, где предплечье целое: не упирается в края ячейки и без обводки
    let low = h - 1;
    for (; low > FOREARM_SPAN + FOREARM_MARGIN; low--) {
      const { l, r } = run(low);
      if (r - l >= 40 && l > 0 && r < w - 1 && skin(low, l, r) > 380) break;
    }
    const cut = low - FOREARM_MARGIN;
    const a = run(cut);
    const b = run(cut - FOREARM_SPAN);
    const slope = (a.l - b.l + a.r - b.r) / 2 / FOREARM_SPAN;
    // полоса с мягкими краями обводки
    const bandL = Math.max(0, a.l - 2);
    const bandR = Math.min(w, a.r + 2);
    return {
      x, y, w, cut, slope, bandL, bandR,
      slotW: Math.max(w, Math.ceil(bandR + Math.max(0, slope) * FOREARM_EXTEND)),
      slotH: cut + 1 + FOREARM_EXTEND,
      ox: 0, oy: 0,
    };
  });

  // раскладка 3×3 с удлинёнными ячейками
  let width = 0, top = 0;
  for (let row = 0; row < 3; row++) {
    let left = 0;
    const line = cells.slice(row * 3, row * 3 + 3);
    for (const c of line) {
      c.ox = left;
      c.oy = top;
      left += c.slotW;
    }
    width = Math.max(width, left);
    top += Math.max(...line.map((c) => c.slotH));
  }
  const out = document.createElement('canvas');
  out.width = width;
  out.height = top;
  const ctx = out.getContext('2d')!;
  const strip = document.createElement('canvas');
  strip.height = 1;
  for (const c of cells) {
    ctx.drawImage(source, c.x, c.y, c.w, c.cut + 1, c.ox, c.oy, c.w, c.cut + 1);
    strip.width = c.bandR - c.bandL;
    strip.getContext('2d')!.drawImage(source, c.x + c.bandL, c.y + c.cut, strip.width, 1, 0, 0, strip.width, 1);
    ctx.save();
    ctx.beginPath();
    ctx.rect(c.ox, c.oy, c.slotW, c.slotH);
    ctx.clip();
    for (let k = 1; k <= FOREARM_EXTEND; k++) ctx.drawImage(strip, c.ox + c.bandL + c.slope * k, c.oy + c.cut + k);
    ctx.restore();
  }
  const texture = scene.textures.addCanvas(longKey, out)!;
  cells.forEach((c, i) => texture.add(`motion_${i}`, 0, c.ox, c.oy, c.slotW, c.slotH));
  return longKey;
}

/** Each frame contains the entire arm pair. Only uniform scale, rotation and translation. */
export class JoinedArms {
  readonly object: Phaser.GameObjects.Container;
  shoulder: Pt = { x: 467.5, y: 408.75 };
  /** Поворот и равномерный масштаб показанной позы — для общей манжеты плеча. */
  rotation = 0;
  scale = ARM_SCALE;
  private image: Phaser.GameObjects.Image;
  private angle = 0;
  private frame = 4;
  /** Сдвиг всей связки «рука + торс» после смены кадра; плавно гаснет, чтобы соперник не прыгал. */
  private slip: Pt = { x: 0, y: 0 };

  /** size — общий размер связки рук для конкретного соперника; захват остаётся на месте. */
  constructor(scene: Phaser.Scene, id: string, public size = 1) {
    const key = longArmsKey(scene, joinedArmsKey(id));
    this.image = scene.add.image(0, 0, key, 'motion_4').setOrigin(0).setScale(ARM_SCALE);
    this.object = scene.add.container(0, 0, [this.image]).setDepth(31);
    this.update('neutral', 0, { x: 0, y: 0 }, 1);
  }

  /** lean — добавочный наклон связки вокруг захвата (рад): плюс опускает кулак ниже плеча, плечо при этом поднимается. */
  update(pose: ClaspPose, p: number, shake: Pt, dt: number, lean = 0): Pt {
    const targetAngle = pose === 'hook' ? -0.025 : pose === 'toproll' ? 0.025 : pose === 'press' ? 0.045 : 0;
    this.angle += (targetAngle - this.angle) * (1 - Math.exp(-dt * 12));
    const { from, to, blend } = motionFrames(p);
    const C = joinedArmsCenter(p);
    C.x += shake.x;
    C.y += shake.y;
    // между позами плечо плавно едет; кадр показан один, поэтому чуть доворачиваем его к этому плечу,
    // но не больше ARM_FIT — остаток забирает торс. Размер руки постоянный: масштаб только выравнивает
    // кадры, нарисованные крупнее или мельче кадра 4
    const pose0 = ARM_POSES[from];
    const pose1 = ARM_POSES[to];
    const want = mixPoint(paintedOffset(pose0.shoulder, pose0.grip, 0), paintedOffset(pose1.shoulder, pose1.grip, 0), blend);
    const frame = blend < 0.5 ? from : to;
    const own = paintedOffset(ARM_POSES[frame].shoulder, ARM_POSES[frame].grip, 0);
    const scale = this.size / ARM_POSES[frame].size;
    const turn = Math.atan2(own.x * want.y - own.y * want.x, own.x * want.x + own.y * want.y);
    const angle = this.angle + clamp(turn, -ARM_FIT.angle, ARM_FIT.angle) + lean;
    this.rotation = angle;
    this.scale = ARM_SCALE * scale;
    // торс крепится к плечу именно показанного кадра — рукав не отрывается от тела
    const shoulder = paintedOffset(ARM_POSES[frame].shoulder, ARM_POSES[frame].grip, angle);
    const raw = { x: C.x + shoulder.x * scale, y: C.y + shoulder.y * scale };
    // при смене кадра плечо перескакивает: двигаем связку целиком и плавно доводим на место
    if (frame !== this.frame) {
      this.slip = { x: this.shoulder.x - raw.x, y: this.shoulder.y - raw.y };
      this.frame = frame;
    }
    const fade = Math.exp(-dt * 14);
    this.slip.x *= fade;
    this.slip.y *= fade;
    C.x += this.slip.x;
    C.y += this.slip.y;
    this.shoulder = { x: raw.x + this.slip.x, y: raw.y + this.slip.y };
    const corner = { x: frame >= 7 ? 10 : 0, y: frame >= 3 ? 7 : 0 };
    const at = paintedOffset(corner, ARM_POSES[frame].grip, angle);
    this.image.setFrame(`motion_${frame}`).setScale(ARM_SCALE * scale)
      .setRotation(angle).setPosition(C.x + at.x * scale, C.y + at.y * scale);
    // A single visible pose prevents translucent extra fingers and doubled wristbands.
    return C;
  }
}
