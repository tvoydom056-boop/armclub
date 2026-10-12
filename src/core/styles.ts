import type { PlayerStats } from './upgrades';

/** Боевой принцип: один слот перед боем, бесплатный и без уровней. Плюс всегда оплачен минусом. */
export type StyleId = 'neutral' | 'economy' | 'burst' | 'swift';

export interface StyleDef {
  id: StyleId;
  name: string;
  plus: string;
  minus: string;
}

export const STYLES: readonly StyleDef[] = [
  { id: 'neutral', name: 'Нейтральный', plus: 'без изменений', minus: 'без изменений' },
  { id: 'economy', name: 'Экономия', plus: 'клики тратят на 30% меньше выносливости', minus: 'пассивный хват на 15% слабее' },
  { id: 'burst', name: 'Напор', plus: 'первые 8 секунд сила на 10% больше', minus: 'выносливость восстанавливается на 30% медленнее' },
  { id: 'swift', name: 'Быстрая перестройка', plus: 'смена техники вдвое быстрее, контра на 60% сильнее', minus: 'пассивный хват на 15% слабее' },
];

export const DEFAULT_STYLE: StyleId = 'neutral';

export const isStyleId = (id: unknown): id is StyleId => STYLES.some((s) => s.id === id);

export const STYLE_TUNING = {
  economy: { cost: 0.7, grip: 0.85 },
  burst: { opening: 1.1, openingTime: 8, regen: 0.7 },
  swift: { switch: 0.5, counter: 1.6, grip: 0.85 },
} as const;

/** Возвращает новые характеристики; исходные не меняются. */
export function applyStyle(stats: PlayerStats, id: StyleId): PlayerStats {
  const t = STYLE_TUNING;
  switch (id) {
    case 'economy':
      return {
        ...stats,
        costMult: { hook: stats.costMult.hook * t.economy.cost, toproll: stats.costMult.toproll * t.economy.cost, press: stats.costMult.press * t.economy.cost },
        grip: stats.grip * t.economy.grip,
      };
    case 'burst':
      return { ...stats, openingBoost: t.burst.opening, openingTime: t.burst.openingTime, regen: stats.regen * t.burst.regen };
    case 'swift':
      return { ...stats, switchMult: stats.switchMult * t.swift.switch, counterMult: stats.counterMult * t.swift.counter, grip: stats.grip * t.swift.grip };
    default:
      return stats;
  }
}
