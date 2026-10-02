export interface Pt {
  x: number;
  y: number;
}

export const W = 1280;
export const H = 720;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Раскладка сцены (вид от первого лица, правая рука, слегка сверху и сбоку).
 * Наш локоть — за нижним краем экрана справа, локоть соперника — слева вдали.
 * Победа = замок кистей падает на его подушку (слева вверху), поражение — на нашу (справа внизу).
 */
export const LAYOUT = {
  oppHead: { x: 640, y: 168 } as Pt,
  oppShoulder: { x: 462, y: 300 } as Pt,
  oppElbow: { x: 520, y: 412 } as Pt,
  oppShoulder2: { x: 830, y: 300 } as Pt,
  oppPeg: { x: 912, y: 440 } as Pt,
  playerBase: { x: 940, y: 860 } as Pt,
  ourPeg: { x: 196, y: 640 } as Pt,
  ourShoulder2: { x: 60, y: 860 } as Pt,
  pinWin: { x: 405, y: 472 } as Pt,
  neutral: { x: 655, y: 338 } as Pt,
  pinLose: { x: 838, y: 612 } as Pt,
};

/** p: +1 — соперника положили, −1 — положили нас. Дуга через три точки. */
export function claspPoint(p: number): Pt {
  const { pinWin: w, neutral: n, pinLose: l } = LAYOUT;
  const cx = 2 * n.x - (w.x + l.x) / 2;
  const cy = 2 * n.y - (w.y + l.y) / 2;
  const t = (1 - p) / 2;
  const a = (1 - t) * (1 - t);
  const b = 2 * (1 - t) * t;
  const c = t * t;
  return { x: a * w.x + b * cx + c * l.x, y: a * w.y + b * cy + c * l.y };
}

/** Ближе к нам — крупнее. */
export function claspScale(p: number): number {
  return p >= 0 ? lerp(1, 0.84, p) : lerp(1, 1.4, -p);
}

/** Наклон замка в радианах: к победе — влево, к поражению — вправо. */
export function claspRotation(p: number): number {
  return p >= 0 ? -p * 0.95 : -p * 0.8;
}
