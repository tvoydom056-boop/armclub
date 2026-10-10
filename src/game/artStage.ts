import Phaser from 'phaser';
import type { Technique } from '../core/techniques';
import { backgroundKey, headKey, meKey, oppKey, sceneKey, type ClaspPose, type HeadKey } from './art';
import { JoinedArms } from './joinedArms';
import { clamp } from '../core/rng';
import type { Pt } from './layout';

/**
 * Нарисованная сцена боя. Обе рабочие руки и захват — одно изображение;
 * готовые позы сохраняют форму локтей; корпус следует за плечом рабочей руки.
 * Координаты — логические пиксели сцены 1280×720; «px» — пиксели самих картинок (они нарисованы вдвое крупнее).
 */
/** Торс нависает над дальним краем стола; свободная рука крепится отдельно у плеча. */
const TORSO = { x: 638, y: 511, scale: 0.47, origin: { x: 526 / 1100, y: 695 / 700 } };
/** Точка на торсе (px), куда встаёт низ шеи. */
const TORSO_NECK = { x: 526, y: 150 };
const HEAD = { scale: 0.31, origin: { x: 325 / 600, y: 690 / 700 } };
const SHOULDER = { x: 467.5, y: 408.75 };
/** Общая манжета из motion_4: опора (87, 91) в вырезке 151×151; перекрывает оба края рукава. */
const CUFF = { origin: { x: 87 / 151, y: 91 / 151 }, scale: 1.2 };
/** Небольшой наклон сохраняет перекрытие рукавов даже при полном прессе. */
const TILT_LIMIT = 0.08;

/** Полная свободная рука в логических 560×620 px: верх рукава входит под край торса. */
const FREE = {
  shoulder: { x: 1070 / 1572 * 1100, y: 310 / 1001 * 700 },
  origin: { x: 60 / 560, y: 45 / 620 },
  grip: { x: 501, y: 493 },
  scale: 0.75, squeeze: 0.025,
  peg: { x: 1112, y: 550 },
};

/** Точки соединения зависят от нарисованного тела, а не от порядка бойца. */
const YOS_RIG = {
  torso: { ...TORSO, x: 644, y: 580 },
  neck: { x: 752 / 1572 * 1100, y: 200 / 1001 * 700 },
  head: { scale: 0.35, origin: { x: 365 / 600, y: 663 / 700 } },
  cuff: { ...CUFF, scale: 0.85 },
  /** Руки Йоса нарисованы крупнее тела — уменьшаем всю связку вокруг захвата. */
  arms: 0.85,
  /** Сдвиг захвата вниз (логические px); торс и голова едут за плечом руки. */
  drop: 0,
  /** Наклон кулака вниз на пути к нашему штырю (рад) и сдвиг захвата (px), который держит плечо на месте. */
  sag: { angle: 0, drop: 0 },
  free: {
    ...FREE,
    shoulder: { x: 1060 / 1572 * 1100, y: 295 / 1001 * 700 },
    scale: 0.75,
  },
};
const BORIS_RIG = { torso: TORSO, neck: TORSO_NECK, head: HEAD, cuff: CUFF, free: FREE, arms: 1, drop: 0, sag: { angle: 0, drop: 0 } };
/** Пушистая шея Вени перекрывает кремовую грудку; руки используют геометрию Йоса. Голова опущена — уши не прячутся под шкалой пина. */
const VENYA_RIG = {
  ...YOS_RIG,
  head: { scale: 0.5, origin: { x: 300 / 600, y: 460 / 700 } },
  arms: 1,
};
/**
 * Девушки нарисованы стройнее Бори, а их головы — с волосами и полями, лицо в кадре мельче.
 * Торс и голову укрупняем, руки чуть уменьшаем; сильнее 0.95 нельзя — наша рука с той же
 * картинки перестаёт доставать до красной подушки.
 */
const SLIM_TORSO = { ...TORSO, y: 625, scale: 0.55 };
const SLIM_ARMS = 0.95;
const SLIM_FREE = 0.62;
/** Круглый вырез футболки: шея Ани входит в него; правая рука голая. */
const ANYA_RIG = {
  ...BORIS_RIG,
  torso: SLIM_TORSO,
  neck: { x: 820 / 1571 * 1100, y: 190 / 1001 * 700 },
  head: { scale: 0.44, origin: { x: 362 / 600, y: 573 / 700 } },
  arms: SLIM_ARMS,
  /** Захват был на уровне шеи — опускаем всю фигуру. */
  drop: 60,
  free: { ...FREE, shoulder: { x: 1100 / 1571 * 1100, y: 270 / 1001 * 700 }, scale: SLIM_FREE },
};
/** Открытый ворот формы: шея Оли входит в вырез, а не в воротник-хомут. Голова чуть меньше — волосы не упираются в край экрана. */
const OLYA_RIG = {
  ...BORIS_RIG,
  torso: SLIM_TORSO,
  neck: { x: 790 / 1572 * 1100, y: 40 / 1001 * 700 },
  head: { scale: 0.42, origin: { x: 405 / 600, y: 480 / 700 } },
  arms: SLIM_ARMS,
  /** Волосы заходили под полосу пина — опускаем всю фигуру. */
  drop: 60,
  free: { ...FREE, shoulder: { x: 1100 / 1572 * 1100, y: 260 / 1001 * 700 }, scale: SLIM_FREE },
};
/** Шея подруги входит в воротник свитера; её лицо короче лица Бори. Рука опущена: локоть стоит на столе, а не на его краю. */
const BRUNETTE_RIG = {
  ...BORIS_RIG,
  torso: SLIM_TORSO,
  /** Шея глубже в воротнике, голова мельче, чем у Ани: крупная висела над телом. */
  neck: { x: 770 / 1572 * 1100, y: 150 / 1001 * 700 },
  head: { scale: 0.39, origin: { x: 345 / 600, y: 614 / 700 } },
  arms: SLIM_ARMS,
  drop: 40,
  /** Дожимая, она тянула руку горизонтально на уровне груди — кулак опускаем, тело остаётся на месте. */
  sag: { angle: 0.14, drop: 32 },
  free: { ...FREE, shoulder: { x: 1100 / 1572 * 1100, y: 280 / 1001 * 700 }, scale: SLIM_FREE },
};

/** Картинка с плавной сменой текстуры: старая гаснет за time секунд. */
class Swap {
  private cur: Phaser.GameObjects.Image;
  private old: Phaser.GameObjects.Image;
  private key: string;
  private fade = 0;

  constructor(scene: Phaser.Scene, key: string, depth: number, origin: Pt, private time = 0.14, private logicalSize?: Pt) {
    this.key = key;
    this.old = scene.add.image(0, 0, key).setDepth(depth).setOrigin(origin.x, origin.y).setAlpha(0);
    this.cur = scene.add.image(0, 0, key).setDepth(depth).setOrigin(origin.x, origin.y);
  }

  set(key: string): void {
    if (key === this.key) return;
    this.old.setTexture(this.key).setAlpha(1);
    this.cur.setTexture(key);
    this.key = key;
    this.fade = this.time;
  }

  place(x: number, y: number, rot: number, sx: number, sy = sx): void {
    for (const o of [this.cur, this.old]) o.setPosition(x, y).setRotation(rot).setScale(
      sx * (this.logicalSize ? this.logicalSize.x / o.width : 1),
      sy * (this.logicalSize ? this.logicalSize.y / o.height : 1),
    );
  }

  tick(dt: number): void {
    if (this.fade > 0) {
      this.fade = Math.max(0, this.fade - dt);
      this.old.setAlpha(this.fade / this.time);
    } else {
      this.old.setAlpha(0);
    }
  }

  objects(): Phaser.GameObjects.Image[] {
    return [this.cur, this.old];
  }
}

export interface ArtFrame {
  dt: number;
  /** показываемая позиция −1..+1 */
  p: number;
  ourTech: Technique;
  oppTech: Technique;
  /** до «ГО!» руки в нейтральной позе */
  fighting: boolean;
  head: HeadKey;
  breathe: number;
  /** лёгкое опускание головы (пресс) */
  lower: number;
  /** 0..1 — как сильно мы давим */
  ourEffort: number;
  shakeOur: Pt;
  shakeOpp: Pt;
}

export interface ArtResult {
  C: Pt;
  scale: number;
}

export class ArtStage {
  private torso: Phaser.GameObjects.Image;
  private head: Swap;
  private free: Phaser.GameObjects.Image;
  private arms: JoinedArms;
  private cuff: Phaser.GameObjects.Image;
  private ourFree: Swap;
  private all: Phaser.GameObjects.GameObject[];
  private pressLean = 0;
  private freePull = 0;
  private rig: typeof BORIS_RIG;

  constructor(scene: Phaser.Scene, private id: string) {
    this.rig = id === 'venya' ? VENYA_RIG : id === 'yos' ? YOS_RIG : id === 'brunette' ? BRUNETTE_RIG : id === 'olya' ? OLYA_RIG : id === 'spb_friend' ? ANYA_RIG : BORIS_RIG;
    const { torso, head, free, cuff } = this.rig;
    const img = (key: string, depth: number) => scene.add.image(0, 0, key).setDepth(depth);
    const bg = img(backgroundKey(id), 0).setOrigin(0, 0).setDisplaySize(1280, 720);
    // дальний край стола (100 px сверху картинки) на y=400, торс нависает над столом
    const table = img(sceneKey('table'), 20).setOrigin(0.5, 1).setScale(0.5).setPosition(640, 730);
    this.torso = img(oppKey(id, 'torso_motion'), 21).setOrigin(torso.origin.x, torso.origin.y);
    this.head = new Swap(scene, headKey(id, 'calm'), 22, head.origin, 0.14, { x: 600, y: 700 });
    this.free = img(oppKey(id, 'arm_free'), 20.8).setOrigin(free.origin.x, free.origin.y)
      .setDisplaySize(560 * free.scale, 620 * free.scale);

    this.arms = new JoinedArms(scene, id, this.rig.arms);
    // Цельный голый дельтоид Йоса уже закрывает стык; накладка нужна рукаву Бори.
    this.cuff = img(oppKey(id, 'cuff'), 32).setOrigin(cuff.origin.x, cuff.origin.y).setVisible(id === 'boris');

    this.ourFree = new Swap(scene, meKey('free_idle'), 34, { x: 0, y: 1 }, 0.08);
    this.ourFree.place(0, 720, 0, 0.5);
    this.all = [bg, table, this.torso, this.free, ...this.head.objects(), this.arms.object, this.cuff, ...this.ourFree.objects()];
  }

  destroy(): void {
    for (const o of this.all) o.destroy();
  }

  update(f: ArtFrame): ArtResult {
    const { torso: body, neck: neckAnchor, head, free: freeArm, cuff } = this.rig;
    const pose: ClaspPose = f.fighting ? f.ourTech : 'neutral';
    // на пути к нашему штырю (p < 0) кулак опускается ниже плеча; в нейтрали и у самой подушки наклона нет
    const sag = Math.sin(Math.PI * clamp(-f.p, 0, 1));
    const C = this.arms.update(pose, f.p, {
      x: (f.shakeOur.x + f.shakeOpp.x) * 0.3,
      y: (f.shakeOur.y + f.shakeOpp.y) * 0.3 + this.rig.drop + this.rig.sag.drop * sag,
    }, f.dt, this.rig.sag.angle * sag);
    this.cuff.setPosition(this.arms.shoulder.x, this.arms.shoulder.y)
      .setRotation(this.arms.rotation).setScale(this.arms.scale * cuff.scale);

    // торс и голова (голова спереди: низ шеи лежит на коже в вырезе толстовки)
    const pressing = f.fighting && f.oppTech === 'press' && f.head !== 'win' && f.head !== 'lose';
    this.pressLean += ((pressing ? 1 : 0) - this.pressLean) * (1 - Math.exp(-f.dt * 9));
    const tilt = clamp(-f.p * 0.1 + this.pressLean * 0.32, -TILT_LIMIT, TILT_LIMIT);
    const cos = Math.cos(tilt);
    const sin = Math.sin(tilt);
    const bodyPoint = (x: number, y: number): Pt => ({
      x: this.arms.shoulder.x + (x - SHOULDER.x) * cos - (y - SHOULDER.y) * sin,
      y: this.arms.shoulder.y + (x - SHOULDER.x) * sin + (y - SHOULDER.y) * cos + f.breathe,
    });
    const torso = bodyPoint(body.x, body.y);
    this.torso.setPosition(torso.x, torso.y).setRotation(tilt).setDisplaySize(1100 * body.scale, 700 * body.scale);
    const neck = bodyPoint(
      body.x + (neckAnchor.x - body.origin.x * 1100) * body.scale,
      body.y - (body.origin.y * 700 - neckAnchor.y) * body.scale,
    );

    this.head.set(headKey(this.id, pressing ? 'press' : f.head));
    this.head.place(neck.x, neck.y + f.lower, tilt, head.scale);
    this.head.tick(f.dt);

    // свободная рука: когда он давит, сжимает рукоять и подтягивает её к себе, дрожит вместе с телом
    const straining = f.fighting && (pressing || f.head === 'strain' || f.head === 'telegraph');
    this.freePull += ((straining ? 1 : 0) - this.freePull) * (1 - Math.exp(-f.dt * 8));
    const free = bodyPoint(
      body.x + (freeArm.shoulder.x - body.origin.x * 1100) * body.scale,
      body.y + (freeArm.shoulder.y - body.origin.y * 700) * body.scale,
    );
    // Плечо всегда соединено с телом. Руку поворачиваем целиком к рукояти, сохраняя её размер.
    const reach = { x: freeArm.grip.x - freeArm.origin.x * 560, y: freeArm.grip.y - freeArm.origin.y * 620 };
    const turn = Math.atan2(freeArm.peg.y - free.y, freeArm.peg.x - free.x) - Math.atan2(reach.y, reach.x);
    this.free.setPosition(free.x, free.y).setRotation(turn - this.freePull * freeArm.squeeze);

    // свободная рука: сжимает рукоять, когда давим
    this.ourFree.set(meKey(f.ourEffort > 0.25 ? 'free_grip' : 'free_idle'));
    this.ourFree.place(f.shakeOur.x * 0.4, 720 + f.shakeOur.y * 0.4, 0, 0.5);
    this.ourFree.tick(f.dt);

    return { C, scale: 1 };
  }
}
