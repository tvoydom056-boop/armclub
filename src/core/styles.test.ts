import { describe, expect, it } from 'vitest';
import { TUNING, createMatch, playerForce, stepMatch, type MatchConfig } from './match';
import { opponentById } from './opponents';
import { mulberry32 } from './rng';
import { freshSave, migrateSave } from './save';
import { DEFAULT_STYLE, STYLES, STYLE_TUNING, applyStyle, isStyleId } from './styles';
import { deriveStats, emptyLevels } from './upgrades';

const base = deriveStats({ ...emptyLevels(), biceps: 4, grip: 3, stamina: 2, explosive: 2 });

describe('боевые принципы', () => {
  it('нейтральный не меняет характеристики, остальные не трогают исходные', () => {
    const copy = structuredClone(base);
    expect(applyStyle(base, 'neutral')).toEqual(base);
    for (const { id } of STYLES) applyStyle(base, id);
    expect(base).toEqual(copy);
  });

  it('у каждого принципа есть и плюс, и минус', () => {
    const economy = applyStyle(base, 'economy');
    expect(economy.costMult.hook).toBeCloseTo(base.costMult.hook * STYLE_TUNING.economy.cost);
    expect(economy.costMult.press).toBeLessThan(base.costMult.press);
    expect(economy.grip).toBeLessThan(base.grip);

    const burst = applyStyle(base, 'burst');
    expect(burst.openingBoost).toBeGreaterThan(1);
    expect(burst.openingTime).toBeGreaterThan(0);
    expect(burst.regen).toBeLessThan(base.regen);

    const swift = applyStyle(base, 'swift');
    expect(swift.switchMult).toBeLessThan(base.switchMult);
    expect(swift.counterMult).toBeGreaterThan(base.counterMult);
    expect(swift.grip).toBeLessThan(base.grip);
  });

  it('напор усиливает только начало боя', () => {
    const c: MatchConfig = { stats: applyStyle(base, 'burst'), opp: opponentById('boris', 2) };
    const rng = mulberry32(6), s = createMatch(c, rng);
    s.phase = 'fight'; s.momentum = 1;
    s.time = STYLE_TUNING.burst.openingTime - 0.1;
    const early = playerForce(s, c);
    s.time = STYLE_TUNING.burst.openingTime + 0.1;
    expect(early / playerForce(s, c)).toBeCloseTo(STYLE_TUNING.burst.opening);
  });

  it('быстрая перестройка сокращает штраф смены техники', () => {
    const cfg = (stats: MatchConfig['stats']): MatchConfig => ({ stats, opp: opponentById('boris', 2) });
    const penalty = (c: MatchConfig) => {
      const rng = mulberry32(5), s = createMatch(c, rng);
      s.phase = 'fight';
      stepMatch(s, c, { clicks: 0, tech: 'press' }, 0, rng);
      return s.switchLeft;
    };
    expect(penalty(cfg(base))).toBeCloseTo(TUNING.switchTime);
    expect(penalty(cfg(applyStyle(base, 'swift')))).toBeCloseTo(TUNING.switchTime * STYLE_TUNING.swift.switch);
  });

  it('сохранение: по умолчанию нейтральный, неизвестное значение отбрасывается, выбранное переживает миграцию', () => {
    expect(freshSave().style).toBe(DEFAULT_STYLE);
    expect(migrateSave({ coins: 5 }).style).toBe('neutral');
    expect(migrateSave({ style: 'unknown' }).style).toBe('neutral');
    expect(migrateSave({ style: 'burst' }).style).toBe('burst');
    expect(isStyleId('economy')).toBe(true);
    expect(isStyleId(undefined)).toBe(false);
  });
});
