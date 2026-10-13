import { describe, expect, it } from 'vitest';
import {
  EXERCISES, GYM_MEMBERSHIP, ITEMS, applyXp, bestExercise, buyGym, buyItem, canDo, cheapestUnlock, emptyXp, exerciseById, freshness, itemById, setGains, trainSet, xpToNext,
  type ExerciseDef, type TrainingState,
} from './training';
import { UPGRADES, emptyLevels, upgradeById } from './upgrades';

const ex = (id: string): ExerciseDef => exerciseById(id)!;
/** Сколько стоит открыть упражнение в лавке (клубная карта не считается). */
const priceOf = (e: ExerciseDef) => (e.item ? itemById(e.item).price : 0);

describe('снаряды и упражнения', () => {
  it('каждый стат можно качать, и есть путь не дороже 150 монет', () => {
    for (const u of UPGRADES) {
      const paths = EXERCISES.filter((e) => e.primary === u.id || e.secondary === u.id);
      expect(paths.length, u.id).toBeGreaterThan(0);
      expect(Math.min(...paths.map(priceOf)), u.id).toBeLessThanOrEqual(150);
    }
  });

  it('каждый снаряд открывает упражнение', () => {
    for (const item of ITEMS) expect(EXERCISES.some((e) => e.item === item.id), item.id).toBe(true);
  });

  it('id упражнений уникальны', () => {
    expect(new Set(EXERCISES.map((e) => e.id)).size).toBe(EXERCISES.length);
  });

  it('с пустыми руками дома есть чем заняться', () => {
    expect(EXERCISES.filter((e) => canDo(e, [], false)).length).toBeGreaterThan(0);
  });

  it('в зале нужны и клубная карта, и своя ручка', () => {
    expect(canDo(ex('cone'), ['cone'], true)).toBe(true);
    expect(canDo(ex('cone'), ['cone'], false)).toBe(false);
    expect(canDo(ex('cone'), [], true)).toBe(false);
    expect(canDo(ex('dips'), [], true)).toBe(true);
  });

  it('домашние снаряды работают без клубной карты', () => {
    expect(canDo(ex('gripper'), ['gripper'], false)).toBe(true);
    expect(canDo(ex('gripper'), [], false)).toBe(false);
  });
});

describe('опыт за подход', () => {
  it('считается по формуле: 10 × место × снаряд × оценка × свежесть', () => {
    // зал 1.0 × коническая 1.5 × «Отлично» 1.3 = 19.5
    expect(setGains(ex('cone'), 'great', {})).toEqual([{ stat: 'biceps', xp: 20 }]);
    // дом 0.7 × ремень 1.0 × «Норм» 1.0 = 7, запястье получает половину
    expect(setGains(ex('strap_dumbbell'), 'ok', {})).toEqual([{ stat: 'biceps', xp: 7 }, { stat: 'wrist', xp: 4 }]);
  });

  it('перетрен: каждый следующий подход на стат даёт меньше, но не ниже пола', () => {
    const xps = [0, 1, 2, 3, 10].map((n) => setGains(ex('cone'), 'ok', { biceps: n })[0].xp);
    expect(xps).toEqual([15, 11, 8, 6, 6]);
    expect(freshness(99)).toBe(0.4);
  });

  it('свежесть считается по каждому стату отдельно', () => {
    const [biceps, wrist] = setGains(ex('strap_block'), 'ok', { biceps: 3 });
    expect(biceps.xp).toBe(4);
    expect(wrist.xp).toBe(5);
  });

  it('даже худший подход даёт хоть 1 опыта', () => {
    expect(setGains(ex('pushups'), 'weak', { triceps: 9 })[0].xp).toBe(1);
  });

  it('лучший снаряд даёт больше опыта на тот же стат', () => {
    const xp = (id: string) => setGains(ex(id), 'ok', {})[0].xp;
    expect(xp('gripper_pro')).toBeGreaterThan(xp('gripper'));
  });
});

describe('уровни из опыта', () => {
  const biceps = upgradeById('biceps');

  it('порог — половина прежней цены уровня', () => {
    expect(xpToNext(biceps, 0)).toBe(10);
    expect(xpToNext(biceps, 10)).toBe(41);
  });

  it('копит опыт без уровня, если порог не достигнут', () => {
    const r = applyXp(emptyLevels(), emptyXp(), 'biceps', 7);
    expect(r.levels.biceps).toBe(0);
    expect(r.xp.biceps).toBe(7);
    expect(r.levelsGained).toBe(0);
  });

  it('переносит остаток и может поднять несколько уровней за раз', () => {
    // 10 + 12 = 22 на два уровня, 3 в остатке
    const r = applyXp(emptyLevels(), emptyXp(), 'biceps', 25);
    expect(r.levels.biceps).toBe(2);
    expect(r.xp.biceps).toBe(3);
    expect(r.levelsGained).toBe(2);
  });

  it('на максимальном уровне опыт сгорает', () => {
    const levels = { ...emptyLevels(), biceps: biceps.maxLevel - 1 };
    const r = applyXp(levels, emptyXp(), 'biceps', 1e6);
    expect(r.levels.biceps).toBe(biceps.maxLevel);
    expect(r.xp.biceps).toBe(0);
  });

  it('не меняет входные объекты', () => {
    const levels = emptyLevels();
    const xp = emptyXp();
    applyXp(levels, xp, 'biceps', 100);
    expect(levels.biceps).toBe(0);
    expect(xp.biceps).toBe(0);
  });
});

const state = (over: Partial<TrainingState> = {}): TrainingState => ({
  coins: 0, levels: emptyLevels(), xp: emptyXp(), owned: [], gym: false, fatigue: {}, ...over,
});

describe('лавка и подходы', () => {
  it('снаряд покупается один раз и только на свои деньги', () => {
    expect(buyItem(state({ coins: 100 }), 'strap')).toEqual({ coins: 40, owned: ['strap'] });
    expect(buyItem(state({ coins: 100, owned: ['strap'] }), 'strap')).toBeNull();
    expect(buyItem(state({ coins: 59 }), 'strap')).toBeNull();
  });

  it('клубная карта покупается один раз', () => {
    expect(buyGym(state({ coins: 150 }))).toEqual({ coins: 150 - GYM_MEMBERSHIP, gym: true });
    expect(buyGym(state({ coins: 150, gym: true }))).toBeNull();
    expect(buyGym(state({ coins: GYM_MEMBERSHIP - 1 }))).toBeNull();
  });

  it('подход даёт опыт и копит перетрен по обоим статам', () => {
    const r = trainSet(state({ owned: ['strap'] }), 'strap_dumbbell', 'ok')!;
    expect(r.patch.xp).toMatchObject({ biceps: 7, wrist: 4 });
    expect(r.patch.fatigue).toEqual({ biceps: 1, wrist: 1 });
    expect(r.gains.map((g) => g.stat)).toEqual(['biceps', 'wrist']);
  });

  it('подход поднимает уровень и сообщает об этом', () => {
    const r = trainSet(state({ owned: ['cone'], gym: true }), 'cone', 'great')!;
    expect(r.patch.levels?.biceps).toBe(1);
    expect(r.gains[0].levelsGained).toBe(1);
  });

  it('без снаряда, без клубной карты или с неизвестным упражнением подход невозможен', () => {
    expect(trainSet(state(), 'strap_dumbbell', 'ok')).toBeNull();
    expect(trainSet(state({ owned: ['cone'] }), 'cone', 'ok')).toBeNull();
    expect(trainSet(state(), 'nope', 'ok')).toBeNull();
  });
});

describe('переход от стата к упражнению', () => {
  it('без снарядов лучшее упражнение трицепса — свободное, а бицепсу ничего не доступно', () => {
    expect(bestExercise('triceps', [], false, {})?.ex.id).toBe('pushups');
    expect(bestExercise('biceps', [], false, {})).toBeNull();
  });

  it('берёт упражнение с наибольшим опытом именно этому стату', () => {
    // канат и блок-рукоять в зале, отжимания дома: зал и снаряд лучше
    const best = bestExercise('triceps', ['tricep_rope'], true, {})!;
    expect(best.ex.id).toBe('tricep_rope');
    expect(best.xp).toBe(setGains(ex('tricep_rope'), 'ok', {})[0].xp);
  });

  it('побочный стат тоже находит упражнение, но с половиной опыта', () => {
    const best = bestExercise('wrist', ['strap'], false, {})!;
    expect(best.ex.secondary).toBe('wrist');
    expect(best.xp).toBe(Math.max(1, Math.round(setGains(best.ex, 'ok', {})[0].xp * 0.5)));
  });

  it('для закрытого стата называет самый дешёвый путь', () => {
    const route = cheapestUnlock('biceps', [], false)!;
    expect(route.item).toBe('strap');
    expect(route.cost).toBe(itemById('strap').price);
    expect(route.needsGym).toBe(false);
    // плечо без карты: брусья в зале стоят только карту
    const shoulder = cheapestUnlock('shoulder', [], false)!;
    expect(shoulder.needsGym).toBe(true);
    expect(shoulder.cost).toBe(GYM_MEMBERSHIP);
    expect(cheapestUnlock('shoulder', [], true)!.cost).toBe(0);
  });

  it('у каждого стата есть хоть какой-то путь', () => {
    for (const u of UPGRADES) expect(cheapestUnlock(u.id, [], false), u.id).not.toBeNull();
  });
});
