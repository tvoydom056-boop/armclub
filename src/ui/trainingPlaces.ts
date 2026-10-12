import { EXERCISES, canDo, freshness, type Fatigue, type ItemId, type PlaceId } from '../core/training';
import type { UpgradeId } from '../core/upgrades';

/** Проверяется каждый задействованный стат, включая побочный. Вход остаётся свободным. */
export function placeIsTired(place: PlaceId, owned: readonly ItemId[], gym: boolean, fatigue: Fatigue): boolean {
  const available = EXERCISES.filter((e) => e.place === place && canDo(e, owned, gym));
  return available.length > 0 && available.every((e) =>
    [e.primary, e.secondary].every((stat) => !stat || freshness(fatigue[stat] ?? 0) <= 0.55));
}

export const sceneFreshness = (primary: UpgradeId, secondary: UpgradeId | undefined, fatigue: Fatigue): number =>
  Math.min(...[primary, secondary].filter((s): s is keyof Fatigue => !!s).map((s) => freshness(fatigue[s] ?? 0)));

/** Точки сверены с готовыми фонами; координаты — доли 1536×1024. */
export const STATIONS = {
  home: [
    { id: 'pushups', x: .12, y: .72 }, { id: 'gripper', x: .32, y: .28 },
    { id: 'gripper_pro', x: .44, y: .28 }, { id: 'strap_dumbbell', x: .54, y: .59 },
    { id: 'medball', x: .71, y: .46 }, { id: 'jump_rope', x: .84, y: .33 },
    { id: 'run', x: .93, y: .67 },
  ],
  gym: [
    { id: 'straight_bar', x: .16, y: .36 }, { id: 'tricep_rope', x: .34, y: .35 },
    { id: 'dips', x: .47, y: .6 }, { id: 'table', x: .81, y: .54 },
  ],
} as const;
export const TABLE_IDS = ['strap_block', 'fat_grip', 'roller', 'cone', 'eccentric', 'triple', 'multispin'] as const;
