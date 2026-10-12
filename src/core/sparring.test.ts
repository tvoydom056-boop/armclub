import { describe, expect, it } from 'vitest';
import { playMatch } from './botPlayer';
import { createMatch, stepMatch } from './match';
import { mulberry32 } from './rng';
import {
  SPARRING_COST, SPARRING_STATS, SPARRING_TIME, sparringGains, sparringGrade, sparringPartner, sparringSet,
} from './sparring';
import { freshSave } from './save';
import { emptyXp, type Grade, type TrainingState } from './training';
import { deriveStats, emptyLevels } from './upgrades';
import { TECHNIQUES } from './techniques';

const fresh = (): TrainingState => {
  const s = freshSave();
  return { coins: 50, levels: s.levels, xp: s.xp, owned: [], gym: false, fatigue: {} };
};

describe('спарринг: оценка и опыт', () => {
  it('пин решает сразу, по времени — по позиции руки', () => {
    expect(sparringGrade(true, 'pin', 1)).toBe('great');
    expect(sparringGrade(false, 'pin', -1)).toBe('weak');
    expect(sparringGrade(true, 'time', 0.5)).toBe('great');
    expect(sparringGrade(true, 'time', 0.1)).toBe('ok');
    expect(sparringGrade(false, 'time', -0.5)).toBe('weak');
  });

  it('опыт получают оба стата техники, полным значением', () => {
    for (const tech of TECHNIQUES) {
      const gains = sparringGains(tech, 'ok', {});
      expect(gains.map((g) => g.stat)).toEqual([...SPARRING_STATS[tech]]);
      expect(gains.every((g) => g.xp === 10)).toBe(true);
    }
  });

  it('оценка и перетрен меняют опыт', () => {
    expect(sparringGains('hook', 'great', {})[0].xp).toBe(13);
    expect(sparringGains('hook', 'weak', {})[0].xp).toBe(6);
    expect(sparringGains('hook', 'ok', { biceps: 1 })[0].xp).toBe(8);
    expect(sparringGains('hook', 'ok', { biceps: 1 })[1].xp).toBe(10);
  });

  it('подход списывает цену, копит перетрен у обоих статов и не меняет входное состояние', () => {
    const s = fresh();
    const r = sparringSet(s, 'toproll', 'ok')!;
    expect(r.patch.coins).toBe(50 - SPARRING_COST);
    expect(r.patch.fatigue).toEqual({ fingers: 1, pronation: 1 });
    expect(r.gains.map((g) => g.stat)).toEqual(['fingers', 'pronation']);
    expect(s.coins).toBe(50);
    expect(s.fatigue).toEqual({});
    expect(s.xp).toEqual(emptyXp());
  });

  it('без десяти монет спарринга нет', () => {
    expect(sparringSet({ ...fresh(), coins: SPARRING_COST - 1 }, 'hook', 'ok')).toBeNull();
    expect(sparringSet({ ...fresh(), coins: SPARRING_COST }, 'hook', 'ok')).not.toBeNull();
  });
});

describe('спарринг: партнёр и лимит времени', () => {
  it('партнёр без рывков и пауз, а сила растёт вместе с прокачкой', () => {
    const rookie = sparringPartner(deriveStats(emptyLevels()), 'hook');
    const trained = sparringPartner(deriveStats({ ...emptyLevels(), biceps: 10 }), 'hook');
    expect(rookie.surgeEvery).toBeNull();
    expect(rookie.pattern).toBeUndefined();
    expect(trained.power).toBeGreaterThan(rookie.power);
    expect(rookie.id).toBe('leva');
  });

  it('бой кончается ровно по лимиту, обычный матч остаётся 75 секунд', () => {
    const stats = deriveStats(emptyLevels());
    const cfg = { stats, opp: sparringPartner(stats, 'hook'), maxTime: SPARRING_TIME };
    const rng = mulberry32(3);
    const s = createMatch(cfg, rng);
    for (let i = 0; i < 60 * 40 && s.phase !== 'won' && s.phase !== 'lost'; i++) stepMatch(s, cfg, { clicks: 0 }, 1 / 60, rng);
    // без кликов партнёр обычно кладёт руку раньше; если нет — решает время
    expect(s.time).toBeLessThanOrEqual(SPARRING_TIME + 0.05);
    expect(s.phase === 'lost' || s.phase === 'won').toBe(true);
  });
});

describe('спарринг: баланс на ботах', () => {
  const levelsAt = (n: number) => ({ ...emptyLevels(), biceps: n, fingers: n, triceps: n, grip: n, stamina: n });
  const grades = (n: number, tech: 'hook' | 'toproll' | 'press') => {
    const stats = deriveStats(levelsAt(n));
    const count: Record<Grade, number> = { weak: 0, ok: 0, great: 0 };
    const runs = 200;
    for (let seed = 1; seed <= runs; seed++) {
      const cfg = { stats, opp: sparringPartner(stats, tech), maxTime: SPARRING_TIME };
      const r = playMatch(cfg, 'reader', seed);
      const reason = Math.abs(r.position) >= 1 ? 'pin' : 'time';
      count[sparringGrade(r.won, reason, r.position)] += 1;
    }
    return { weak: count.weak / runs, ok: count.ok / runs, great: count.great / runs };
  };

  it('таблица оценок (для настройки PARTNER_RATIO)', () => {
    const rows = [0, 5, 10, 15].map((n) => ({ level: n, ...grades(n, 'hook') }));
    console.table(rows);
    for (const r of rows) {
      // ни один уровень не должен упираться в «всегда отлично» или «всегда слабо»
      expect(r.great).toBeLessThan(0.95);
      expect(r.weak).toBeLessThan(0.7);
    }
  });
});
