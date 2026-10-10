import type Phaser from 'phaser';
import type { OpponentLook } from '../core/opponents';
import { OUTLINE, capsulePts, clamp01, ellipsePts, mix, poly, polyline, shade, smooth } from './draw';
import type { Pt } from './layout';

type G = Phaser.GameObjects.Graphics;

/** Мимика. Все значения плавно подтягиваются к целям из сцены. */
export interface Face {
  /** −1 злой … 0 … +1 испуганный */
  brow: number;
  eye: number;
  mouth: number;
  grit: number;
  smirk: number;
  sweat: number;
  flush: number;
  veins: number;
}

export const calmFace = (): Face => ({ brow: 0, eye: 0.9, mouth: 0.05, grit: 0, smirk: 0.2, sweat: 0, flush: 0, veins: 0 });

interface DrawOpts {
  head: Pt;
  tilt: number;
  shake: Pt;
  time: number;
  /** Куда смотрят зрачки (единичный вектор). */
  look: Pt;
}

const INK = 0x2b1a14;
const WHITE = 0xffffff;

export function drawTorso(g: G, look: OpponentLook, head: Pt, breathe: number): void {
  const wd = 188 * look.build;
  const hx = head.x;
  const hy = head.y + breathe * 2;
  const pts: Pt[] = [
    [-0.3, 96], [-0.62, 112], [-0.93, 150], [-1, 205], [-0.96, 310], [0.96, 310], [1, 205], [0.93, 150], [0.62, 112], [0.3, 96],
  ].map(([k, y]) => ({ x: hx + k * wd, y: hy + y }));
  const body = smooth(pts, true, 6);
  poly(g, body, look.shirt, 7);
  // складки и тень под рукой
  polyline(g, smooth([
    { x: hx - wd * 0.5, y: hy + 150 }, { x: hx - wd * 0.42, y: hy + 200 }, { x: hx - wd * 0.46, y: hy + 250 },
  ], false, 6), 5, look.shirtShade);
  polyline(g, smooth([
    { x: hx + wd * 0.5, y: hy + 150 }, { x: hx + wd * 0.42, y: hy + 200 }, { x: hx + wd * 0.46, y: hy + 250 },
  ], false, 6), 5, look.shirtShade);
  // шея
  poly(g, smooth([
    { x: hx - 36, y: hy + 60 }, { x: hx + 36, y: hy + 60 }, { x: hx + 40, y: hy + 112 }, { x: hx, y: hy + 124 }, { x: hx - 40, y: hy + 112 },
  ], true, 6), look.skinShade, 6);
  // воротник
  polyline(g, smooth([
    { x: hx - 50, y: hy + 98 }, { x: hx - 24, y: hy + 124 }, { x: hx, y: hy + 130 }, { x: hx + 24, y: hy + 124 }, { x: hx + 50, y: hy + 98 },
  ], false, 6), 9, look.shirtShade);
  polyline(g, smooth([
    { x: hx - 50, y: hy + 98 }, { x: hx - 24, y: hy + 124 }, { x: hx, y: hy + 130 }, { x: hx + 24, y: hy + 124 }, { x: hx + 50, y: hy + 98 },
  ], false, 6), 4, OUTLINE);
}

export function drawHead(g: G, look: OpponentLook, f: Face, o: DrawOpts): void {
  const cos = Math.cos(o.tilt);
  const sin = Math.sin(o.tilt);
  // голова качается вокруг основания шеи (локально y = 110)
  const S = 0.92;
  const T = (x: number, y: number): Pt => {
    const px = x * S;
    const py = (y - 110) * S;
    return { x: o.head.x + o.shake.x + px * cos - py * sin, y: o.head.y + o.shake.y + 110 + px * sin + py * cos };
  };
  const M = (pts: readonly Pt[]) => pts.map((p) => T(p.x, p.y));
  const E = (cx: number, cy: number, rx: number, ry: number, rot = 0) => M(ellipsePts(cx, cy, rx, ry, rot, 24));

  // уши
  poly(g, E(-101, 8, 14, 22), look.skin, 6);
  poly(g, E(101, 8, 14, 22), look.skin, 6);
  poly(g, E(-101, 8, 6, 12), look.skinShade, 0);
  poly(g, E(101, 8, 6, 12), look.skinShade, 0);

  // голова
  const headShape = smooth([
    { x: 0, y: -106 }, { x: 54, y: -100 }, { x: 92, y: -62 }, { x: 102, y: -4 }, { x: 92, y: 52 }, { x: 54, y: 92 },
    { x: 0, y: 106 }, { x: -54, y: 92 }, { x: -92, y: 52 }, { x: -102, y: -4 }, { x: -92, y: -62 }, { x: -54, y: -100 },
  ], true, 6);
  poly(g, M(headShape), look.skin, 8);
  // блик и тень
  poly(g, E(-48, -58, 26, 12, -0.6), mix(look.skin, WHITE, 0.4), 0, OUTLINE, 0.5);
  if (f.flush > 0.02) poly(g, M(headShape), 0xe8344a, 0, OUTLINE, 0.28 * f.flush);

  // борода — под ртом и носом
  if (look.facial === 'beard') {
    const beard = smooth([
      { x: -98, y: 6 }, { x: -92, y: 62 }, { x: -60, y: 104 }, { x: 0, y: 120 }, { x: 60, y: 104 }, { x: 92, y: 62 },
      { x: 98, y: 6 }, { x: 72, y: 34 }, { x: 46, y: 40 }, { x: 0, y: 34 }, { x: -46, y: 40 }, { x: -72, y: 34 },
    ], true, 6);
    poly(g, M(beard), look.hair, 6);
  }

  // нос
  poly(g, E(0, 16, 15, 13), mix(look.skin, look.skinShade, 0.45), 5);
  poly(g, E(-4, 11, 5, 3.6), mix(look.skin, WHITE, 0.55), 0, OUTLINE, 0.7);

  // румянец
  if (f.flush > 0.02) {
    poly(g, E(-58, 30, 24, 15), 0xff5a6a, 0, OUTLINE, 0.5 * f.flush);
    poly(g, E(58, 30, 24, 15), 0xff5a6a, 0, OUTLINE, 0.5 * f.flush);
  }

  drawMouth(g, look, f, M);

  if (look.facial === 'mustache') {
    const stache = smooth([
      { x: -52, y: 38 }, { x: -26, y: 26 }, { x: 0, y: 34 }, { x: 26, y: 26 }, { x: 52, y: 38 }, { x: 32, y: 54 }, { x: 0, y: 44 }, { x: -32, y: 54 },
    ], true, 6);
    poly(g, M(stache), look.hair, 5);
  }

  // глаза
  const eyeOpen = Math.max(0.12, f.eye);
  for (const side of [-1, 1]) {
    const cx = side * 37;
    const cy = -12;
    poly(g, E(cx, cy, 22, 24 * eyeOpen), WHITE, 5);
    const px = cx + o.look.x * 7;
    const py = cy + o.look.y * 7 * eyeOpen;
    poly(g, E(px, py, 9.5, 11 * Math.max(0.55, eyeOpen)), INK, 0);
    poly(g, E(px - 3, py - 4 * eyeOpen, 3.2, 3.2), WHITE, 0);
  }

  // очки
  if (look.glasses) {
    for (const side of [-1, 1]) {
      const lens = E(side * 37, -12, 31, 30);
      poly(g, lens, WHITE, 0, OUTLINE, 0.22);
      poly(g, lens, null, 6, 0x2a2a3a);
    }
    polyline(g, M([{ x: -8, y: -14 }, { x: 8, y: -14 }]), 6, 0x2a2a3a);
    polyline(g, M([{ x: -68, y: -16 }, { x: -98, y: -6 }]), 5, 0x2a2a3a);
    polyline(g, M([{ x: 68, y: -16 }, { x: 98, y: -6 }]), 5, 0x2a2a3a);
  }

  drawHair(g, look, M, E);

  // брови
  const browColor = look.hairStyle === 'bald' && look.facial === 'none' ? shade(look.skin, 0.6) : look.hair;
  for (const side of [-1, 1]) {
    const innerY = -46 - f.brow * 13 + (f.eye - 0.6) * -4;
    const outerY = -48 + f.brow * 6 + (f.eye - 0.6) * -4;
    const a = { x: side * 10, y: innerY };
    const b = { x: side * 62, y: outerY };
    poly(g, M(capsulePts(a, b, 6.5, 5.5)), browColor, 4);
  }

  // вены на лбу
  if (f.veins > 0.05) {
    const veins = M(smooth([{ x: 70, y: -86 }, { x: 62, y: -74 }, { x: 68, y: -64 }, { x: 60, y: -54 }], false, 5));
    polyline(g, veins, 7, OUTLINE, f.veins);
    polyline(g, veins, 3.5, 0xe0463e, f.veins);
    const branch = M([{ x: 62, y: -74 }, { x: 78, y: -76 }]);
    polyline(g, branch, 5, OUTLINE, f.veins);
    polyline(g, branch, 2.5, 0xe0463e, f.veins);
  }

  // пот
  if (f.sweat > 0.05) {
    const drops: [number, number][] = [[-70, -66], [76, -48], [-96, -6], [88, 20]];
    drops.forEach(([x, y], i) => {
      const cycle = (o.time * 0.9 + i * 0.37) % 1;
      const a = f.sweat * Math.min(1, (1 - cycle) * 3);
      const p = T(x, y + cycle * 34);
      poly(g, ellipsePts(p.x, p.y + 5, 7, 8.5).map((q) => q), 0x8fdcff, 3, OUTLINE, a);
      poly(g, [{ x: p.x - 5.4, y: p.y + 1 }, { x: p.x, y: p.y - 13 }, { x: p.x + 5.4, y: p.y + 1 }], 0x8fdcff, 0, OUTLINE, a);
    });
  }
}

function drawMouth(g: G, look: OpponentLook, f: Face, M: (pts: readonly Pt[]) => Pt[]): void {
  const cy = 62;
  const w = 38 + f.grit * 8;
  const corner = cy - f.smirk * 11;
  const open = f.mouth * 34;
  const lip = 5;
  const outline = smooth([
    { x: -w, y: corner }, { x: -w * 0.5, y: cy - 7 - f.smirk * 2 }, { x: 0, y: cy - 9 }, { x: w * 0.5, y: cy - 7 - f.smirk * 2 },
    { x: w, y: corner }, { x: w * 0.55, y: cy + 8 + open }, { x: 0, y: cy + 11 + open }, { x: -w * 0.55, y: cy + 8 + open },
  ], true, 6);
  const dark = 0x6b1f2a;
  poly(g, M(outline), dark, 6);
  if (f.mouth > 0.25 || f.grit > 0.3) {
    const teethH = f.grit > 0.3 ? 15 + open * 0.3 : 12;
    const teeth = smooth([
      { x: -w * 0.78, y: corner + 1 }, { x: 0, y: cy - 8 }, { x: w * 0.78, y: corner + 1 },
      { x: w * 0.7, y: corner + teethH }, { x: 0, y: cy - 6 + teethH }, { x: -w * 0.7, y: corner + teethH },
    ], true, 4);
    poly(g, M(teeth), WHITE, 0);
    if (f.grit > 0.3) {
      for (let i = -3; i <= 3; i++) polyline(g, M([{ x: i * w * 0.22, y: cy - 7 }, { x: i * w * 0.22, y: cy - 6 + teethH }]), 2.5, OUTLINE, 0.8);
      polyline(g, M([{ x: -w * 0.74, y: corner + teethH * 0.55 }, { x: w * 0.74, y: corner + teethH * 0.55 }]), 3, OUTLINE, 0.8);
    }
  }
  if (f.mouth > 0.5) {
    poly(g, M(ellipsePts(0, cy + open * 0.75 + 4, w * 0.45, 6 + open * 0.14)), 0xff7a8a, 0);
  }
  // верхняя губа-контур
  polyline(g, M(outline.slice(0, Math.ceil(outline.length * 0.62))), 5, OUTLINE);
  if (look.facial === 'beard') polyline(g, M(smooth([{ x: -w - 4, y: corner - 2 }, { x: 0, y: cy - 12 }, { x: w + 4, y: corner - 2 }], false, 5)), lip, look.hair);
}

function drawHair(g: G, look: OpponentLook, M: (pts: readonly Pt[]) => Pt[], E: (cx: number, cy: number, rx: number, ry: number, rot?: number) => Pt[]): void {
  switch (look.hairStyle) {
    case 'bald':
      poly(g, E(-30, -82, 24, 9, -0.35), WHITE, 0, OUTLINE, 0.55);
      break;
    case 'messy': {
      const spikes: Pt[] = [
        [-98, -24], [-106, -70], [-84, -94], [-84, -126], [-54, -102], [-42, -134], [-20, -106], [0, -140], [18, -106], [40, -132], [52, -102],
        [82, -124], [88, -92], [106, -68], [98, -24], [82, -52], [40, -74], [0, -64], [-40, -74], [-82, -52],
      ].map(([x, y]) => ({ x, y }));
      poly(g, M(spikes), look.hair, 6);
      break;
    }
    case 'cap': {
      const dome = smooth([
        { x: -102, y: -44 }, { x: -98, y: -92 }, { x: -52, y: -122 }, { x: 0, y: -130 }, { x: 52, y: -122 }, { x: 98, y: -92 }, { x: 102, y: -44 },
        { x: 50, y: -52 }, { x: 0, y: -56 }, { x: -50, y: -52 },
      ], true, 6);
      poly(g, M(dome), look.accent, 7);
      poly(g, M(smooth([{ x: -66, y: -104 }, { x: -20, y: -120 }, { x: -30, y: -108 }], true, 4)), mix(look.accent, WHITE, 0.3), 0, OUTLINE, 0.7);
      const brim = smooth([
        { x: -112, y: -48 }, { x: -70, y: -62 }, { x: 0, y: -66 }, { x: 70, y: -62 }, { x: 112, y: -48 },
        { x: 80, y: -26 }, { x: 0, y: -20 }, { x: -80, y: -26 },
      ], true, 6);
      poly(g, M(brim), shade(look.accent, 0.78), 7);
      break;
    }
    case 'bun': {
      poly(g, E(0, -128, 34, 28), look.hair, 6);
      const cap = smooth([
        { x: -102, y: -6 }, { x: -100, y: -74 }, { x: -58, y: -108 }, { x: 0, y: -116 }, { x: 58, y: -108 }, { x: 100, y: -74 }, { x: 102, y: -6 },
        { x: 84, y: -40 }, { x: 40, y: -66 }, { x: 0, y: -72 }, { x: -40, y: -66 }, { x: -84, y: -40 },
      ], true, 6);
      poly(g, M(cap), look.hair, 6);
      polyline(g, M(smooth([{ x: -30, y: -102 }, { x: 0, y: -108 }, { x: 30, y: -102 }], false, 5)), 3, mix(look.hair, 0x888888, 0.5));
      break;
    }
    case 'bandana': {
      const dome = smooth([
        { x: -100, y: -48 }, { x: -94, y: -92 }, { x: -50, y: -120 }, { x: 0, y: -126 }, { x: 50, y: -120 }, { x: 94, y: -92 }, { x: 100, y: -48 },
      ], true, 6);
      poly(g, M(dome), look.hair, 6);
      const band = smooth([
        { x: -104, y: -48 }, { x: -52, y: -62 }, { x: 0, y: -64 }, { x: 52, y: -62 }, { x: 104, y: -48 },
        { x: 102, y: -20 }, { x: 52, y: -32 }, { x: 0, y: -34 }, { x: -52, y: -32 }, { x: -102, y: -20 },
      ], true, 6);
      poly(g, M(band), look.accent, 7);
      for (let i = -3; i <= 3; i++) poly(g, E(i * 26, -48 + Math.abs(i) * 1.2, 3.6, 3.6), WHITE, 0, OUTLINE, 0.85);
      poly(g, M([{ x: 98, y: -38 }, { x: 134, y: -62 }, { x: 128, y: -36 }]), shade(look.accent, 0.85), 5);
      poly(g, M([{ x: 98, y: -34 }, { x: 130, y: -12 }, { x: 118, y: -40 }]), shade(look.accent, 0.85), 5);
      break;
    }
  }
}

/** Цели мимики по состоянию боя. */
export interface FaceCtx {
  phase: 'ready' | 'fight' | 'won' | 'lost';
  /** −1..1, +1 — соперника положили. */
  position: number;
  /** 0..1 — усилие соперника. */
  effort: number;
  telegraphing: boolean;
  surgeWarn: boolean;
  surging: boolean;
  resting: boolean;
  stamina: number;
}

export function faceTarget(c: FaceCtx): Face {
  const f = calmFace();
  if (c.phase === 'ready') {
    f.brow = -0.25;
    f.eye = 0.8;
    f.smirk = 0.1;
    return f;
  }
  if (c.phase === 'lost') {
    // мы проиграли — он радуется
    f.brow = -0.1;
    f.eye = 0.85;
    f.mouth = 0.7;
    f.smirk = 1;
    return f;
  }
  if (c.phase === 'won') {
    f.brow = 1;
    f.eye = 1;
    f.mouth = 0.9;
    f.smirk = -1;
    f.sweat = 1;
    f.flush = 0.4;
    return f;
  }
  const losing = clamp01((c.position - 0.1) / 0.8);
  const winning = clamp01((-c.position - 0.1) / 0.8);
  f.brow = -0.15 - c.effort * 0.5 + losing * 1.3;
  f.eye = 0.8 + losing * 0.2 - c.effort * 0.2;
  f.grit = c.effort > 0.55 && losing < 0.4 ? clamp01((c.effort - 0.55) * 3) : 0;
  f.mouth = 0.08 + losing * 0.55 + c.effort * 0.1;
  f.smirk = 0.25 + winning * 0.7 - losing * 1.3 - c.effort * 0.35;
  f.sweat = clamp01(0.25 + c.effort * 0.5 + losing * 0.6 + (1 - c.stamina) * 0.4);
  f.flush = clamp01(c.effort * 0.35 + losing * 0.3);
  f.veins = clamp01((c.effort - 0.5) * 2);
  if (c.telegraphing) {
    f.brow = -1;
    f.grit = 1;
    f.mouth = 0.1;
    f.eye = 0.55;
    f.smirk = -0.2;
    f.veins = 1;
  }
  if (c.surgeWarn) {
    f.brow = -1;
    f.eye = 1;
    f.grit = 1;
    f.flush = 1;
    f.veins = 1;
    f.smirk = -0.4;
  }
  if (c.surging) {
    f.brow = -1;
    f.eye = 0.6;
    f.grit = 0;
    f.mouth = 1;
    f.flush = 1;
    f.veins = 1;
    f.smirk = -0.6;
  }
  if (c.resting) {
    f.brow = 0.5;
    f.eye = 0.35;
    f.grit = 0;
    f.mouth = 0.55;
    f.smirk = -0.5;
    f.sweat = 1;
    f.flush = 0.5;
    f.veins = 0;
  }
  return f;
}
