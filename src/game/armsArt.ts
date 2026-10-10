import type Phaser from 'phaser';
import type { OpponentLook } from '../core/opponents';
import type { Technique } from '../core/techniques';
import { OUTLINE, along, arrowPts, capsulePts, ellipsePts, limbPts, mix, poly, polyline, shade, sleevePts, smooth } from './draw';
import { LAYOUT, lerp, type Pt } from './layout';

type G = Phaser.GameObjects.Graphics;

const PLAYER_SKIN = 0xf2a273;
const PLAYER_SHADE = 0xd4845a;
const BAND = 0xe8344a;

/** Точки подключения предплечий к замку (локальные координаты замка). */
export const OUR_ATTACH: Pt = { x: 50, y: 64 };
export const OPP_ATTACH: Pt = { x: -76, y: 16 };

/** Поза замка: как сдвинуты и наклонены обе кисти и насколько напряжены руки. */
export interface ClaspPose {
  ourShift: Pt;
  ourTilt: number;
  oppShift: Pt;
  oppTilt: number;
  ourFlex: number;
  oppFlex: number;
  /** Сплющивание замка по вертикали (пресс давит сверху). */
  squash: number;
}

export const neutralPose = (): ClaspPose => ({
  ourShift: { x: 0, y: 0 }, ourTilt: 0, oppShift: { x: 0, y: 0 }, oppTilt: 0, ourFlex: 0.2, oppFlex: 0.2, squash: 0,
});

const OUR_POSES: Record<Technique, ClaspPose['ourShift'] & { tilt: number; flex: number; squash: number }> = {
  hook: { x: -12, y: 16, tilt: 0.3, flex: 0.55, squash: 0 },
  toproll: { x: 10, y: -20, tilt: -0.34, flex: 0.3, squash: 0 },
  press: { x: -2, y: 8, tilt: 0.02, flex: 1, squash: 0.08 },
};

const OPP_POSES: Record<Technique, ClaspPose['ourShift'] & { tilt: number; flex: number; squash: number }> = {
  hook: { x: 10, y: 14, tilt: -0.3, flex: 0.55, squash: 0 },
  toproll: { x: -8, y: -18, tilt: 0.36, flex: 0.3, squash: 0 },
  press: { x: 4, y: 6, tilt: -0.02, flex: 1, squash: 0.08 },
};

export function targetPose(ours: Technique, theirs: Technique): ClaspPose {
  const a = OUR_POSES[ours];
  const b = OPP_POSES[theirs];
  return {
    ourShift: { x: a.x, y: a.y },
    ourTilt: a.tilt,
    oppShift: { x: b.x, y: b.y },
    oppTilt: b.tilt,
    ourFlex: a.flex,
    oppFlex: b.flex,
    squash: Math.max(a.squash, b.squash),
  };
}

export function easePose(p: ClaspPose, t: ClaspPose, k: number): void {
  p.ourShift.x = lerp(p.ourShift.x, t.ourShift.x, k);
  p.ourShift.y = lerp(p.ourShift.y, t.ourShift.y, k);
  p.oppShift.x = lerp(p.oppShift.x, t.oppShift.x, k);
  p.oppShift.y = lerp(p.oppShift.y, t.oppShift.y, k);
  p.ourTilt = lerp(p.ourTilt, t.ourTilt, k);
  p.oppTilt = lerp(p.oppTilt, t.oppTilt, k);
  p.ourFlex = lerp(p.ourFlex, t.ourFlex, k);
  p.oppFlex = lerp(p.oppFlex, t.oppFlex, k);
  p.squash = lerp(p.squash, t.squash, k);
}

/** Замок кистей. Рисуется в локальных координатах, группа двигается и поворачивается сценой. */
export function drawClasp(g: G, look: OpponentLook, pose: ClaspPose): void {
  const sq = 1 - pose.squash;
  const P = (x: number, y: number): Pt => ({ x, y: y * sq });
  const mapP = (pts: readonly Pt[]) => pts.map((p) => P(p.x, p.y));

  const oppCenter = { x: -34 + pose.oppShift.x, y: -6 + pose.oppShift.y };
  const ourCenter = { x: 26 + pose.ourShift.x, y: 10 + pose.ourShift.y };

  // его кисть (дальняя)
  poly(g, mapP(ellipsePts(oppCenter.x, oppCenter.y, 50, 58, pose.oppTilt, 28)), look.skin, 7);
  // костяшки его кисти
  for (let i = 0; i < 3; i++) {
    const c = P(oppCenter.x - 12 + i * 6, oppCenter.y - 44 + i * 4);
    poly(g, ellipsePts(c.x, c.y, 5, 4.4), look.skinShade, 0, OUTLINE, 0.75);
  }

  // наша кисть (ближняя, крупнее)
  const ourHand = mapP(ellipsePts(ourCenter.x, ourCenter.y, 58, 66, pose.ourTilt, 30));
  poly(g, ourHand, PLAYER_SKIN, 8);
  poly(g, mapP(ellipsePts(ourCenter.x + 14, ourCenter.y - 28, 22, 9, pose.ourTilt - 0.5)), mix(PLAYER_SKIN, 0xffffff, 0.5), 0, OUTLINE, 0.55);
  for (let i = 0; i < 4; i++) {
    const c = P(ourCenter.x + 6 + i * 11, ourCenter.y + 36 - i * 3);
    poly(g, ellipsePts(c.x, c.y, 4.6, 4), PLAYER_SHADE, 0, OUTLINE, 0.8);
  }

  // его четыре пальца обхватывают нашу кисть
  for (let i = 0; i < 4; i++) {
    const a = P(oppCenter.x + 10, oppCenter.y - 20 + i * 18);
    const b = P(ourCenter.x - 6 - (i === 3 ? 10 : 0) + pose.oppShift.x * 0.4, ourCenter.y - 16 + i * 18 + 6 + pose.oppShift.y * 0.3);
    poly(g, capsulePts(a, b, 10, 9.5), look.skin, 5.5);
    const knuckle = along(a, b, 0.34, 0);
    polyline(g, [along(knuckle, b, 0, -6), along(knuckle, b, 0, 6)], 3, look.skinShade);
    poly(g, ellipsePts(b.x - 2, b.y - 1, 4.8, 3.6), mix(look.skin, 0xffffff, 0.6), 0, OUTLINE, 0.9);
  }

  // большие пальцы крест-накрест
  const ourThumbA = P(ourCenter.x + 6, ourCenter.y - 44);
  const ourThumbB = P(ourCenter.x - 52, ourCenter.y - 76);
  poly(g, capsulePts(ourThumbA, ourThumbB, 13, 11.5), PLAYER_SKIN, 6.5);
  poly(g, ellipsePts(ourThumbB.x + 5, ourThumbB.y + 3, 6, 4.5, -0.4), mix(PLAYER_SKIN, 0xffffff, 0.6), 0, OUTLINE, 0.9);
  const oppThumbA = P(oppCenter.x - 10, oppCenter.y - 46);
  const oppThumbB = P(oppCenter.x + 44, oppCenter.y - 82);
  poly(g, capsulePts(oppThumbA, oppThumbB, 11.5, 10), look.skin, 6);
  poly(g, ellipsePts(oppThumbB.x - 4, oppThumbB.y + 2, 5.2, 4, 0.5), mix(look.skin, 0xffffff, 0.6), 0, OUTLINE, 0.9);
}

/** Половина ширины конечности в точке t — нужна для напульсника и бликов. */
function half(wa: number, wb: number, bulge: number, bulgeAt: number, t: number): number {
  return (wa + (wb - wa) * t) / 2 + bulge * Math.exp(-((t - bulgeAt) ** 2) / (2 * 0.2 * 0.2));
}

interface PlayerArmOpts {
  base: Pt;
  wrist: Pt;
  wristWidth: number;
  flex: number;
  shake: Pt;
  /** Дрожь свободной руки на поручне. */
  restShake: number;
}

export function drawPlayerArms(g: G, o: PlayerArmOpts): void {
  const sx = o.shake.x;
  const sy = o.shake.y;
  const base = { x: o.base.x + sx, y: o.base.y + sy };
  const wrist = { x: o.wrist.x + sx, y: o.wrist.y + sy };
  const wa = 250;
  const wb = o.wristWidth;
  const bulge = 18 + o.flex * 38;
  const bAt = 0.5;

  // свободная рука на поручне (слева внизу)
  const peg = LAYOUT.ourPeg;
  const r = o.restShake;
  const pegHand = { x: peg.x + r, y: peg.y - 24 };
  poly(g, limbPts({ x: -110, y: 900 }, pegHand, 240, 118, 14), PLAYER_SKIN, 8);
  for (let i = 0; i < 4; i++) {
    const a = { x: pegHand.x - 36, y: pegHand.y - 26 + i * 25 };
    const b = { x: pegHand.x + 44, y: pegHand.y - 22 + i * 25 };
    poly(g, capsulePts(a, b, 13, 12.5), PLAYER_SKIN, 6);
  }
  poly(g, capsulePts({ x: pegHand.x - 30, y: pegHand.y - 56 }, { x: pegHand.x + 30, y: pegHand.y - 66 }, 13, 11), PLAYER_SKIN, 6);
  const sleeveL = limbPts({ x: -110, y: 900 }, { x: 60, y: 760 }, 270, 212, 0);
  poly(g, sleeveL, 0x2f6fd0, 8);

  // основная рука
  const arm = limbPts(base, wrist, wa, wb, bulge, bAt);
  poly(g, arm, PLAYER_SKIN, 9);

  // блик вдоль верхнего края
  const hi: Pt[] = [];
  for (let i = 1; i <= 9; i++) {
    const t = 0.1 + (i / 9) * 0.78;
    hi.push(along(base, wrist, t, half(wa, wb, bulge, bAt, t) * 0.55));
  }
  polyline(g, smooth(hi, false, 4), 11, mix(PLAYER_SKIN, 0xffffff, 0.55), 0.55);
  // тень снизу
  const lo: Pt[] = [];
  for (let i = 1; i <= 9; i++) {
    const t = 0.1 + (i / 9) * 0.78;
    lo.push(along(base, wrist, t, -half(wa, wb, bulge, bAt, t) * 0.6));
  }
  polyline(g, smooth(lo, false, 4), 12, PLAYER_SHADE, 0.55);

  // вена при напряжении
  if (o.flex > 0.45) {
    const v: Pt[] = [];
    for (let i = 0; i <= 8; i++) {
      const t = 0.3 + i * 0.07;
      v.push(along(base, wrist, t, half(wa, wb, bulge, bAt, t) * (0.18 + 0.1 * Math.sin(i * 1.3))));
    }
    polyline(g, smooth(v, false, 4), 6, shade(PLAYER_SKIN, 0.78), (o.flex - 0.45) * 1.6);
  }

  // напульсник
  const t1 = 0.8;
  const t2 = 0.91;
  const band = [
    along(base, wrist, t1, half(wa, wb, bulge, bAt, t1)),
    along(base, wrist, t2, half(wa, wb, bulge, bAt, t2)),
    along(base, wrist, t2, -half(wa, wb, bulge, bAt, t2)),
    along(base, wrist, t1, -half(wa, wb, bulge, bAt, t1)),
  ];
  poly(g, band, BAND, 8);
  const stripeT = 0.855;
  polyline(g, [along(base, wrist, stripeT, half(wa, wb, bulge, bAt, stripeT) - 4), along(base, wrist, stripeT, -half(wa, wb, bulge, bAt, stripeT) + 4)], 7, 0xffffff, 0.9);
}

interface OppArmOpts {
  look: OpponentLook;
  shoulder: Pt;
  shoulder2: Pt;
  elbow: Pt;
  wrist: Pt;
  flex: number;
  shake: Pt;
  restShake: number;
}

export function drawOppArms(g: G, o: OppArmOpts): void {
  const { look } = o;
  const skin = look.skin;
  const sh = (p: Pt) => ({ x: p.x + o.shake.x, y: p.y + o.shake.y });

  // свободная рука на поручне
  const peg = LAYOUT.oppPeg;
  const fist = { x: peg.x + o.restShake, y: peg.y + 4 };
  const elbow2 = { x: o.shoulder2.x + 40, y: o.shoulder2.y + 96 };
  poly(g, limbPts(o.shoulder2, elbow2, 96, 82, 0), skin, 7);
  poly(g, limbPts(elbow2, fist, 82, 64, 6), skin, 7);
  poly(g, ellipsePts(fist.x, fist.y, 30, 24), skin, 7);
  for (let i = 0; i < 3; i++) polyline(g, [{ x: fist.x - 16 + i * 12, y: fist.y - 14 }, { x: fist.x - 16 + i * 12, y: fist.y + 8 }], 3, look.skinShade);
  sleeveCap(g, look, o.shoulder2, elbow2);

  // рабочая рука: плечо → локоть → запястье
  const shoulder = sh(o.shoulder);
  const elbow = sh(o.elbow);
  const wrist = sh(o.wrist);
  poly(g, limbPts(shoulder, elbow, 104, 86, 4), skin, 8);
  poly(g, limbPts(elbow, wrist, 86, 68, 6 + o.flex * 20, 0.45), skin, 8);
  polyline(g, smooth([along(elbow, wrist, 0.18, 22), along(elbow, wrist, 0.5, 20 + o.flex * 10), along(elbow, wrist, 0.85, 16)], false, 4), 8, mix(skin, 0xffffff, 0.5), 0.5);
  polyline(g, smooth([along(elbow, wrist, 0.18, -24), along(elbow, wrist, 0.5, -24 - o.flex * 10), along(elbow, wrist, 0.85, -18)], false, 4), 9, look.skinShade, 0.5);
  sleeveCap(g, look, shoulder, elbow);
}

/** Короткий рукав: скруглённый колпак на плече, цвет чуть темнее майки, чтобы читался на торсе. */
function sleeveCap(g: G, look: OpponentLook, shoulder: Pt, elbow: Pt): void {
  const top = along(shoulder, elbow, -0.12);
  const hem = along(shoulder, elbow, 0.4);
  poly(g, sleevePts(top, hem, 112, 118), look.shirt, 8);
  polyline(g, [along(shoulder, elbow, 0.34, 56), along(shoulder, elbow, 0.34, -56)], 8, look.shirtShade);
}

/** Подсказка направления давления у замка (мировые координаты). */
export function drawPressureArrow(g: G, tech: Technique, center: Pt, scale: number, alpha: number, color: number): void {
  const s = scale;
  let a: Pt;
  let b: Pt;
  switch (tech) {
    case 'hook':
      a = { x: center.x + 10 * s, y: center.y + 30 * s };
      b = { x: center.x + 150 * s, y: center.y + 120 * s };
      break;
    case 'toproll':
      a = { x: center.x - 110 * s, y: center.y - 120 * s };
      b = { x: center.x + 20 * s, y: center.y - 150 * s };
      break;
    case 'press':
      a = { x: center.x - 20 * s, y: center.y - 200 * s };
      b = { x: center.x - 20 * s, y: center.y - 90 * s };
      break;
  }
  poly(g, arrowPts(a, b, 22 * s, 38 * s), color, 6, OUTLINE, alpha);
}
