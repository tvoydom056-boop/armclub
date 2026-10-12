import { create } from 'zustand';
import { emptyMatchMetrics, type MatchMetrics, type MatchPhase } from '../core/match';
import type { Technique } from '../core/techniques';

/** Снимок матча для React-интерфейса. Обновляется сценой ~12 раз в секунду. */
interface HudState {
  ready: boolean;
  active: boolean;
  phase: MatchPhase;
  position: number;
  stamina: number;
  oppStamina: number;
  tech: Technique;
  oppTech: Technique;
  oppNext: Technique | null;
  /** +1 — твоя техника бьёт его, −1 — его бьёт твою, 0 — ничья. */
  matchup: -1 | 0 | 1;
  switching: boolean;
  warnings: number;
  surgeWarn: boolean;
  surging: boolean;
  resting: boolean;
  time: number;
  pressGate: number;
  metrics: MatchMetrics;
  oppName: string;
  oppNick: string;
}

export const useHud = create<HudState>(() => ({
  ready: false,
  active: false,
  phase: 'ready',
  position: 0,
  stamina: 1,
  oppStamina: 1,
  tech: 'hook',
  oppTech: 'hook',
  oppNext: null,
  matchup: 0,
  switching: false,
  warnings: 0,
  surgeWarn: false,
  surging: false,
  resting: false,
  time: 0,
  pressGate: 0.15,
  metrics: emptyMatchMetrics(),
  oppName: '',
  oppNick: '',
}));
