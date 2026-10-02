import type Phaser from 'phaser';
import type { Pt } from './layout';

type G = Phaser.GameObjects.Graphics;

/** Тёмно-коричневый контур — как в мультяшных играх вроде Burrito Bison. */
export const OUTLINE = 0x3b1d14;

export const shade = (color: number, k: number): number => {
  const r = Math.min(255, Math.max(0, Math.round(((color >> 16) & 255) * k)));
  const g = Math.min(255, Math.max(0, Math.round(((color >> 8) & 255) * k)));
  const b = Math.min(255, Math.max(0, Math.round((color & 255) * k)));
  return (r << 16) | (g << 8) | b;
};

export const mix = (a: number, b: number, t: number): number => {
  const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
};

/** Закрашенный и обведённый многоугольник. */
export function poly(g: G, pts: readonly Pt[], fill: number | null, lineW = 0, line = OUTLINE, alpha = 1): void {
  if (pts.length < 3) return;
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.closePath();
  if (fill !== null) {
    g.fillStyle(fill, alpha);
    g.fillPath();
  }
  if (lineW > 0) {
    g.lineStyle(lineW, line, alpha);
    g.strokePath();
  }
}

/** Ломаная без заливки. */
export function polyline(g: G, pts: readonly Pt[], lineW: number, color = OUTLINE, alpha = 1): void {
  if (pts.length < 2) return;
  g.lineStyle(lineW, color, alpha);
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.strokePath();
}

/** Сглаживание Катмулла-Рома по опорным точкам. */
export function smooth(pts: readonly Pt[], closed = true, steps = 6): Pt[] {
  const n = pts.length;
  const get = (i: number) => (closed ? pts[((i % n) + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  const out: Pt[] = [];
  const count = closed ? n : n - 1;
  for (let i = 0; i < count; i++) {
    const p0 = get(i - 1);
    const p1 = get(i);
    const p2 = get(i + 1);
    const p3 = get(i + 2);
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push({
        x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
      });
    }
  }
  if (!closed) out.push(pts[n - 1]);
  return out;
}

export function ellipsePts(cx: number, cy: number, rx: number, ry: number, rot = 0, n = 28): Pt[] {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x = Math.cos(a) * rx;
    const y = Math.sin(a) * ry;
    out.push({ x: cx + x * c - y * s, y: cy + x * s + y * c });
  }
  return out;
}

/** Капсула (палец, большой палец, поручень) от a до b с радиусом r. */
export function capsulePts(a: Pt, b: Pt, ra: number, rb = ra, n = 8): Pt[] {
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = ang - Math.PI / 2 + (i / n) * Math.PI;
    out.push({ x: b.x + Math.cos(t) * rb, y: b.y + Math.sin(t) * rb });
  }
  for (let i = 0; i <= n; i++) {
    const t = ang + Math.PI / 2 + (i / n) * Math.PI;
    out.push({ x: a.x + Math.cos(t) * ra, y: a.y + Math.sin(t) * ra });
  }
  return out;
}

/**
 * Конечность: сужающийся многоугольник от a к b с круглыми концами.
 * bulge — выпуклость мышцы посередине (в пикселях).
 */
export function limbPts(a: Pt, b: Pt, wa: number, wb: number, bulge = 0, bulgeAt = 0.55, steps = 12): Pt[] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const half = (t: number) => (wa + (wb - wa) * t) / 2 + bulge * Math.exp(-((t - bulgeAt) ** 2) / (2 * 0.2 * 0.2));
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const w = half(t);
    const cx = a.x + dx * t;
    const cy = a.y + dy * t;
    left.push({ x: cx + nx * w, y: cy + ny * w });
    right.push({ x: cx - nx * w, y: cy - ny * w });
  }
  const out: Pt[] = [...left];
  const angN = Math.atan2(ny, nx);
  const rb = wb / 2;
  for (let k = 1; k < 6; k++) {
    const t = angN - (k * Math.PI) / 6;
    out.push({ x: b.x + Math.cos(t) * rb, y: b.y + Math.sin(t) * rb });
  }
  for (let i = steps; i >= 0; i--) out.push(right[i]);
  const ra = wa / 2;
  for (let k = 1; k < 6; k++) {
    const t = angN + Math.PI - (k * Math.PI) / 6;
    out.push({ x: a.x + Math.cos(t) * ra, y: a.y + Math.sin(t) * ra });
  }
  return out;
}

/** Рукав: круглый у плеча (a), ровный срез у манжеты (b). */
export function sleevePts(a: Pt, b: Pt, wa: number, wb: number, steps = 6): Pt[] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const out: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const w = (wa + (wb - wa) * t) / 2;
    out.push({ x: a.x + dx * t + nx * w, y: a.y + dy * t + ny * w });
  }
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    const w = (wa + (wb - wa) * t) / 2;
    out.push({ x: a.x + dx * t - nx * w, y: a.y + dy * t - ny * w });
  }
  const angN = Math.atan2(ny, nx);
  const ra = wa / 2;
  for (let k = 1; k < 6; k++) {
    const t = angN + Math.PI - (k * Math.PI) / 6;
    out.push({ x: a.x + Math.cos(t) * ra, y: a.y + Math.sin(t) * ra });
  }
  return out;
}

/** Точка на отрезке a→b со смещением по нормали. */
export function along(a: Pt, b: Pt, t: number, side = 0): Pt {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: a.x + dx * t - (dy / len) * side, y: a.y + dy * t + (dx / len) * side };
}

/** Стрелка с телом от a к b — для подсказок направления давления. */
export function arrowPts(a: Pt, b: Pt, width: number, head: number): Pt[] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const bx = b.x - ux * head;
  const by = b.y - uy * head;
  const hw = width / 2;
  return [
    { x: a.x + nx * hw, y: a.y + ny * hw },
    { x: bx + nx * hw, y: by + ny * hw },
    { x: bx + nx * head * 0.8, y: by + ny * head * 0.8 },
    b,
    { x: bx - nx * head * 0.8, y: by - ny * head * 0.8 },
    { x: bx - nx * hw, y: by - ny * hw },
    { x: a.x - nx * hw, y: a.y - ny * hw },
  ];
}

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
