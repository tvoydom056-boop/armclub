/** Маски сверены по игровым PNG 1536×1024, а не по координатам генерационного промта. */
export interface LayerSpec {
  mode: 'table' | 'dumbbell' | 'palms' | 'rails' | 'free';
  anchor: readonly [number, number];
  grip: readonly [number, number];
  cable?: readonly [number, number];
}
export const LAYERS: Readonly<Record<string, LayerSpec>> = {
  pushups: { mode: 'palms', anchor: [768, 650], grip: [768, 420] },
  run: { mode: 'free', anchor: [768, 1024], grip: [768, 650] },
  jump_rope: { mode: 'free', anchor: [768, 1024], grip: [768, 500] },
  gripper: { mode: 'free', anchor: [1100, 900], grip: [790, 480] },
  gripper_pro: { mode: 'free', anchor: [1100, 900], grip: [790, 480] },
  strap_dumbbell: { mode: 'dumbbell', anchor: [1040, 850], grip: [680, 330] },
  medball: { mode: 'free', anchor: [768, 1024], grip: [768, 440] },
  straight_bar: { mode: 'free', anchor: [768, 1024], grip: [768, 550], cable: [768, 0] },
  dips: { mode: 'rails', anchor: [768, 550], grip: [768, 550] },
  tricep_rope: { mode: 'free', anchor: [768, 1024], grip: [768, 300], cable: [768, 0] },
  strap_block: { mode: 'table', anchor: [1040, 850], grip: [780, 190], cable: [1280, 495] },
  fat_grip: { mode: 'table', anchor: [1040, 850], grip: [800, 160], cable: [1280, 495] },
  roller: { mode: 'table', anchor: [1040, 850], grip: [850, 170], cable: [1280, 495] },
  cone: { mode: 'table', anchor: [1040, 850], grip: [800, 120], cable: [1280, 495] },
  eccentric: { mode: 'table', anchor: [1040, 850], grip: [850, 180], cable: [1280, 495] },
  triple: { mode: 'table', anchor: [1040, 850], grip: [800, 160], cable: [1280, 495] },
  multispin: { mode: 'table', anchor: [1040, 850], grip: [720, 130], cable: [1280, 495] },
};

/** Граница движения. Локоть, столешница вне предплечья, коврик и металлоконструкция фиксированы. */
export function movingPixel(spec: LayerSpec, x: number, y: number, r: number, g: number, b: number): boolean {
  if (spec.mode === 'free') return true;
  if (spec.mode === 'palms') return y > 650;
  if (spec.mode === 'rails') {
    // Руки меняют позу; металлические брусья (серые пиксели) всегда берутся из rest.
    return r > g * 1.15 && g > b * 1.15 && r > 100;
  }
  if (spec.mode === 'dumbbell') return y < 745;
  if (y >= 780) return false;
  if (y < 610) return x < 1220;
  // Узкая область предплечья на столе, без подушки и локтя.
  const left = 805, right = 1040 + (y - 610) * .95;
  return x > left && x < right && r > g * 1.15 && g > b * 1.1;
}

/** Убирает запечённый отрезок троса между рукоятью и неподвижным роликом. */
export function cablePixel(spec: LayerSpec, x: number, y: number): boolean {
  if (!spec.cable) return false;
  if (spec.mode === 'free') return Math.abs(x - 768) < 25 && y < (spec.grip[1] - 80);
  const [gx, gy] = spec.grip, [cx, cy] = spec.cable;
  if (x < gx + 140 || x > cx - 20) return false;
  const lineY = gy + (cy - gy) * (x - gx) / (cx - gx);
  return Math.abs(y - lineY) < 100;
}
