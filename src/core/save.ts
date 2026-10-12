import { emptyXp, ITEMS, type ItemId, type TrainingState } from './training';
import { emptyLevels } from './upgrades';
import { LEAGUES, isLeagueOpen, isQualified, leagueById, type LeagueProgress } from './leagues';

export interface SaveData extends TrainingState, LeagueProgress {
  wins: Record<string, number>;
  losses: number;
}

/** 3 — лиги, кубки и завершённые этапы текущего турнира. */
export const SAVE_VERSION = 3;

export const freshSave = (): SaveData => ({
  coins: 0,
  levels: emptyLevels(),
  xp: emptyXp(),
  owned: [],
  gym: false,
  fatigue: {},
  wins: {},
  losses: 0,
  cups: [],
  tournament: null,
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
  // Старый прогресс сохраняет доступ к уже достигнутым лигам; новые обычные победы кубков не дают.
  const legacy = p.cups === undefined;
  const cups = LEAGUES.filter((_, index) =>
    legacy
      ? LEAGUES.slice(index + 1).some((next) => next.opponents.some((id) => (wins[id] ?? 0) > 0))
      : Array.isArray(p.cups) && LEAGUES.slice(0, index + 1).every((previous) => p.cups!.includes(previous.id)),
  ).map((league) => league.id);
  const run = p.tournament;
  const league = run && leagueById(run.leagueId);
  const tournament = run && league && isLeagueOpen(league.id, cups) && !cups.includes(league.id)
    && isQualified(league, wins) && Number.isInteger(run.completed) && run.completed >= 0 && run.completed < league.opponents.length
    ? { leagueId: league.id, completed: run.completed } : null;
  return {
    coins: p.coins ?? fresh.coins,
    levels: { ...fresh.levels, ...(p.levels ?? {}) },
    xp: { ...fresh.xp, ...(p.xp ?? {}) },
    owned: (p.owned ?? []).filter((id): id is ItemId => ITEM_IDS.has(id)),
    gym: p.gym ?? fresh.gym,
    fatigue: p.fatigue ?? fresh.fatigue,
    wins,
    losses: p.losses ?? fresh.losses,
    cups,
    tournament,
  };
}
