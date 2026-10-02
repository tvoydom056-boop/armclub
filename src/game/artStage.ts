import Phaser from 'phaser';
import type { Technique } from '../core/techniques';
import { headKey, meKey, oppKey, sceneKey, type ClaspPose, type HeadKey } from './art';
import { JoinedArms } from './joinedArms';
import { PIN_CUSHIONS } from './armMotion';
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

/** Свободная рука соперника: рукав закрывает правую «культю» торса. */
const FREE = { x: 872, y: 462, scale: 0.45, origin: { x: 130 / 560, y: 160 / 620 }, rot: -0.5 };

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
  private ourFree: Swap;
  private all: Phaser.GameObjects.GameObject[];
  private pressLean = 0;

  constructor(scene: Phaser.Scene, private id: string) {
    const img = (key: string, depth: number) => scene.add.image(0, 0, key).setDepth(depth);
    const bg = img(sceneKey('bg'), 0).setOrigin(0, 0).setDisplaySize(1280, 720);
    // дальний край стола (100 px сверху картинки) на y=400, торс нависает над столом
    const table = img(sceneKey('table'), 20).setOrigin(0.5, 1).setScale(0.5).setPosition(640, 730);
    // подушки лежат на столе перед торсом: красная под его локтем, синяя у нас в правом нижнем углу
    const padOpp = img(sceneKey('pad_opp'), 21.5).setDisplaySize(340, 110).setPosition(555, 577);
    const padMe = img(sceneKey('pad_me'), 21.5).setScale(0.42).setPosition(1115, 705);
    const pinOpp = img(sceneKey('pin_opp'), 24).setDisplaySize(165, 165).setPosition(PIN_CUSHIONS.win.x, PIN_CUSHIONS.win.y);
    const pinMe = img(sceneKey('pin_me'), 24).setDisplaySize(165, 165).setPosition(PIN_CUSHIONS.lose.x, PIN_CUSHIONS.lose.y);
    this.torso = img(oppKey(id, 'torso_motion'), 21).setOrigin(TORSO.origin.x, TORSO.origin.y);
    this.head = new Swap(scene, headKey(id, 'calm'), 22, HEAD.origin, 0.14, { x: 600, y: 700 });
    this.free = img(oppKey(id, 'arm_free'), 23).setOrigin(FREE.origin.x, FREE.origin.y).setScale(FREE.scale).setRotation(FREE.rot);

    this.arms = new JoinedArms(scene, id);

    this.ourFree = new Swap(scene, meKey('free_idle'), 34, { x: 0, y: 1 }, 0.08);
    this.ourFree.place(0, 720, 0, 0.5);
    this.all = [bg, table, padOpp, padMe, pinOpp, pinMe, this.torso, this.free, ...this.head.objects(), this.arms.object, ...this.ourFree.objects()];
  }

  destroy(): void {
    for (const o of this.all) o.destroy();
  }

  update(f: ArtFrame): ArtResult {
    const pose: ClaspPose = f.fighting ? f.ourTech : 'neutral';
    const C = this.arms.update(pose, f.p, {
      x: (f.shakeOur.x + f.shakeOpp.x) * 0.3,
      y: (f.shakeOur.y + f.shakeOpp.y) * 0.3,
    }, f.dt);

    // торс и голова (голова спереди: низ шеи лежит на коже в вырезе толстовки)
    const pressing = f.fighting && f.oppTech === 'press' && f.head !== 'win' && f.head !== 'lose';
    this.pressLean += ((pressing ? 1 : 0) - this.pressLean) * (1 - Math.exp(-f.dt * 9));
    const tilt = -f.p * 0.1 + this.pressLean * 0.32;
    const cos = Math.cos(tilt);
    const sin = Math.sin(tilt);
    const bodyPoint = (x: number, y: number): Pt => ({
      x: this.arms.shoulder.x + (x - SHOULDER.x) * cos - (y - SHOULDER.y) * sin,
      y: this.arms.shoulder.y + (x - SHOULDER.x) * sin + (y - SHOULDER.y) * cos + f.breathe,
    });
    const torso = bodyPoint(TORSO.x, TORSO.y);
    this.torso.setPosition(torso.x, torso.y).setRotation(tilt).setDisplaySize(1100 * TORSO.scale, 700 * TORSO.scale);
    const neck = bodyPoint(
      TORSO.x + (TORSO_NECK.x - TORSO.origin.x * 1100) * TORSO.scale,
      TORSO.y - (TORSO.origin.y * 700 - TORSO_NECK.y) * TORSO.scale,
    );

    this.head.set(headKey(this.id, pressing ? 'press' : f.head));
    this.head.place(neck.x, neck.y + f.lower, tilt, HEAD.scale);
    this.head.tick(f.dt);

    const free = bodyPoint(FREE.x, FREE.y);
    this.free.setPosition(free.x, free.y).setRotation(FREE.rot + tilt);

    // свободная рука: сжимает рукоять, когда давим
    this.ourFree.set(meKey(f.ourEffort > 0.25 ? 'free_grip' : 'free_idle'));
    this.ourFree.place(f.shakeOur.x * 0.4, 720 + f.shakeOur.y * 0.4, 0, 0.5);
    this.ourFree.tick(f.dt);

    return { C, scale: 1 };
  }
}
