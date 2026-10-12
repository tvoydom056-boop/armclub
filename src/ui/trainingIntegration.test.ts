import { describe, expect, it, vi } from 'vitest';
import { mulberry32 } from '../core/rng';
import { freshSave } from '../core/save';
import { EXERCISES, ITEMS, buyGym, buyItem, canDo, exerciseById, trainSet } from '../core/training';
import { GAME_TIME, createTrainingGame, gameGrade, stepTrainingGame } from '../core/trainingGames';
import { completionTicket, consumeInput } from './trainingSession';
import { placeIsTired, sceneFreshness, STATIONS, TABLE_IDS } from './trainingPlaces';

describe('интеграция визуальной тренировки с неизменённым ядром', () => {
  it('все 17 упражнений выбираются станциями или ручками; один ремень открывает обе сцены', () => {
    expect([...[...STATIONS.home, ...STATIONS.gym].map((s) => s.id).filter((id) => id !== 'table'), ...TABLE_IDS].sort()).toEqual(EXERCISES.map((e) => e.id).sort());
    const s = { ...freshSave(), coins: 160 };
    Object.assign(s, buyGym(s)); Object.assign(s, buyItem(s, 'strap'));
    expect(s.coins).toBe(0); expect(s.owned).toEqual(['strap']);
    for (const id of ['strap_block', 'strap_dumbbell']) expect(canDo(exerciseById(id)!, s.owned, s.gym)).toBe(true);
    expect(buyItem(s, 'strap')).toBeNull();
  });

  it('покупки без денег не меняют прогресс, все цены используют ядро', () => {
    const s = freshSave(), before = structuredClone(s);
    for (const item of ITEMS) expect(buyItem(s, item.id)).toBeNull();
    expect(buyGym(s)).toBeNull(); expect(s).toEqual(before);
  });

  it('пар учитывает все доступные статы; тремор берёт побочную усталость', () => {
    expect(placeIsTired('gym', [], false, { triceps: 3, shoulder: 3 })).toBe(false);
    expect(placeIsTired('home', [], false, { triceps: 2, stamina: 2 })).toBe(true);
    expect(placeIsTired('home', ['jump_rope'], false, { triceps: 2, stamina: 2, explosive: 0 })).toBe(false);
    expect(sceneFreshness('stamina', 'explosive', { stamina: 0, explosive: 3 })).toBe(.4);
    expect(sceneFreshness('stamina', 'explosive', { stamina: 3, explosive: 0 })).toBe(.4);
  });

  it('короткий тап и отпускание/нажатие удерживаемой руки не теряются за кадр', () => {
    const rng = mulberry32(1), s = createTrainingGame('squeeze', rng);
    expect(consumeInput(s, ['press', 'release', 'press', 'release'], rng)).toEqual([{ type: 'fail' }]);
    if (s.kind !== 'squeeze') throw Error('squeeze');
    expect(s.holding).toBe(false);
    s.restLeft = 0; s.holding = true; s.power = s.target;
    expect(consumeInput(s, ['release', 'press', 'release'], rng)).toEqual([{ type: 'rep', score: 1 }]);
    expect(s.holding).toBe(false); expect(s.reps).toEqual([0, 1]);
  });

  it('все события spin за кадр доходят до рендера', () => {
    const rng = mulberry32(1), s = createTrainingGame('spin', rng);
    if (s.kind !== 'spin') throw Error('spin');
    s.time = s.beats[0];
    expect(consumeInput(s, ['press', 'release', 'press', 'release'], rng)).toEqual([{ type: 'hit' }, { type: 'miss' }]);
    expect(s.hits).toBe(1); expect(s.extra).toBe(1);
  });

  it('один завершённый подход начисляет опыт и обе усталости ровно один раз; новый билет позволяет повтор', () => {
    const rng = mulberry32(1), s = createTrainingGame('pull', rng);
    const save = { ...freshSave(), gym: true };
    const train = vi.fn((id, grade) => { const r = trainSet(save, id, grade); if (r) Object.assign(save, r.patch); return r; });
    const ticket = completionTicket();
    expect(ticket(s, 'dips', 'ok', train)).toBeNull(); expect(train).not.toHaveBeenCalled();
    consumeInput(s, ['press', 'release'], rng);
    stepTrainingGame(s, { presses: 0, releases: 0 }, 10, rng);
    const r = ticket(s, 'dips', 'ok', train)!;
    expect(r.gains.map((g) => g.xp)).toEqual([10, 5]);
    expect(ticket(s, 'dips', 'ok', train)).toBeNull(); expect(train).toHaveBeenCalledTimes(1);
    expect(save.fatigue).toEqual({ triceps: 1, shoulder: 1 });
    completionTicket()(s, 'dips', 'ok', train);
    expect(train).toHaveBeenCalledTimes(2); expect(save.fatigue).toEqual({ triceps: 2, shoulder: 2 });
  });

  it.each(['pull', 'spin', 'squeeze', 'burst'] as const)('%s: пустой подход не меняет опыт и усталость', (kind) => {
    const rng = mulberry32(1), s = createTrainingGame(kind, rng);
    const save = { ...freshSave(), gym: true, fatigue: { triceps: 2 } };
    const before = structuredClone(save);
    const train = vi.fn((id, grade) => { const r = trainSet(save, id, grade); if (r) Object.assign(save, r.patch); return r; });
    for (let i = 0; i <= GAME_TIME * 60; i++) stepTrainingGame(s, { presses: 0, releases: 0 }, 1 / 60, rng);
    expect(s.done).toBe(true);
    const ticket = completionTicket();
    expect(ticket(s, 'dips', gameGrade(s), train)).toBeNull();
    // Нажатие после окончания не превращает пустой подход в выполненный.
    consumeInput(s, ['press'], rng);
    expect(completionTicket()(s, 'dips', gameGrade(s), train)).toBeNull();
    expect(train).not.toHaveBeenCalled();
    expect(save).toEqual(before);
  });

  it('промах новичка даёт слабую награду, даже когда качество равно нулю', () => {
    const rng = mulberry32(1), s = createTrainingGame('spin', rng);
    const save = { ...freshSave(), gym: true };
    const train = vi.fn((id, grade) => { const r = trainSet(save, id, grade); if (r) Object.assign(save, r.patch); return r; });
    expect(consumeInput(s, ['press', 'release'], rng)).toEqual([{ type: 'miss' }]);
    stepTrainingGame(s, { presses: 0, releases: 0 }, GAME_TIME, rng);
    expect(gameGrade(s)).toBe('weak');
    const result = completionTicket()(s, 'dips', gameGrade(s), train);
    expect(result?.gains[0].xp).toBeGreaterThan(0);
    expect(save.fatigue).toEqual({ triceps: 1, shoulder: 1 });
  });
});
