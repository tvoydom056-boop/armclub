import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { rewardFor, type EndReason } from '../core/match';
import { OPPONENTS, opponentById } from '../core/opponents';
import { emptyLevels, upgradeById, upgradeCost, type Levels, type UpgradeId } from '../core/upgrades';

export type Screen = 'hub' | 'match';
export type Tab = 'fights' | 'shop';

export interface MatchResult {
  oppId: string;
  won: boolean;
  reason: EndReason;
  time: number;
  reward: number;
  firstWin: boolean;
}

interface SaveData {
  coins: number;
  levels: Levels;
  wins: Record<string, number>;
  losses: number;
}

interface GameStore extends SaveData {
  screen: Screen;
  tab: Tab;
  oppId: string | null;
  result: MatchResult | null;
  startMatch: (oppId: string) => void;
  finishMatch: (r: { oppId: string; result: 'won' | 'lost'; reason: EndReason; time: number }) => void;
  buy: (id: UpgradeId) => boolean;
  setTab: (tab: Tab) => void;
  toHub: (tab?: Tab) => void;
  resetSave: () => void;
}

const freshSave = (): SaveData => ({ coins: 0, levels: emptyLevels(), wins: {}, losses: 0 });

export const useGame = create<GameStore>()(
  persist(
    (set, get) => ({
      ...freshSave(),
      screen: 'hub',
      tab: 'fights',
      oppId: null,
      result: null,

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

      setTab: (tab) => set({ tab }),
      toHub: (tab) => set((s) => ({ screen: 'hub', result: null, tab: tab ?? s.tab })),
      resetSave: () => set({ ...freshSave(), screen: 'hub', tab: 'fights', oppId: null, result: null }),
    }),
    {
      name: 'armwrestling-club-save',
      version: 1,
      partialize: (s): SaveData => ({ coins: s.coins, levels: s.levels, wins: s.wins, losses: s.losses }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<SaveData>;
        // Йос занимает прежнее место Вити: победы продолжают открывать третьего бойца.
        const wins = { ...(p.wins ?? {}) };
        if (wins.vitya !== undefined) {
          wins.yos = (wins.yos ?? 0) + wins.vitya;
          delete wins.vitya;
        }
        return { ...current, ...p, wins, levels: { ...emptyLevels(), ...(p.levels ?? {}) } };
      },
    },
  ),
);

/** Соперник доступен, если побеждён предыдущий. */
export function isUnlocked(oppId: string, wins: Record<string, number>): boolean {
  const i = OPPONENTS.findIndex((o) => o.id === oppId);
  return i <= 0 || (wins[OPPONENTS[i - 1].id] ?? 0) > 0;
}
