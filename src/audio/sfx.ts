import type { Technique } from '../core/techniques';
import { crowd, hz, noise, tone } from './engine';

/** Все игровые звуки. Вызывать можно когда угодно: пока контекст не создан, они молчат. */

let lastClick = 0;

export const sfx = {
  /** Нажатие на врага: у каждой техники свой «характер». */
  click(tech: Technique, power: number): void {
    const now = performance.now();
    if (now - lastClick < 45) return; // спам кликов не должен превращаться в кашу
    lastClick = now;
    const r = 0.94 + Math.random() * 0.12 + Math.min(0.12, power * 0.015);
    if (tech === 'hook') {
      tone({ f: 190 * r, to: 95, dur: 0.09, type: 'triangle', vol: 0.3 });
      noise({ dur: 0.04, f: 1800, q: 1.5, vol: 0.1 });
    } else if (tech === 'toproll') {
      noise({ dur: 0.11, f: 1200, to: 3400, q: 2, vol: 0.14 });
      tone({ f: 520 * r, to: 780 * r, dur: 0.07, vol: 0.12 });
    } else {
      tone({ f: 115 * r, to: 52, dur: 0.15, vol: 0.42 });
      noise({ dur: 0.05, type: 'lowpass', f: 700, vol: 0.18 });
    }
  },

  ready(): void {
    tone({ f: 196, to: 188, dur: 0.6, vol: 0.24 });
    tone({ f: 392, dur: 0.35, type: 'triangle', vol: 0.07 });
    noise({ dur: 0.25, type: 'lowpass', f: 400, vol: 0.08 });
  },

  go(): void {
    noise({ dur: 0.3, f: 400, to: 3600, q: 1.2, vol: 0.16 });
    tone({ f: hz(3), dur: 0.12, type: 'square', vol: 0.16 });
    tone({ f: hz(10), dur: 0.4, type: 'square', vol: 0.16, at: 0.1 });
    tone({ f: hz(-9), dur: 0.5, type: 'triangle', vol: 0.2, at: 0.1 });
  },

  startBonus(): void {
    [15, 19, 22, 27].forEach((n, i) => tone({ f: hz(n), dur: 0.14, type: 'triangle', vol: 0.15, at: i * 0.05 }));
  },

  falseStart(foul: boolean): void {
    tone({ f: 150, to: 108, dur: 0.38, type: 'sawtooth', vol: 0.2 });
    if (foul) tone({ f: 100, to: 66, dur: 0.5, type: 'sawtooth', vol: 0.22, at: 0.22 });
  },

  playerSwitch(tech: Technique): void {
    const base = tech === 'hook' ? 330 : tech === 'toproll' ? 440 : 220;
    const up = tech === 'press' ? 0.75 : 1.5;
    tone({ f: base, to: base * up, dur: 0.08, type: 'square', vol: 0.09 });
    tone({ f: base * up, dur: 0.07, type: 'square', vol: 0.07, at: 0.06 });
    noise({ dur: 0.04, f: 2500, q: 2, vol: 0.06 });
  },

  /** Лицо соперника меняется: он готовит смену техники. */
  oppTelegraph(): void {
    tone({ f: 85, to: 140, dur: 0.38, type: 'sawtooth', vol: 0.08 });
    noise({ dur: 0.3, f: 420, q: 1.2, vol: 0.05 });
  },

  oppSwitch(): void {
    noise({ dur: 0.16, f: 900, to: 300, q: 1.2, vol: 0.14 });
    tone({ f: 150, to: 70, dur: 0.13, type: 'triangle', vol: 0.24 });
  },

  surgeWarn(): void {
    [880, 660, 880, 660].forEach((f, i) => tone({ f, dur: 0.13, type: 'square', vol: 0.1, at: i * 0.15 }));
  },

  surge(): void {
    tone({ f: 125, to: 34, dur: 0.65, vol: 0.62 });
    tone({ f: 62, to: 40, dur: 0.5, type: 'sawtooth', vol: 0.12 });
    noise({ dur: 0.7, type: 'lowpass', f: 2200, to: 180, vol: 0.34 });
  },

  /** Тяжёлый выдох: сигнал, что сейчас будет пауза. */
  breatherWarn(): void {
    noise({ dur: 0.5, f: 700, to: 300, q: 0.8, vol: 0.12 });
    tone({ f: 330, to: 220, dur: 0.4, type: 'triangle', vol: 0.12 });
  },

  oppRest(): void {
    noise({ dur: 0.65, f: 1500, to: 400, q: 0.9, vol: 0.14 });
    tone({ f: 880, dur: 0.35, type: 'triangle', vol: 0.13, at: 0.12 });
    tone({ f: 1320, dur: 0.3, type: 'triangle', vol: 0.09, at: 0.2 });
  },

  /** Тяжёлое сердцебиение, когда выносливость на исходе. */
  heartbeat(): void {
    tone({ f: 62, to: 44, dur: 0.13, vol: 0.45 });
    tone({ f: 58, to: 42, dur: 0.12, vol: 0.3, at: 0.17 });
  },

  /** Рука упала на подушку. */
  slam(): void {
    tone({ f: 95, to: 38, dur: 0.32, vol: 0.62 });
    noise({ dur: 0.22, type: 'lowpass', f: 1000, to: 250, vol: 0.34 });
  },

  win(): void {
    [3, 7, 10, 15].forEach((n, i) => {
      tone({ f: hz(n), dur: i === 3 ? 0.6 : 0.14, type: 'square', vol: 0.14, at: 0.3 + i * 0.13 });
      tone({ f: hz(n - 12), dur: i === 3 ? 0.6 : 0.14, type: 'triangle', vol: 0.18, at: 0.3 + i * 0.13 });
    });
    crowd.swell('cheer', 0.3);
  },

  lose(): void {
    [-2, -3, -4, -5].forEach((n, i) => {
      tone({ f: hz(n), to: hz(n) * 0.93, dur: i === 3 ? 0.8 : 0.28, type: 'sawtooth', vol: 0.11, at: 0.3 + i * 0.3 });
    });
    crowd.swell('boo', 0.3);
  },

  ui: {
    click(): void {
      tone({ f: 700, to: 480, dur: 0.045, type: 'triangle', vol: 0.08 });
    },
    start(): void {
      noise({ dur: 0.28, f: 300, to: 2600, q: 1, vol: 0.14 });
      tone({ f: 200, to: 420, dur: 0.22, type: 'triangle', vol: 0.12 });
    },
    buy(): void {
      tone({ f: 988, dur: 0.08, type: 'square', vol: 0.13 });
      tone({ f: 1319, dur: 0.24, type: 'square', vol: 0.12, at: 0.07 });
      noise({ dur: 0.08, type: 'highpass', f: 6000, vol: 0.05, at: 0.07 });
    },
    coins(): void {
      for (let i = 0; i < 7; i++) {
        tone({ f: 1500 + Math.random() * 900, dur: 0.11, type: 'triangle', vol: 0.1, at: 0.9 + i * 0.07 });
      }
    },
  },
};
