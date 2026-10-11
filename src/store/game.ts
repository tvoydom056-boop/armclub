import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rewardFor, type EndReason } from '../core/match';
import { OPPONENTS, opponentById, type OpponentDef } from '../core/opponents';
import { SAVE_VERSION, freshSave, migrateSave, type SaveData } from '../core/save';
import { buyGym, buyItem, trainSet, type Grade, type ItemId, type SetResult, type TrainingPatch, type TrainingState } from '../core/training';
import { upgradeById, upgradeCost, type UpgradeId } from '../core/upgrades';

type Screen = 'hub' | 'match';
type Tab = 'fights' | 'shop';

interface MatchResult {
  oppId: string;
  won: boolean;
  reason: EndReason;
  time: number;
  reward: number;
  firstWin: boolean;
}

interface GameStore extends SaveData {
  screen: Screen;
  tab: Tab;
  /** Версия состава соперников (ROSTERS): 1 — вся карьера, 2 — Боря, Лева, Дэнч, Виталик. Не сохраняется. */
  version: 1 | 2;
  oppId: string | null;
  result: MatchResult | null;
  setVersion: (version: 1 | 2) => void;
  startMatch: (oppId: string) => void;
  finishMatch: (r: { oppId: string; result: 'won' | 'lost'; reason: EndReason; time: number }) => void;
  /** Старая покупка уровня за монеты: уходит вместе со старой витриной (этап T3). */
  buy: (id: UpgradeId) => boolean;
  buyItem: (id: ItemId) => boolean;
  buyGym: () => boolean;
  train: (exerciseId: string, grade: Grade) => SetResult | null;
  setTab: (tab: Tab) => void;
  toHub: (tab?: Tab) => void;
  resetSave: () => void;
}

export const useGame = create<GameStore>()(
  persist(
    (set, get) => {
      /** Применяет изменение, если оно возможно. */
      const apply = (patch: TrainingPatch): boolean => {
        if (!patch) return false;
        set(patch);
        return true;
      };
      return {
        ...freshSave(),
        screen: 'hub',
        tab: 'fights',
        version: 1,
        oppId: null,
        result: null,

        setVersion: (version) => set({ version }),

        startMatch: (oppId) => set({ screen: 'match', oppId, result: null }),

        finishMatch: ({ oppId, result, reason, time }) => {
          const won = result === 'won';
          const opp = opponentById(oppId);
          const reward = rewardFor(opp, won, time);
          const prevWins = get().wins[oppId] ?? 0;
          set((s) => ({
            coins: s.coins + reward,
            wins: won ? { ...s.wins, [oppId]: prevWins + 1 } : s.wins,
            losses: won ? s.losses : s.losses + 1,
            // бой — отдых для мышц: перетрен сбрасывается
            fatigue: {},
            result: { oppId, won, reason, time, reward, firstWin: won && prevWins === 0 },
          }));
        },

        buy: (id) => {
          const s = get();
          const def = upgradeById(id);
          const level = s.levels[id];
          if (level >= def.maxLevel) return false;
          const cost = upgradeCost(def, level);
          if (s.coins < cost) return false;
          set({ coins: s.coins - cost, levels: { ...s.levels, [id]: level + 1 } });
          return true;
        },

        buyItem: (id) => apply(buyItem(get(), id)),
        buyGym: () => apply(buyGym(get())),
        train: (exerciseId, grade) => {
          const r = trainSet(get(), exerciseId, grade);
          if (r) set(r.patch);
          return r;
        },

        setTab: (tab) => set({ tab }),
        toHub: (tab) => set((s) => ({ screen: 'hub', result: null, tab: tab ?? s.tab })),
        resetSave: () => set({ ...freshSave(), screen: 'hub', tab: 'fights', oppId: null, result: null }),
      };
    },
    {
      name: 'armwrestling-club-save',
      version: SAVE_VERSION,
      partialize: (s): SaveData => {
        const t: TrainingState = { coins: s.coins, levels: s.levels, xp: s.xp, owned: s.owned, gym: s.gym, fatigue: s.fatigue };
        return { ...t, wins: s.wins, losses: s.losses };
      },
      // Вся миграция в merge (migrateSave), здесь только пропускаем старые версии дальше.
      migrate: (persisted) => persisted as SaveData,
      merge: (persisted, current) => ({ ...current, ...migrateSave(persisted) }),
    },
  ),
);

/** Соперник доступен, если побеждён предыдущий в составе. */
export function isUnlocked(oppId: string, wins: Record<string, number>, roster: readonly OpponentDef[] = OPPONENTS): boolean {
  const i = roster.findIndex((o) => o.id === oppId);
  return i <= 0 || (wins[roster[i - 1].id] ?? 0) > 0;
}
