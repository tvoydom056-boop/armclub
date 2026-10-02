import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsStore {
  muted: boolean;
  /** 0..1 */
  volume: number;
  toggleMute: () => void;
  setVolume: (v: number) => void;
}

/** Настройки звука. Отдельно от сохранения игры, чтобы сброс прогресса их не трогал. */
export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      muted: false,
      volume: 0.7,
      toggleMute: () => set((s) => ({ muted: !s.muted })),
      setVolume: (v) => set({ volume: Math.max(0, Math.min(1, v)), muted: false }),
    }),
    { name: 'armwrestling-club-settings', version: 1 },
  ),
);
