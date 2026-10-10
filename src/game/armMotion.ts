import { lerp, type Pt } from './layout';

/**
 * Painted poses from left pin to right pin. Never stretch a wrist or an elbow.
 * shoulder — где рука крепится к торсу (px кадра): центр манжеты рукава. В каждом кадре рукав
 * нарисован в своём месте; сдвиг подобран так, что кадр 4 стыкуется с торсом как раньше.
 * size — во сколько раз рука в кадре нарисована крупнее, чем в кадре 4 (по площади манжеты);
 * код делит на него масштаб, и рука по ходу боя не растёт и не сжимается.
 */
export const ARM_POSES = [
  { grip: { x: 210, y: 195 }, center: { x: 294, y: 470 }, shoulder: { x: 131, y: 136 }, size: 0.957 },
  { grip: { x: 250, y: 140 }, center: { x: 384, y: 425 }, shoulder: { x: 160, y: 145 }, size: 0.943 },
  { grip: { x: 310, y: 120 }, center: { x: 464, y: 390 }, shoulder: { x: 159, y: 150 }, size: 0.958 },
  { grip: { x: 300, y: 110 }, center: { x: 539, y: 370 }, shoulder: { x: 153, y: 144 }, size: 0.981 },
  { grip: { x: 300, y: 110 }, center: { x: 614, y: 365 }, shoulder: { x: 170, y: 145 }, size: 1 },
  { grip: { x: 320, y: 110 }, center: { x: 689, y: 370 }, shoulder: { x: 158, y: 144 }, size: 1.007 },
  { grip: { x: 415, y: 105 }, center: { x: 779, y: 390 }, shoulder: { x: 149, y: 114 }, size: 1.135 },
  { grip: { x: 425, y: 125 }, center: { x: 869, y: 430 }, shoulder: { x: 162, y: 117 }, size: 1.135 },
  { grip: { x: 420, y: 135 }, center: { x: 959, y: 470 }, shoulder: { x: 158, y: 113 }, size: 1.1 },
] as const;

export const ARM_SCALE = 1;
/** Насколько кадр можно довернуть к плечу между позами. Размер не подгоняется — рука не «дышит». */
export const ARM_FIT = { angle: 0.08 };
/** Куда приходит захват на пине. Самих подушек на столе больше не рисуем — это просто точки касания. */
export const PIN_CUSHIONS ={ win: { x: 285, y: 518 }, lose: { x: 985, y: 518 } };

export function motionFrames(p: number) {
  const at = 4 - Math.max(-1, Math.min(1, p)) * 4;
  const from = Math.floor(at);
  return { from, to: Math.min(8, from + 1), blend: at - from };
}

export function mixPoint(a: Pt, b: Pt, t: number): Pt {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}

export function joinedArmsCenter(p: number): Pt {
  const { from, to, blend } = motionFrames(p);
  return mixPoint(ARM_POSES[from].center, ARM_POSES[to].center, blend);
}

export function paintedOffset(source: Pt, grip: Pt, angle: number): Pt {
  const x = (source.x - grip.x) * ARM_SCALE;
  const y = (source.y - grip.y) * ARM_SCALE;
  return { x: x * Math.cos(angle) - y * Math.sin(angle), y: x * Math.sin(angle) + y * Math.cos(angle) };
}
