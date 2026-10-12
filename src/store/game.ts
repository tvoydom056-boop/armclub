import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StyleId } from '../core/styles';
import { rewardFor, type EndReason, type MatchMetrics } from '../core/match';
import { OPPONENTS, ROSTERS, opponentById, type OpponentDef } from '../core/opponents';
import { enterTournament, finishTournamentBout, isLeagueOpponentOpen, tournamentOpponent, type LeagueId, type TournamentOutcome } from '../core/leagues';
import { SAVE_VERSION, freshSave, migrateSave, type SaveData } from '../core/save';
import { buyGym, buyItem, trainSet, type Grade, type ItemId, type SetResult, type TrainingPatch, type TrainingState } from '../core/training';

type Screen = 'hub' | 'match';
type Tab = 'fights' | 'shop';

interface MatchResult {
  oppId: string;
  won: boolean;
  reason: EndReason;
  time: number;
  reward: number;
  firstWin: boolean;
  metrics: MatchMetrics | null;
  tournament: Pick<TournamentOutcome, 'status' | 'leagueId' | 'bonus'> | null;
}

interface GameStore extends SaveData {
  screen: Screen;
  tab: Tab;
  /** Версия 2 — текущая карьера с лигами. Не сохраняется. */
  version: 1 | 2;
  oppId: string | null;
  result: MatchResult | null;
  setVersion: (version: 1 | 2) => void;
  setStyle: (style: StyleId) => void;
  startMatch: (oppId: string) => boolean;
  startTournament: (leagueId: LeagueId) => boolean;
  abandonTournament: () => void;
  finishMatch: (r: { oppId: string; result: 'won' | 'lost'; reason: EndReason; time: number; metrics?: MatchMetrics }) => void;
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
        version: 2,
        oppId: null,
        result: null,

        setVersion: (version) => set({ version, tournament: null }),
        setStyle: (style) => { if (get().screen === 'hub') set({ style }); },

        startMatch: (oppId) => {
          const s = get();
          if (s.screen === 'match' && !s.result) return false;
          if (!ROSTERS[s.version].some((opp) => opp.id === oppId)) return false;
          const allowed = s.version === 2
            ? s.tournament ? tournamentOpponent(s.tournament) === oppId : isLeagueOpponentOpen(oppId, s.wins, s.cups)
            : isUnlocked(oppId, s.wins);
          if (!allowed) return false;
          set({ screen: 'match', oppId, result: null });
          return true;
        },

        startTournament: (leagueId) => {
          const s = get();
          if (s.version !== 2 || s.screen !== 'hub') return false;
          const tournament = enterTournament(leagueId, s.wins, s);
          if (!tournament) return false;
          set({ tournament });
          return true;
        },

        abandonTournament: () => set({ tournament: null }),

        finishMatch: ({ oppId, result, reason, time, metrics }) => {
          const current = get();
          if (current.screen !== 'match' || current.oppId !== oppId || current.result) return;
          const won = result === 'won';
          const opp = opponentById(oppId, current.version);
          const tournament = current.version === 2 ? finishTournamentBout(current, oppId, won) : null;
          const reward = rewardFor(opp, won, time, reason) + (tournament?.bonus ?? 0);
          const prevWins = get().wins[oppId] ?? 0;
          set((s) => ({
            coins: s.coins + reward,
            wins: won ? { ...s.wins, [oppId]: prevWins + 1 } : s.wins,
            losses: won ? s.losses : s.losses + 1,
            // Фальстарт не заменяет бой и не снимает накопленный перетрен.
            fatigue: reason === 'foul' ? s.fatigue : {},
            cups: tournament?.cups ?? s.cups,
            tournament: tournament ? tournament.tournament : s.tournament,
            result: { oppId, won, reason, time, reward, firstWin: won && prevWins === 0, metrics: metrics ? { ...metrics } : null,
              tournament: tournament ? { status: tournament.status, leagueId: tournament.leagueId, bonus: tournament.bonus } : null },
          }));
        },

        buyItem: (id) => !get().tournament && apply(buyItem(get(), id)),
        buyGym: () => !get().tournament && apply(buyGym(get())),
        train: (exerciseId, grade) => {
          if (get().tournament) return null;
          const r = trainSet(get(), exerciseId, grade);
          if (r) set(r.patch);
          return r;
        },

        setTab: (tab) => { if (tab !== 'shop' || !get().tournament) set({ tab }); },
        toHub: (tab) => set((s) => ({ screen: 'hub', oppId: null, result: null, tab: tab ?? s.tab, tournament: null })),
        resetSave: () => set({ ...freshSave(), screen: 'hub', tab: 'fights', oppId: null, result: null }),
      };
    },
    {
      name: 'armwrestling-club-save',
      version: SAVE_VERSION,
      partialize: (s): SaveData => {
        const t: TrainingState = { coins: s.coins, levels: s.levels, xp: s.xp, owned: s.owned, gym: s.gym, fatigue: s.fatigue };
        return { ...t, wins: s.wins, losses: s.losses, style: s.style, cups: s.cups, tournament: s.tournament };
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
  return i >= 0 && (i === 0 || (wins[roster[i - 1].id] ?? 0) > 0);
}
