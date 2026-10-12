import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsStore {
  muted: boolean;
  /** 0..1 */
  volume: number;
  coachEnabled: boolean;
  setCoachEnabled: (enabled: boolean) => void;
  toggleMute: () => void;
  setVolume: (v: number) => void;
}

/** Звук и подсказки. Сброс прогресса не меняет предпочтения игрока. */
export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      muted: false,
      volume: 0.7,
      coachEnabled: true,
      setCoachEnabled: (coachEnabled) => set({ coachEnabled }),
      // при громкости 0 кнопка показывает «звук выкл.», значит включение должно вернуть громкость
      toggleMute: () => set((s) => (s.muted || s.volume === 0 ? { muted: false, volume: s.volume || 0.7 } : { muted: true })),
      setVolume: (v) => set({ volume: Math.max(0, Math.min(1, v)), muted: false }),
    }),
    { name: 'armwrestling-club-settings', version: 1 },
  ),
);
