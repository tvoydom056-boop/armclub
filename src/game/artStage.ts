import Phaser from 'phaser';
import type { Technique } from '../core/techniques';
import { backgroundKey, headKey, meKey, oppKey, sceneKey, type ClaspPose, type HeadKey } from './art';
import { characterArt, TEMPLATE, type CharacterArt } from './characters';
import { JoinedArms } from './joinedArms';
import { clamp } from '../core/rng';
import type { Pt } from './layout';

/**
 * Нарисованная сцена боя. Обе рабочие руки и захват — одно изображение;
 * готовые позы сохраняют форму локтей; корпус следует за плечом рабочей руки.
 * Координаты — логические пиксели сцены 1280×720. Где какая часть тела крепится —
 * манифест персонажа (src/game/characters/<id>.json), точки в px шаблонов спрайтов.
 */
/** Общая манжета из motion_4: опора (87, 91) в вырезке 151×151; перекрывает оба края рукава. */
const CUFF_ORIGIN = { x: 87 / 151, y: 91 / 151 };
/** Небольшой наклон сохраняет перекрытие рукавов даже при полном прессе. */
const TILT_LIMIT = 0.08;
/** Дальний край стола (строка 101 table.png при масштабе 0.5): ниже него торс уходит за столешницу. */
const TABLE_EDGE = 401;

/**
 * Свободная рука — общий для всех шаблон 560×620: origin — где рукав входит под торс, grip — где кулак
 * держит штырь; peg — где штырь стоит на столе (px сцены).
 */
const FREE = { origin: { x: 60, y: 45 }, grip: { x: 501, y: 493 }, squeeze: 0.025, peg: { x: 1112, y: 550 } };
/**
 * Свободная рука режется на две части (в px шаблона 560×620):
 * кулак со штырём стоит на месте как нарисован, а рука до запястья поворачивается вокруг wrist
 * и тянется вдоль своей оси до плеча. Стык прячется под кулаком. Короче min верх рукава уходит под торс.
 */
const FREE_SPLIT = { fist: { x: 418, y: 375 }, feather: 30, armRight: 450, wrist: { x: 425, y: 445 }, min: 0.7, max: 1.6 };

/** Копия свободной руки, где всё левее и выше кулака плавно гаснет: стык с повёрнутой рукой под ним не виден. */
function fistKey(scene: Phaser.Scene, key: string): string {
  const fistKey = `${key}:fist`;
  if (scene.textures.exists(fistKey)) return fistKey;
  const source = scene.textures.get(key).getSourceImage() as HTMLImageElement;
  const px = source.width / TEMPLATE.armFree.x;
  const { fist, feather } = FREE_SPLIT;
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(source, 0, 0);
  ctx.globalCompositeOperation = 'destination-in';
  for (const [x0, y0, x1, y1] of [[fist.x, 0, fist.x + feather, 0], [0, fist.y, 0, fist.y + feather]]) {
    const fade = ctx.createLinearGradient(x0 * px, y0 * px, x1 * px, y1 * px);
    fade.addColorStop(0, 'rgba(0,0,0,0)');
    fade.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  scene.textures.addCanvas(fistKey, canvas);
  return fistKey;
}

/** Копия головы, у которой низ шеи плавно гаснет между строками fade.from и fade.to шаблона 600×700. */
function fadedHeadKey(scene: Phaser.Scene, key: string, fade: { from: number; to: number }): string {
  const fadedKey = `${key}:fade-${fade.from}-${fade.to}`;
  if (scene.textures.exists(fadedKey)) return fadedKey;
  const source = scene.textures.get(key).getSourceImage() as HTMLImageElement;
  const px = source.height / TEMPLATE.head.y;
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(source, 0, 0);
  ctx.globalCompositeOperation = 'destination-in';
  const fadeOut = ctx.createLinearGradient(0, fade.from * px, 0, Math.max(fade.to, fade.from + 1) * px);
  fadeOut.addColorStop(0, 'rgba(0,0,0,1)');
  fadeOut.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = fadeOut;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  scene.textures.addCanvas(fadedKey, canvas);
  return fadedKey;
}

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

  origin(o: Pt): void {
    for (const img of [this.cur, this.old]) img.setOrigin(o.x, o.y);
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

interface ArtFrame {
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

interface ArtResult {
  C: Pt;
  scale: number;
}

/** Где в последнем кадре оказались точки манифеста (px сцены) — для редактора рига. */
export interface ArtPoints {
  shoulder: Pt;
  neck: Pt;
  freeShoulder: Pt;
  tilt: number;
}

export class ArtStage {
  private torso: Phaser.GameObjects.Image;
  private tableMask: Phaser.GameObjects.Graphics;
  private head: Swap;
  /** Рука до запястья внутри контейнера: контейнер стоит на запястье, его ось x смотрит на плечо. */
  private freeRig: Phaser.GameObjects.Container;
  private freeArm: Phaser.GameObjects.Image;
  private freeFist: Phaser.GameObjects.Image;
  private arms: JoinedArms;
  private cuff: Phaser.GameObjects.Image | null;
  private ourFree: Swap;
  private all: Phaser.GameObjects.GameObject[];
  private pressLean = 0;
  private freePull = 0;
  private rig!: CharacterArt;
  points: ArtPoints = { shoulder: { x: 0, y: 0 }, neck: { x: 0, y: 0 }, freeShoulder: { x: 0, y: 0 }, tilt: 0 };

  constructor(private scene: Phaser.Scene, private id: string) {
    const rig = characterArt(id);
    if (!rig) throw new Error(`Нет манифеста src/game/characters/${id}.json`);
    const img = (key: string, depth: number) => scene.add.image(0, 0, key).setDepth(depth);
    const bg = img(backgroundKey(id), 0).setOrigin(0, 0).setDisplaySize(1280, 720);
    // дальний край стола (100 px сверху картинки) на y=400, торс нависает над столом
    const table = img(sceneKey('table'), 20).setOrigin(0.5, 1).setScale(0.5).setPosition(640, 730);
    // соперник сидит за столом: всё, что ниже дальнего края, закрывает столешница
    this.tableMask = scene.make.graphics({}, false).fillStyle(0xffffff).fillRect(0, 0, 1280, TABLE_EDGE);
    this.torso = img(oppKey(id, 'torso_motion'), 21).enableFilters();
    // внешняя маска живёт в координатах сцены (через основную камеру), а не в координатах торса
    this.torso.filters!.external.addMask(this.tableMask, false, scene.cameras.main);
    this.head = new Swap(scene, headKey(id, 'calm'), 22, { x: 0.5, y: 1 }, 0.14, TEMPLATE.head);
    this.freeFist = img(fistKey(scene, oppKey(id, 'arm_free')), 20.81)
      .setOrigin(FREE.grip.x / TEMPLATE.armFree.x, FREE.grip.y / TEMPLATE.armFree.y).setPosition(FREE.peg.x, FREE.peg.y);
    const { armRight, wrist } = FREE_SPLIT;
    const px = this.freeFist.width / TEMPLATE.armFree.x;
    this.freeArm = scene.add.image(0, 0, oppKey(id, 'arm_free'))
      .setOrigin(wrist.x / TEMPLATE.armFree.x, wrist.y / TEMPLATE.armFree.y).setCrop(0, 0, armRight * px, TEMPLATE.armFree.y * px)
      .setRotation(-Math.atan2(FREE.origin.y - wrist.y, FREE.origin.x - wrist.x));
    this.freeRig = scene.add.container(0, 0, [this.freeArm]).setDepth(20.8);

    this.arms = new JoinedArms(scene, id, rig.arms.scale);
    this.cuff = rig.cuff ? img(oppKey(id, 'cuff'), 32).setOrigin(CUFF_ORIGIN.x, CUFF_ORIGIN.y) : null;

    this.ourFree = new Swap(scene, meKey('free_idle'), 34, { x: 0, y: 1 }, 0.08);
    this.ourFree.place(0, 720, 0, 0.5);
    this.all = [bg, table, this.tableMask, this.torso, this.freeRig, this.freeFist, ...this.head.objects(), this.arms.object, ...(this.cuff ? [this.cuff] : []), ...this.ourFree.objects()];
    this.setRig(rig);
  }

  /** Применяет манифест; редактор рига зовёт его на каждую правку. */
  setRig(rig: CharacterArt): void {
    this.rig = rig;
    const { torso, head, freeArm } = rig;
    this.torso.setOrigin(torso.shoulder.x / TEMPLATE.torso.x, torso.shoulder.y / TEMPLATE.torso.y)
      .setDisplaySize(TEMPLATE.torso.x * torso.scale, TEMPLATE.torso.y * torso.scale);
    this.head.origin({ x: head.neck.x / TEMPLATE.head.x, y: head.neck.y / TEMPLATE.head.y });
    for (const o of [this.freeFist, this.freeArm]) o.setDisplaySize(TEMPLATE.armFree.x * freeArm.scale, TEMPLATE.armFree.y * freeArm.scale);
    const { wrist } = FREE_SPLIT;
    this.freeRig.setPosition(FREE.peg.x + (wrist.x - FREE.grip.x) * freeArm.scale, FREE.peg.y + (wrist.y - FREE.grip.y) * freeArm.scale);
    this.arms.size = rig.arms.scale;
  }

  destroy(): void {
    for (const o of this.all) o.destroy();
  }

  update(f: ArtFrame): ArtResult {
    const { torso: body, head, freeArm, arms, cuff } = this.rig;
    const pose: ClaspPose = f.fighting ? f.ourTech : 'neutral';
    // на пути к нашему штырю (p < 0) кулак опускается ниже плеча; в нейтрали и у самой подушки наклона нет
    const sag = Math.sin(Math.PI * clamp(-f.p, 0, 1));
    const C = this.arms.update(pose, f.p, {
      x: (f.shakeOur.x + f.shakeOpp.x) * 0.3,
      y: (f.shakeOur.y + f.shakeOpp.y) * 0.3 + arms.drop + arms.sag.drop * sag,
    }, f.dt, arms.sag.angle * sag);
    if (this.cuff && cuff) this.cuff.setPosition(this.arms.shoulder.x, this.arms.shoulder.y)
      .setRotation(this.arms.rotation).setScale(this.arms.scale * cuff.scale);

    // торс стоит точкой shoulder на плече рабочей руки и наклоняется вокруг неё; голова — на шее торса
    const pressing = f.fighting && f.oppTech === 'press' && f.head !== 'win' && f.head !== 'lose';
    this.pressLean += ((pressing ? 1 : 0) - this.pressLean) * (1 - Math.exp(-f.dt * 9));
    const tilt = clamp(-f.p * 0.1 + this.pressLean * 0.32, -TILT_LIMIT, TILT_LIMIT);
    const cos = Math.cos(tilt);
    const sin = Math.sin(tilt);
    const shoulder = this.arms.shoulder;
    /** Точка торса (px шаблона) в сцене. */
    const bodyPoint = (p: Pt): Pt => {
      const x = (p.x - body.shoulder.x) * body.scale;
      const y = (p.y - body.shoulder.y) * body.scale;
      return { x: shoulder.x + x * cos - y * sin, y: shoulder.y + x * sin + y * cos + f.breathe };
    };
    this.torso.setPosition(shoulder.x, shoulder.y + f.breathe).setRotation(tilt);
    const neck = bodyPoint(body.neck);

    const face = headKey(this.id, pressing ? 'press' : f.head);
    this.head.set(head.fade ? fadedHeadKey(this.scene, face, head.fade) : face);
    this.head.place(neck.x, neck.y + f.lower, tilt, head.scale);
    this.head.tick(f.dt);

    // свободная рука: когда он давит, сжимает рукоять и подтягивает её к себе, дрожит вместе с телом
    const straining = f.fighting && (pressing || f.head === 'strain' || f.head === 'telegraph');
    this.freePull += ((straining ? 1 : 0) - this.freePull) * (1 - Math.exp(-f.dt * 8));
    const free = bodyPoint(body.freeShoulder);
    // Кулак держит штырь на месте, плечо всегда соединено с телом: рука от запястья смотрит на плечо и тянется до него.
    const { wrist, min, max } = FREE_SPLIT;
    const reach = Math.hypot(FREE.origin.x - wrist.x, FREE.origin.y - wrist.y) * freeArm.scale;
    const toShoulder = { x: free.x - this.freeRig.x, y: free.y - this.freeRig.y };
    this.freeRig.setRotation(Math.atan2(toShoulder.y, toShoulder.x) - this.freePull * FREE.squeeze)
      .setScale(clamp(Math.hypot(toShoulder.x, toShoulder.y) / reach, min, max), 1);
    this.points = { shoulder: { x: shoulder.x, y: shoulder.y + f.breathe }, neck, freeShoulder: free, tilt };

    // свободная рука: сжимает рукоять, когда давим
    this.ourFree.set(meKey(f.ourEffort > 0.25 ? 'free_grip' : 'free_idle'));
    this.ourFree.place(f.shakeOur.x * 0.4, 720 + f.shakeOur.y * 0.4, 0, 0.5);
    this.ourFree.tick(f.dt);

    return { C, scale: 1 };
  }
}
