import Phaser from 'phaser';
import type { Technique } from '../core/techniques';
import { headKey, meKey, oppKey, sceneKey, type ClaspPose, type HeadKey } from './art';
import { JoinedArms } from './joinedArms';
import { PIN_CUSHIONS } from './armMotion';
import { clamp } from '../core/rng';
import type { Pt } from './layout';

/**
 * Нарисованная сцена боя. Обе рабочие руки и захват — одно изображение;
 * готовые позы сохраняют форму локтей; корпус следует за плечом рабочей руки.
 * Координаты — логические пиксели сцены 1280×720; «px» — пиксели самих картинок (они нарисованы вдвое крупнее).
 */
/** Торс: низ «культей» рук стоит на столе, торс нависает над дальним краем стола. */
const TORSO = { x: 638, y: 511, scale: 0.47, origin: { x: 526 / 1100, y: 695 / 700 } };
/** Точка на торсе (px), куда встаёт низ шеи. */
const TORSO_NECK = { x: 526, y: 150 };
const HEAD = { scale: 0.31, origin: { x: 325 / 600, y: 690 / 700 } };
const SHOULDER = { x: 467.5, y: 408.75 };
/** Общая манжета из motion_4: опора (87, 91) в вырезке 151×151; перекрывает оба края рукава. */
const CUFF = { origin: { x: 87 / 151, y: 91 / 151 }, scale: 1.2 };
/** Небольшой наклон сохраняет перекрытие рукавов даже при полном прессе. */
const TILT_LIMIT = 0.08;

/**
 * Локоть культи (1418, 892 px торса 1572×1001) — шарнир обрезанного предплечья под торсом.
 * crop убирает весь рукав; origin — точка, вокруг которой ставится рука, squeeze — подтягивание при усилии.
 * peg — штырь на столе (сцена): кулак держит его и стоит на месте, origin тогда — центр штыря в кулаке,
 * reach — направление предплечья на картинке (от кулака к локтю). Рука целиком, с рукавом, лежит под торсом:
 * предплечье поворачивается к локтю культи, а лишняя длина руки прячется под толстовкой.
 * Кулак тащится за телом, только когда локоть дальше reachMax px картинки (Борю почти положили).
 */
const FREE = {
  elbow: { x: 1418 / 1572 * 1100, y: 892 / 1001 * 700 },
  crop: { x: 0, y: 0, width: 560, height: 620 },
  scale: 0.65, origin: { x: 501 / 560, y: 493 / 620 }, rot: -0.2, squeeze: 0.06,
  reach: { x: 265 - 501, y: 330 - 493 },
  reachMax: 520, minTurn: -0.6,
  peg: { x: 1112, y: 550 } as Pt | null,
};

/** Точки соединения зависят от нарисованного тела, а не от порядка бойца. */
const YOS_RIG = {
  torso: { ...TORSO, x: 644, y: 580 },
  neck: { x: 752 / 1572 * 1100, y: 200 / 1001 * 700 },
  head: { scale: 0.31, origin: { x: 365 / 600, y: 663 / 700 } },
  cuff: { ...CUFF, scale: 0.85 },
  free: {
    ...FREE,
    crop: { x: 0, y: 200, width: 560, height: 420 },
    scale: 0.65, origin: { x: 170 / 560, y: 220 / 620 }, rot: -0.4, peg: null,
  },
};
const BORIS_RIG = { torso: TORSO, neck: TORSO_NECK, head: HEAD, cuff: CUFF, free: FREE };

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
    this.rig = id === 'yos' ? YOS_RIG : BORIS_RIG;
    const { torso, head, free, cuff } = this.rig;
    const img = (key: string, depth: number) => scene.add.image(0, 0, key).setDepth(depth);
    const bg = img(sceneKey('bg'), 0).setOrigin(0, 0).setDisplaySize(1280, 720);
    // дальний край стола (100 px сверху картинки) на y=400, торс нависает над столом
    const table = img(sceneKey('table'), 20).setOrigin(0.5, 1).setScale(0.5).setPosition(640, 730);
    // подушки лежат на столе перед торсом: красная под его локтем, синяя у нас в правом нижнем углу
    const padOpp = img(sceneKey('pad_opp'), 21.5).setDisplaySize(340, 110).setPosition(555, 577);
    const padMe = img(sceneKey('pad_me'), 21.5).setScale(0.42).setPosition(1115, 705);
    const pinOpp = img(sceneKey('pin_opp'), 24).setDisplaySize(165, 165).setPosition(PIN_CUSHIONS.win.x, PIN_CUSHIONS.win.y);
    const pinMe = img(sceneKey('pin_me'), 24).setDisplaySize(165, 165).setPosition(PIN_CUSHIONS.lose.x, PIN_CUSHIONS.lose.y);
    this.torso = img(oppKey(id, 'torso_motion'), 21).setOrigin(torso.origin.x, torso.origin.y);
    this.head = new Swap(scene, headKey(id, 'calm'), 22, head.origin, 0.14, { x: 600, y: 700 });
    this.free = img(oppKey(id, 'arm_free'), 20.8).setOrigin(free.origin.x, free.origin.y)
      .setCrop(free.crop.x, free.crop.y, free.crop.width, free.crop.height).setScale(free.scale).setRotation(free.rot);

    this.arms = new JoinedArms(scene, id);
    // Цельный голый дельтоид Йоса уже закрывает стык; накладка нужна рукаву Бори.
    this.cuff = img(oppKey(id, 'cuff'), 32).setOrigin(cuff.origin.x, cuff.origin.y).setVisible(id !== 'yos');

    this.ourFree = new Swap(scene, meKey('free_idle'), 34, { x: 0, y: 1 }, 0.08);
    this.ourFree.place(0, 720, 0, 0.5);
    this.all = [bg, table, padOpp, padMe, pinOpp, pinMe, this.torso, this.free, ...this.head.objects(), this.arms.object, this.cuff, ...this.ourFree.objects()];
  }

  destroy(): void {
    for (const o of this.all) o.destroy();
  }

  update(f: ArtFrame): ArtResult {
    const { torso: body, neck: neckAnchor, head, free: freeArm, cuff } = this.rig;
    const pose: ClaspPose = f.fighting ? f.ourTech : 'neutral';
    const C = this.arms.update(pose, f.p, {
      x: (f.shakeOur.x + f.shakeOpp.x) * 0.3,
      y: (f.shakeOur.y + f.shakeOpp.y) * 0.3,
    }, f.dt);
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
      body.x + (freeArm.elbow.x - body.origin.x * 1100) * body.scale,
      body.y + (freeArm.elbow.y - body.origin.y * 700) * body.scale,
    );
    if (freeArm.peg) {
      // кулак на штыре: стоит на месте, предплечье смотрит на локоть культи
      const toElbow = { x: free.x - freeArm.peg.x, y: free.y - freeArm.peg.y };
      const dist = Math.hypot(toElbow.x, toElbow.y);
      const reach = freeArm.reachMax * freeArm.scale;
      const drag = Math.max(0, dist - reach) / dist;
      // когда Борю валят на нашу сторону, локоть уходит ниже кулака: не даём руке развернуться рукавом
      // вниз из-под толстовки
      const turn = Math.max(freeArm.minTurn,
        Phaser.Math.Angle.Wrap(Math.atan2(toElbow.y, toElbow.x) - Math.atan2(freeArm.reach.y, freeArm.reach.x)));
      this.free.setPosition(freeArm.peg.x + toElbow.x * drag, freeArm.peg.y + toElbow.y * drag)
        .setRotation(turn - this.freePull * freeArm.squeeze * 0.3);
    } else {
      this.free.setPosition(free.x, free.y).setRotation(freeArm.rot + tilt - this.freePull * freeArm.squeeze);
    }

    // свободная рука: сжимает рукоять, когда давим
    this.ourFree.set(meKey(f.ourEffort > 0.25 ? 'free_grip' : 'free_idle'));
    this.ourFree.place(f.shakeOur.x * 0.4, 720 + f.shakeOur.y * 0.4, 0, 0.5);
    this.ourFree.tick(f.dt);

    return { C, scale: 1 };
  }
}
