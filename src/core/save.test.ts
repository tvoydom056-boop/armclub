import { describe, expect, it } from 'vitest';
import { freshSave, migrateSave } from './save';

describe('сохранение', () => {
  it('старое сохранение (версия 1) открывается с теми же уровнями и деньгами', () => {
    const old = { coins: 123, levels: { biceps: 7, grip: 3 }, wins: { boris: 2 }, losses: 4 };
    const s = migrateSave(old);
    expect(s.coins).toBe(123);
    expect(s.levels).toMatchObject({ biceps: 7, grip: 3, triceps: 0 });
    expect(s.wins).toEqual({ boris: 2 });
    expect(s.losses).toBe(4);
    // новые поля — как в свежей игре
    expect(s.owned).toEqual([]);
    expect(s.gym).toBe(false);
    expect(s.xp.biceps).toBe(0);
  });

  it('пустое хранилище — свежая игра', () => {
    expect(migrateSave(undefined)).toEqual(freshSave());
  });

  it('победы над Витей переходят к Йосу', () => {
    expect(migrateSave({ wins: { vitya: 2, yos: 1 } }).wins).toEqual({ yos: 3 });
  });

  it('неизвестные снаряды и лишние поля выбрасываются', () => {
    const s = migrateSave({ owned: ['strap', 'shake'], energy: 35, day: 9, gym: true });
    expect(s.owned).toEqual(['strap']);
    expect(s.gym).toBe(true);
    expect(Object.keys(s).sort()).toEqual(Object.keys(freshSave()).sort());
  });
});
