import { beforeEach, describe, expect, it, vi } from 'vitest';
import { freshSave, migrateSave } from '../core/save';
import { LEAGUES } from '../core/leagues';
import { emptyMatchMetrics, rewardFor } from '../core/match';
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
  it('фол не даёт монеты и не снимает перетрен, в том числе при повторном событии', () => {
    useGame.setState({ coins: 20, fatigue: { triceps: 3, shoulder: 2 } });
    useGame.getState().startMatch('boris');
    const result = { oppId: 'boris', result: 'lost', reason: 'foul', time: 0 } as const;
    useGame.getState().finishMatch(result);
    useGame.getState().finishMatch(result);
    expect(useGame.getState().coins).toBe(20);
    expect(useGame.getState().result?.reward).toBe(0);
    expect(useGame.getState().fatigue).toEqual({ triceps: 3, shoulder: 2 });
    expect(useGame.getState().losses).toBe(1);
  });

  it.each(['pin', 'time'] as const)('обычное поражение (%s) сохраняет награду и снимает перетрен', (reason) => {
    useGame.setState({ fatigue: { triceps: 3 } });
    useGame.getState().startMatch('boris');
    useGame.getState().finishMatch({ oppId: 'boris', result: 'lost', reason, time: 75 });
    expect(useGame.getState().coins).toBe(rewardFor(opponentById('boris', 2), false, 75));
    expect(useGame.getState().coins).toBeGreaterThan(0);
    expect(useGame.getState().fatigue).toEqual({});
  });

  it('разбор хранит снимок метрик только до нового боя', () => {
    const metrics = { ...emptyMatchMetrics(), lowStaminaSeconds: 4 };
    useGame.getState().startMatch('boris');
    useGame.getState().finishMatch({ oppId: 'boris', result: 'won', reason: 'pin', time: 10, metrics });
    metrics.lowStaminaSeconds = 99;
    expect(useGame.getState().result?.metrics?.lowStaminaSeconds).toBe(4);
    const persisted = JSON.parse(localStorage.getItem('armwrestling-club-save')!);
    expect(persisted.state.result).toBeUndefined();
    useGame.getState().startMatch('boris');
    expect(useGame.getState().result).toBeNull();
    finish('boris');
    expect(useGame.getState().result?.metrics).toBeNull();
  });

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

describe('боевой принцип', () => {
  it('меняется бесплатно в хабе и не меняется во время боя', () => {
    useGame.getState().setStyle('burst');
    expect(useGame.getState().style).toBe('burst');
    useGame.getState().startMatch('boris');
    useGame.getState().setStyle('economy');
    expect(useGame.getState().style).toBe('burst');
    expect(useGame.getState().coins).toBe(0);
  });
});

describe('спарринг', () => {
  const end = (over: Partial<{ result: 'won' | 'lost'; reason: 'pin' | 'foul' | 'time'; position: number }> = {}) =>
    useGame.getState().finishSparring({ result: 'won', reason: 'pin', time: 6, position: 1, ...over });

  it('без десяти монет бой не начинается', () => {
    useGame.setState({ coins: 9 });
    expect(useGame.getState().startSparring('hook')).toBe(false);
    expect(useGame.getState().screen).toBe('hub');
  });

  it('платит партнёру и даёт опыт обоим статам техники, повторное событие не начисляет вторично', () => {
    useGame.setState({ coins: 25 });
    expect(useGame.getState().startSparring('toproll')).toBe(true);
    end();
    end();
    const s = useGame.getState();
    expect(s.coins).toBe(15);
    expect(s.sparringResult?.grade).toBe('great');
    expect(s.sparringResult?.gains.map((g) => g.stat)).toEqual(['fingers', 'pronation']);
    expect(s.fatigue).toEqual({ fingers: 1, pronation: 1 });
    expect(s.wins).toEqual({});
    expect(s.losses).toBe(0);
  });

  it('проигрыш пином платный и даёт слабый опыт, но не поражение в карьере', () => {
    useGame.setState({ coins: 10 });
    useGame.getState().startSparring('press');
    end({ result: 'lost', position: -1 });
    const s = useGame.getState();
    expect(s.coins).toBe(0);
    expect(s.sparringResult?.grade).toBe('weak');
    expect(s.losses).toBe(0);
  });

  it('фол и выход не стоят монет и не дают опыта', () => {
    useGame.setState({ coins: 30 });
    useGame.getState().startSparring('hook');
    end({ result: 'lost', reason: 'foul', position: 0 });
    expect(useGame.getState().coins).toBe(30);
    expect(useGame.getState().sparringResult?.gains).toEqual([]);
    expect(useGame.getState().xp).toEqual(freshSave().xp);

    useGame.getState().toHub('shop');
    useGame.getState().startSparring('hook');
    useGame.getState().toHub('shop');
    expect(useGame.getState().coins).toBe(30);
    expect(useGame.getState().sparring).toBeNull();
    expect(useGame.getState().sparringResult).toBeNull();
  });

  it('запрещён в турнире и во время боя, а обычный бой сбрасывает спарринг', () => {
    useGame.setState({ coins: 50, tournament: { leagueId: 'basement', completed: 0 } });
    expect(useGame.getState().startSparring('hook')).toBe(false);
    useGame.setState({ tournament: null });
    expect(useGame.getState().startSparring('hook')).toBe(true);
    expect(useGame.getState().startSparring('press')).toBe(false);
    useGame.getState().toHub();
    useGame.getState().startMatch('boris');
    expect(useGame.getState().sparring).toBeNull();
  });
});
