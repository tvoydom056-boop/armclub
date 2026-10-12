import type { Technique } from './techniques';

export type UpgradeId =
  | 'biceps'
  | 'wrist'
  | 'fingers'
  | 'pronation'
  | 'triceps'
  | 'shoulder'
  | 'grip'
  | 'stamina'
  | 'explosive';

export type UpgradeCategory = Technique | 'body';

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  category: UpgradeCategory;
  icon: string;
  desc: string;
  baseCost: number;
  growth: number;
  maxLevel: number;
  /** Текст эффекта на данном уровне. */
  effect: (level: number) => string;
}

export const CATEGORY_INFO: Record<UpgradeCategory, { name: string; icon: string; color: string }> = {
  hook: { name: 'Крюк', icon: '🪝', color: '#ff7a1a' },
  toproll: { name: 'Топролл', icon: '🌀', color: '#2fa8ff' },
  press: { name: 'Пресс', icon: '🔨', color: '#e8344a' },
  body: { name: 'Тело', icon: '🏋️', color: '#7bd34a' },
};

const pct = (v: number) => `${Math.round(v * 100)}%`;

export const UPGRADES: readonly UpgradeDef[] = [
  { id: 'biceps', name: 'Бицепс', category: 'hook', icon: '💪', baseCost: 20, growth: 1.15, maxLevel: 25,
    desc: 'Тренируем бицепс — крюк давит сильнее.', effect: (l) => `+${pct(0.15 * l)} к силе крюка` },
  { id: 'wrist', name: 'Запястье', category: 'hook', icon: '🤜', baseCost: 30, growth: 1.17, maxLevel: 10,
    desc: 'Крепкое запястье: когда крюк контрят, он теряет меньше силы.', effect: (l) => `штраф от контры −${pct(WRIST_STEP * l)}` },
  { id: 'fingers', name: 'Пальцы', category: 'toproll', icon: '🖐️', baseCost: 25, growth: 1.15, maxLevel: 25,
    desc: 'Цепкие пальцы раскрывают кисть соперника — топролл сильнее.', effect: (l) => `+${pct(0.15 * l)} к силе топролла` },
  { id: 'pronation', name: 'Пронация', category: 'toproll', icon: '🌀', baseCost: 30, growth: 1.17, maxLevel: 10,
    desc: 'Рычаг вместо силы: топролл меньше выматывает.', effect: (l) => `−${pct(1 - 0.94 ** l)} расхода выносливости` },
  { id: 'triceps', name: 'Трицепс', category: 'press', icon: '🦾', baseCost: 25, growth: 1.15, maxLevel: 25,
    desc: 'Мощный трицепс — пресс добивает сильнее.', effect: (l) => `+${pct(0.15 * l)} к силе пресса` },
  { id: 'shoulder', name: 'Плечо', category: 'press', icon: '🏔️', baseCost: 40, growth: 1.2, maxLevel: 10,
    desc: 'Плечо позволяет давить прессом, даже когда ты ещё не впереди.', effect: (l) => `порог пресса −${(0.02 * l).toFixed(2)}` },
  { id: 'grip', name: 'Хват', category: 'body', icon: '✊', baseCost: 35, growth: 1.16, maxLevel: 25,
    desc: 'Пассивная сила: давит даже между кликами.', effect: (l) => `+${(0.1 * l).toFixed(1)} постоянной силы` },
  { id: 'stamina', name: 'Выносливость', category: 'body', icon: '🫁', baseCost: 30, growth: 1.16, maxLevel: 25,
    desc: 'Быстрее отдыхаешь и меньше тратишь на каждый клик.', effect: (l) => `+${pct(0.1 * l)} к восстановлению, −${pct(1 - 0.97 ** l)} к расходу` },
  { id: 'explosive', name: 'Взрывной старт', category: 'body', icon: '⚡', baseCost: 45, growth: 1.18, maxLevel: 15,
    desc: 'Кликни сразу после «ГО!» — получишь рывок на старте.', effect: (l) => `рывок на старте +${pct(0.25 * l)}` },
];

export type Levels = Record<UpgradeId, number>;

export const emptyLevels = (): Levels => ({
  biceps: 0, wrist: 0, fingers: 0, pronation: 0, triceps: 0, shoulder: 0, grip: 0, stamina: 0, explosive: 0,
});

export const upgradeById = (id: UpgradeId): UpgradeDef => UPGRADES.find((u) => u.id === id)!;

export function upgradeCost(def: UpgradeDef, level: number): number {
  return Math.ceil(def.baseCost * def.growth ** level);
}

/** Базовый штраф, когда твою технику контрят. */
const BASE_DISADVANTAGE = 0.35;
/** Ниже этого штрафа запястье не опускает. */
const WRIST_FLOOR = 0.12;
/** Шаг подобран так, что 10-й уровень доводит штраф ровно до пола — ни один уровень не пропадает зря. */
const WRIST_STEP = (BASE_DISADVANTAGE - WRIST_FLOOR) / 10;
/** Выше этой позиции пресс получает бонус, ниже — штраф. */
const BASE_PRESS_GATE = 0.15;

export interface PlayerStats {
  power: Record<Technique, number>;
  disadvantage: Record<Technique, number>;
  costMult: Record<Technique, number>;
  pressGate: number;
  grip: number;
  regen: number;
  explosive: number;
  /** Множитель длительности штрафа смены техники. */
  switchMult: number;
  /** Множитель бонуса за контртехнику. */
  counterMult: number;
  /** Множитель силы в первые `openingTime` секунд боя. */
  openingBoost: number;
  openingTime: number;
}

export function deriveStats(l: Levels): PlayerStats {
  const bodyCost = 0.97 ** l.stamina;
  return {
    power: { hook: 1 + 0.15 * l.biceps, toproll: 1 + 0.15 * l.fingers, press: 1 + 0.15 * l.triceps },
    disadvantage: {
      hook: Math.max(WRIST_FLOOR, BASE_DISADVANTAGE - WRIST_STEP * l.wrist),
      toproll: BASE_DISADVANTAGE,
      press: BASE_DISADVANTAGE,
    },
    costMult: { hook: bodyCost, toproll: bodyCost * 0.94 ** l.pronation, press: bodyCost },
    pressGate: BASE_PRESS_GATE - 0.02 * l.shoulder,
    grip: 0.2 + 0.1 * l.grip,
    regen: 1 + 0.1 * l.stamina,
    explosive: 1 + 0.25 * l.explosive,
    switchMult: 1,
    counterMult: 1,
    openingBoost: 1,
    openingTime: 0,
  };
}
