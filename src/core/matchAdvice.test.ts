import { describe, expect, it } from 'vitest';
import { createMatch, emptyMatchMetrics, stepMatch, type MatchConfig } from './match';
import { matchAdvice } from './matchAdvice';
import { opponentById } from './opponents';
import { mulberry32 } from './rng';
import { deriveStats, emptyLevels } from './upgrades';

describe('наблюдения за матчем', () => {
  const cfg: MatchConfig = { stats: deriveStats(emptyLevels()), opp: opponentById('boris', 2) };

  it('до старта и после фола метрики не копятся; новый бой начинает с нуля', () => {
    const rng = mulberry32(1), s = createMatch(cfg, rng);
    stepMatch(s, cfg, { clicks: 1 }, .1, rng);
    stepMatch(s, cfg, { clicks: 1 }, .1, rng);
    stepMatch(s, cfg, { clicks: 0 }, 1, rng);
    expect(s.endReason).toBe('foul');
    expect(s.metrics).toEqual(emptyMatchMetrics());
    s.metrics.lowStaminaSeconds = 5;
    expect(createMatch(cfg, rng).metrics).toEqual(emptyMatchMetrics());
  });

  it('разбор различает слабый и сильный пресс и считает только фактическое восстановление', () => {
    const rng = mulberry32(1), s = createMatch(cfg, rng);
    s.phase = 'fight'; s.tech = 'press'; s.opp.tech = 'hook';
    s.opp.decisionLeft = 10; s.stamina = .1; s.sinceClick = 0;
    stepMatch(s, cfg, { clicks: 0 }, .1, rng);
    expect(s.metrics.weakPressSeconds).toBeCloseTo(.1);
    expect(s.metrics.lowStaminaSeconds).toBeCloseTo(.1);
    expect(s.metrics.counteredSeconds).toBeCloseTo(.1);
    expect(s.metrics.recoveredStamina).toBe(0);
    s.position = cfg.stats.pressGate + .1; s.sinceClick = 1;
    const before = s.stamina;
    stepMatch(s, cfg, { clicks: 0 }, .1, rng);
    expect(s.metrics.strongPressSeconds).toBeCloseTo(.1);
    expect(s.metrics.recoveredStamina).toBeCloseTo(s.stamina - before);
    const recovered = s.metrics.recoveredStamina;
    s.stamina = 1;
    stepMatch(s, cfg, { clicks: 0 }, .1, rng);
    expect(s.metrics.recoveredStamina).toBe(recovered);
  });

  it('без метрик не придумывает ошибки; фол и таймер объясняет независимо от них', () => {
    expect(matchAdvice('pin', null)).toEqual([]);
    expect(matchAdvice('pin', emptyMatchMetrics())).toEqual([]);
    expect(matchAdvice('foul', null).map((a) => a.id)).toEqual(['foul']);
    expect(matchAdvice('time', null).map((a) => a.id)).toEqual(['time']);
  });

  it('считает паузу соперника и говорит, использовал ли её игрок', () => {
    const rng = mulberry32(1), s = createMatch(cfg, rng);
    s.phase = 'fight'; s.opp.decisionLeft = 10; s.opp.surgeCooldown = Infinity;
    s.opp.restLeft = 5; s.opp.stamina = 1;
    stepMatch(s, cfg, { clicks: 1 }, .1, rng);
    expect(s.metrics.oppRestSeconds).toBeCloseTo(.1);
    expect(s.metrics.oppRestPressedSeconds).toBeCloseTo(.1);
    stepMatch(s, cfg, { clicks: 0 }, 1, rng);
    expect(s.metrics.oppRestSeconds).toBeCloseTo(1.1);
    expect(s.metrics.oppRestPressedSeconds).toBeCloseTo(.1);

    const missed = { ...emptyMatchMetrics(), oppRestSeconds: 3, oppRestPressedSeconds: .5 };
    expect(matchAdvice('pin', missed).map((a) => a.id)).toEqual(['rest']);
    const used = { ...emptyMatchMetrics(), oppRestSeconds: 2, oppRestPressedSeconds: 1.8 };
    expect(matchAdvice('pin', used).map((a) => a.id)).toEqual(['good-rest']);
    expect(matchAdvice('pin', { ...emptyMatchMetrics(), oppRestSeconds: .5 })).toEqual([]);
  });

  it('показывает не больше двух наблюдений и отдаёт приоритет длительным проблемам', () => {
    const metrics = { ...emptyMatchMetrics(), lowStaminaSeconds: 5, weakPressSeconds: 3, counteredSeconds: .5, switchingSeconds: 2 };
    expect(matchAdvice('pin', metrics).map((a) => a.id)).toEqual(['stamina', 'press']);
    expect(matchAdvice('time', metrics).map((a) => a.id)).toEqual(['time', 'stamina']);
    expect(matchAdvice('foul', metrics).map((a) => a.id)).toEqual(['foul']);
  });
});
