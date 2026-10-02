import { describe, expect, it } from 'vitest';
import { joinedArmsCenter, PIN_CUSHIONS } from './armMotion';

describe('захват движется к боковым подушкам', () => {
  it('оба финиша находятся у подушек, выше карточек техник', () => {
    for (const [p, pad] of [[1, PIN_CUSHIONS.win], [-1, PIN_CUSHIONS.lose]] as const) {
      const center = joinedArmsCenter(p);
      expect(Math.abs(center.x - pad.x)).toBeLessThan(40);
      expect(center.y).toBeLessThan(pad.y);
      expect(pad.y - center.y).toBeLessThan(60);
      expect(center.y + 65).toBeLessThan(598);
      const neutral = joinedArmsCenter(0);
      expect(Math.abs(center.x - neutral.x)).toBeGreaterThan(Math.abs(center.y - neutral.y) * 2);
    }
  });

  it('проходит всю дугу непрерывно, без смены направления и скачков захвата', () => {
    let previous = joinedArmsCenter(-1);
    for (let i = 1; i <= 2000; i++) {
      const current = joinedArmsCenter(-1 + i / 1000);
      expect(current.x).toBeLessThanOrEqual(previous.x);
      expect(Math.hypot(current.x - previous.x, current.y - previous.y)).toBeLessThan(0.5);
      expect(current.y).toBeLessThanOrEqual(470);
      previous = current;
    }
  });
});
