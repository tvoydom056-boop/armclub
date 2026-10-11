import { emptyXp, ITEMS, type ItemId, type TrainingState } from './training';
import { emptyLevels } from './upgrades';

export interface SaveData extends TrainingState {
  wins: Record<string, number>;
  losses: number;
}

/** Версия схемы сохранения. 2 — тренировки: опыт, снаряды, клубная карта. */
export const SAVE_VERSION = 2;

export const freshSave = (): SaveData => ({
  coins: 0,
  levels: emptyLevels(),
  xp: emptyXp(),
  owned: [],
  gym: false,
  fatigue: {},
  wins: {},
  losses: 0,
});

const ITEM_IDS = new Set<string>(ITEMS.map((i) => i.id));

/** Сохранение любой прошлой версии → текущая схема. Недостающее берётся из нового сохранения, купленные уровни не теряются. */
export function migrateSave(persisted: unknown): SaveData {
  const p = (persisted ?? {}) as Partial<SaveData>;
  const fresh = freshSave();
  // Йос занимает прежнее место Вити: победы продолжают открывать третьего бойца.
  const wins = { ...(p.wins ?? {}) };
  if (wins.vitya !== undefined) {
    wins.yos = (wins.yos ?? 0) + wins.vitya;
    delete wins.vitya;
  }
  return {
    coins: p.coins ?? fresh.coins,
    levels: { ...fresh.levels, ...(p.levels ?? {}) },
    xp: { ...fresh.xp, ...(p.xp ?? {}) },
    owned: (p.owned ?? []).filter((id): id is ItemId => ITEM_IDS.has(id)),
    gym: p.gym ?? fresh.gym,
    fatigue: p.fatigue ?? fresh.fatigue,
    wins,
    losses: p.losses ?? fresh.losses,
  };
}
