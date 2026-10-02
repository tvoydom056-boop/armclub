import { lerp, type Pt } from './layout';

/** Painted poses from left pin to right pin. Never stretch a wrist or an elbow. */
export const ARM_POSES = [
  { grip: { x: 210, y: 195 }, center: { x: 310, y: 470 } },
  { grip: { x: 250, y: 140 }, center: { x: 400, y: 425 } },
  { grip: { x: 310, y: 120 }, center: { x: 480, y: 390 } },
  { grip: { x: 300, y: 110 }, center: { x: 555, y: 370 } },
  { grip: { x: 300, y: 110 }, center: { x: 630, y: 365 } },
  { grip: { x: 320, y: 110 }, center: { x: 705, y: 370 } },
  { grip: { x: 415, y: 105 }, center: { x: 795, y: 390 } },
  { grip: { x: 425, y: 125 }, center: { x: 885, y: 430 } },
  { grip: { x: 420, y: 135 }, center: { x: 975, y: 470 } },
] as const;

export const ARM_SCALE = 1.25;
export const ARM_SHOULDER = { x: 170, y: 145 };
export const PIN_CUSHIONS = { win: { x: 285, y: 518 }, lose: { x: 1000, y: 518 } };

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
