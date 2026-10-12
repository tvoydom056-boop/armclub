import { beforeEach, describe, expect, it, vi } from 'vitest';
import { freshSave, migrateSave } from '../core/save';
import { LEAGUES } from '../core/leagues';
import { rewardFor } from '../core/match';
import { opponentById } from '../core/opponents';

vi.hoisted(() => {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('window', { localStorage: storage });
});

import { isUnlocked, useGame } from './game';

function finish(id: string, won = true) {
  useGame.getState().finishMatch({ oppId: id, result: won ? 'won' : 'lost', reason: 'pin', time: 10 });
}

beforeEach(() => {
  useGame.setState({ ...freshSave(), version: 2, screen: 'hub', tab: 'fights', oppId: null, result: null });
});

describe('интеграция карьеры с боями и сохранением', () => {
  it('нельзя начать закрытый бой даже в обход кнопки', () => {
    expect(useGame.getState().startMatch('dench')).toBe(false);
    expect(useGame.getState().startMatch('leva')).toBe(false);
    expect(useGame.getState().startMatch('unknown')).toBe(false);
    expect(useGame.getState().screen).toBe('hub');
    expect(useGame.getState().startMatch('boris')).toBe(true);
    expect(useGame.getState().startMatch('boris')).toBe(false);
  });

  it('отбор открывает только турнир; кубок открывает следующую лигу и даёт бонус один раз', () => {
    useGame.getState().startMatch('boris'); finish('boris');
    expect(useGame.getState().startMatch('leva')).toBe(true); finish('leva');
    expect(useGame.getState().startMatch('dench')).toBe(false);
    useGame.getState().toHub('fights');
    expect(useGame.getState().startTournament('basement')).toBe(true);
    expect(useGame.getState().startMatch('leva')).toBe(false);
    useGame.getState().startMatch('boris'); finish('boris');
    expect(useGame.getState().result?.tournament?.status).toBe('advanced');
    expect(useGame.getState().startMatch('boris')).toBe(false);
    expect(useGame.getState().startMatch('leva')).toBe(true); finish('leva');
    const s = useGame.getState();
    expect(s.cups).toEqual(['basement']);
    expect(s.result?.reward).toBe(rewardFor(opponentById('leva', 2), true, 10) + LEAGUES[0].prize);
    finish('leva');
    expect(useGame.getState().coins).toBe(s.coins);
    expect(useGame.getState().wins.leva).toBe(s.wins.leva);
    expect(useGame.getState().startMatch('dench')).toBe(true);
  });

  it('в турнире нельзя тренироваться или купить снаряд, после выхода можно', () => {
    useGame.setState({ wins: { boris: 1, leva: 1 }, coins: 500 });
    useGame.getState().startTournament('basement');
    expect(useGame.getState().train('pushups', 'great')).toBeNull();
    expect(useGame.getState().buyItem('strap')).toBe(false);
    expect(useGame.getState().buyGym()).toBe(false);
    useGame.getState().setTab('shop');
    expect(useGame.getState().tab).toBe('fights');
    useGame.getState().abandonTournament();
    expect(useGame.getState().train('pushups', 'great')).not.toBeNull();
    expect(useGame.getState().buyItem('strap')).toBe(true);
  });

  it('поражение и выход сохраняют прокачку, но следующая попытка начинается с полуфинала', () => {
    const saved = migrateSave({ ...freshSave(), cups: ['basement'], wins: { dench: 1, vitalik: 1 }, levels: { biceps: 7 } });
    useGame.setState(saved);
    useGame.getState().startTournament('city');
    useGame.getState().startMatch('dench'); finish('dench');
    useGame.getState().startMatch('vitalik'); finish('vitalik', false);
    expect(useGame.getState().tournament).toBeNull();
    expect(useGame.getState().cups).toEqual(['basement']);
    expect(useGame.getState().levels.biceps).toBe(7);
    useGame.getState().toHub();
    useGame.getState().startTournament('city');
    expect(useGame.getState().tournament?.completed).toBe(0);
    useGame.getState().toHub('shop');
    expect(useGame.getState().tournament).toBeNull();
    expect(useGame.getState().tab).toBe('shop');
  });

  it('чужой результат и повторное событие окончания боя не начисляют деньги', () => {
    useGame.getState().startMatch('boris');
    finish('leva');
    expect(useGame.getState().coins).toBe(0);
    finish('boris');
    const coins = useGame.getState().coins;
    finish('boris');
    expect(useGame.getState().coins).toBe(coins);
  });

  it('после перезагрузки остаются кубки и место в турнирной сетке', async () => {
    useGame.setState({ wins: { boris: 1, leva: 1 } });
    useGame.getState().startTournament('basement');
    useGame.getState().startMatch('boris'); finish('boris');
    const persisted = JSON.parse(localStorage.getItem('armwrestling-club-save')!);
    expect(persisted.version).toBe(3);
    expect(persisted.state.tournament).toEqual({ leagueId: 'basement', completed: 1 });
    useGame.setState({ ...freshSave(), screen: 'hub', oppId: null, result: null });
    localStorage.setItem('armwrestling-club-save', JSON.stringify(persisted));
    await useGame.persist.rehydrate();
    expect(useGame.getState().tournament?.completed).toBe(1);
    expect(useGame.getState().startMatch('leva')).toBe(true);
  });

  it('первая версия остаётся отдельной линейной карьерой', () => {
    useGame.getState().setVersion(1);
    expect(useGame.getState().startTournament('basement')).toBe(false);
    expect(useGame.getState().startMatch('boris')).toBe(true); finish('boris');
    expect(useGame.getState().startMatch('yos')).toBe(true);
    expect(isUnlocked('unknown', {})).toBe(false);
  });
});
