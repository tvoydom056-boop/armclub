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

  it('старые победы сохраняют доступ к уже достигнутым лигам', () => {
    expect(migrateSave({ wins: { boris: 1, leva: 1 } }).cups).toEqual([]);
    expect(migrateSave({ wins: { dench: 1 } }).cups).toEqual(['basement']);
    expect(migrateSave({ wins: { ilya: 1 } }).cups).toEqual(['basement', 'city']);
    expect(migrateSave({ wins: { ermes: 1 } }).cups).toEqual(['basement', 'city']);
    // После перехода на новую схему обычная победа не заменяет турнирный кубок.
    expect(migrateSave({ cups: [], wins: { dench: 1 } }).cups).toEqual([]);
  });

  it('сохраняет полуфинал и отбрасывает повреждённые или недоступные турниры', () => {
    const wins = { boris: 1, leva: 1 };
    expect(migrateSave({ wins, cups: [], tournament: { leagueId: 'basement', completed: 1 } }).tournament).toEqual({ leagueId: 'basement', completed: 1 });
    for (const completed of [-1, 2, 0.5]) {
      expect(migrateSave({ wins, cups: [], tournament: { leagueId: 'basement', completed } }).tournament).toBeNull();
    }
    expect(migrateSave({ cups: [], wins, tournament: { leagueId: 'city', completed: 0 } }).tournament).toBeNull();
    expect(migrateSave({ cups: ['basement'], wins, tournament: { leagueId: 'basement', completed: 0 } }).tournament).toBeNull();
    expect(migrateSave({ cups: [], tournament: { leagueId: 'basement', completed: 0 } }).tournament).toBeNull();
    expect(migrateSave({ cups: ['pro', 'city', 'unknown'] }).cups).toEqual([]);
    expect(migrateSave({ cups: ['city', 'basement', 'basement', 'unknown'] }).cups).toEqual(['basement', 'city']);
  });
});
