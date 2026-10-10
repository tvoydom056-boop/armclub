import { describe, expect, it } from 'vitest';
import { TUNING, createMatch, playerForce, rewardFor, stepMatch, type MatchConfig, type MatchState } from './match';
import { OPPONENTS, ROSTERS, V2_POWER, opponentById } from './opponents';
import { mulberry32 } from './rng';
import { COUNTER, matchup, TECHNIQUES, type Technique } from './techniques';
import { UPGRADES, deriveStats, emptyLevels, upgradeCost, type Levels } from './upgrades';

const DT = 1 / 60;

const cfgFor = (oppId: string, levels: Levels = emptyLevels()): MatchConfig => ({
  stats: deriveStats(levels),
  opp: opponentById(oppId),
});

/** Дожидаемся «ГО!», ничего не нажимая. */
function toFight(s: MatchState, cfg: MatchConfig, rng: () => number) {
  let guard = 0;
  while (s.phase === 'ready' && guard++ < 1000) stepMatch(s, cfg, { clicks: 0 }, DT, rng);
}

describe('техники', () => {
  it('замкнуты в цикл: каждая бьёт ровно одну и проигрывает ровно одной', () => {
    for (const t of TECHNIQUES) {
      expect(matchup(t, COUNTER[t])).toBe(-1);
      expect(matchup(COUNTER[t], t)).toBe(1);
      expect(matchup(t, t)).toBe(0);
    }
  });
});

describe('старт матча', () => {
  it('«Ready» → «ГО!» без кликов', () => {
    const cfg = cfgFor('boris');
    const rng = mulberry32(1);
    const s = createMatch(cfg, rng);
    expect(s.phase).toBe('ready');
    toFight(s, cfg, rng);
    expect(s.phase).toBe('fight');
  });

  it('клик до «ГО!» — предупреждение, второй — фол и проигрыш', () => {
    const cfg = cfgFor('boris');
    const rng = mulberry32(2);
    const s = createMatch(cfg, rng);
    const e1 = stepMatch(s, cfg, { clicks: 1 }, DT, rng);
    expect(e1).toContainEqual({ type: 'falseStart', warnings: 1 });
    expect(s.phase).toBe('ready');
    const e2 = stepMatch(s, cfg, { clicks: 1 }, DT, rng);
    expect(e2).toContainEqual({ type: 'end', result: 'lost', reason: 'foul' });
    expect(s.phase).toBe('lost');
  });

  it('клик сразу после «ГО!» даёт рывок на старте, повторный — нет', () => {
    const cfg = cfgFor('boris');
    const rng = mulberry32(3);
    const s = createMatch(cfg, rng);
    toFight(s, cfg, rng);
    const first = stepMatch(s, cfg, { clicks: 1 }, DT, rng);
    expect(first.some((e) => e.type === 'startBonus')).toBe(true);
    const second = stepMatch(s, cfg, { clicks: 1 }, DT, rng);
    expect(second.some((e) => e.type === 'startBonus')).toBe(false);
  });

  it('каждый уровень «Взрывного старта» усиливает рывок, даже при прокачанной силе', () => {
    const afterStart = (explosive: number) => {
      const cfg = cfgFor('boris', { ...emptyLevels(), biceps: 10, explosive });
      const rng = mulberry32(4);
      const s = createMatch(cfg, rng);
      toFight(s, cfg, rng);
      stepMatch(s, cfg, { clicks: 1 }, DT, rng);
      return { s, cfg, rng };
    };
    for (let l = 1; l <= 15; l++) expect(afterStart(l).s.momentum).toBeGreaterThan(afterStart(l - 1).s.momentum);
    // следующий клик не обрезает рывок до потолка
    const { s, cfg, rng } = afterStart(15);
    const peak = s.momentum;
    stepMatch(s, cfg, { clicks: 1 }, DT, rng);
    expect(s.momentum).toBeGreaterThan(TUNING.maxMomentum);
    expect(s.momentum).toBeGreaterThan(peak * 0.9);
  });
});

describe('ход боя', () => {
  it('без кликов игрок проигрывает', () => {
    const cfg = cfgFor('boris');
    const rng = mulberry32(4);
    const s = createMatch(cfg, rng);
    let t = 0;
    while (s.phase !== 'lost' && s.phase !== 'won' && t < 120) {
      stepMatch(s, cfg, { clicks: 0 }, DT, rng);
      t += DT;
    }
    expect(s.phase).toBe('lost');
  });

  it('смена техники даёт временный штраф', () => {
    const cfg = cfgFor('boris');
    const rng = mulberry32(5);
    const s = createMatch(cfg, rng);
    toFight(s, cfg, rng);
    s.momentum = 3;
    s.opp.tech = 'hook';
    const before = playerForce(s, cfg);
    stepMatch(s, cfg, { clicks: 0, tech: 'toproll' }, 0.001, rng);
    expect(s.switchLeft).toBeGreaterThan(0);
    // топролл бьёт крюк, но в момент перехода сила всё равно просела
    expect(playerForce(s, cfg)).toBeLessThan(before * (1 + TUNING.matchupBonus));
  });

  it('пресс слабее, пока ты не впереди, и сильнее, когда впереди', () => {
    const cfg = cfgFor('boris');
    const rng = mulberry32(6);
    const s = createMatch(cfg, rng);
    toFight(s, cfg, rng);
    s.tech = 'press';
    s.momentum = 3;
    s.opp.tech = 'press';
    s.position = -0.3;
    const behind = playerForce(s, cfg);
    s.position = 0.5;
    const ahead = playerForce(s, cfg);
    expect(ahead).toBeGreaterThan(behind * 1.5);
  });

  it('соперник телеграфирует смену техники заранее', () => {
    const cfg = cfgFor('venya');
    const rng = mulberry32(7);
    const s = createMatch(cfg, rng);
    toFight(s, cfg, rng);
    let sawTelegraph = false;
    let sawSwitchAfter = false;
    for (let i = 0; i < 60 * 40 && s.phase === 'fight'; i++) {
      const events = stepMatch(s, cfg, { clicks: i % 9 === 0 ? 1 : 0 }, DT, rng);
      if (events.some((e) => e.type === 'oppTelegraph')) sawTelegraph = true;
      if (sawTelegraph && events.some((e) => e.type === 'oppSwitch')) sawSwitchAfter = true;
    }
    expect(sawTelegraph).toBe(true);
    expect(sawSwitchAfter).toBe(true);
  });

  it('выносливость тратится, пока кликаешь, даже с прокачкой на максимуме, и копится в паузах', () => {
    const maxStamina = UPGRADES.find((u) => u.id === 'stamina')!.maxLevel;
    const cfg = cfgFor('boris', { ...emptyLevels(), stamina: maxStamina });
    const rng = mulberry32(8);
    const s = createMatch(cfg, rng);
    toFight(s, cfg, rng);
    // 4 клика в секунду пять секунд
    for (let i = 0; i < 60 * 5; i++) stepMatch(s, cfg, { clicks: i % 15 === 0 ? 1 : 0 }, DT, rng);
    const afterClicks = s.stamina;
    expect(afterClicks).toBeLessThan(0.95);
    for (let i = 0; i < 60 * 2; i++) stepMatch(s, cfg, { clicks: 0 }, DT, rng);
    expect(s.stamina).toBeGreaterThan(afterClicks);
  });
});

describe('экономика', () => {
  it('цена апгрейда растёт с уровнем', () => {
    for (const u of UPGRADES) {
      expect(upgradeCost(u, 5)).toBeGreaterThan(upgradeCost(u, 0));
      expect(upgradeCost(u, 0)).toBe(Math.ceil(u.baseCost));
    }
  });

  it('каждый купленный уровень меняет характеристики', () => {
    for (const u of UPGRADES) {
      for (let l = 1; l <= u.maxLevel; l++) {
        const prev = deriveStats({ ...emptyLevels(), [u.id]: l - 1 });
        const next = deriveStats({ ...emptyLevels(), [u.id]: l });
        expect(next, `${u.name}, ур. ${l}`).not.toEqual(prev);
      }
    }
  });

  it('проигрыш тоже приносит монеты, победа быстрее — больше', () => {
    const boris = opponentById('boris');
    expect(rewardFor(boris, false, 30)).toBeGreaterThan(0);
    expect(rewardFor(boris, true, 10)).toBeGreaterThan(rewardFor(boris, true, 40));
    expect(rewardFor(boris, true, 40)).toBeGreaterThan(rewardFor(boris, false, 40));
  });
});

describe('версия 2', () => {
  it('бойцы в 1.5 раза сильнее, остальное не меняется', () => {
    for (const o of ROSTERS[2]) {
      const base = opponentById(o.id, 1); // бойцов только версии 2 версия 1 отдаёт в исходном виде
      expect(o.power).toBeCloseTo(base.power * V2_POWER);
      expect(o.weights).toEqual(base.weights);
    }
    expect(opponentById('boris', 2).power).toBeCloseTo(2.2 * 1.5);
    expect(opponentById('boris', 1).power).toBe(2.2);
  });
});

/* ---------- Баланс: боты играют тысячи матчей ---------- */

type Bot = 'hook-only' | 'reader' | 'spam-random';

interface SimResult {
  won: boolean;
  time: number;
}

function simulate(oppId: string, levels: Levels, bot: Bot, seed: number, cps = 6.5): SimResult {
  const cfg = cfgFor(oppId, levels);
  const rng = mulberry32(seed);
  const s = createMatch(cfg, rng);
  let acc = 0;
  let sawChangeAt = -1;
  let lastSeen: Technique | null = null;
  let wanted: Technique = 'hook';
  let clock = 0;
  const reaction = 0.3;

  for (let i = 0; i < 60 * 120 && s.phase !== 'won' && s.phase !== 'lost'; i++) {
    clock += DT;
    let clicks = 0;
    let tech: Technique | undefined;
    if (s.phase === 'fight') {
      acc += cps * DT;
      clicks = Math.floor(acc);
      acc -= clicks;
      if (bot === 'reader') {
        const target = s.opp.next ?? s.opp.tech;
        if (target !== lastSeen) {
          lastSeen = target;
          sawChangeAt = clock;
        }
        if (sawChangeAt >= 0 && clock - sawChangeAt >= reaction) {
          wanted = COUNTER[target];
          // пресс до того, как ты впереди, не нужен — остаёмся на крюке
          if (wanted === 'press' && s.position < cfg.stats.pressGate) wanted = 'hook';
        }
        tech = wanted;
      }
    }
    stepMatch(s, cfg, { clicks, tech }, DT, rng);
  }
  return { won: s.phase === 'won', time: s.time };
}

function winRate(oppId: string, levels: Levels, bot: Bot, n = 120) {
  let wins = 0;
  let time = 0;
  for (let i = 0; i < n; i++) {
    const r = simulate(oppId, levels, bot, 1000 + i);
    if (r.won) wins += 1;
    time += r.time;
  }
  return { rate: wins / n, avgTime: time / n };
}

const lv = (patch: Partial<Levels>): Levels => ({ ...emptyLevels(), ...patch });

describe('баланс (боты)', () => {
  it('таблица винрейтов (смотреть вывод)', () => {
    const tiers: [string, Levels][] = [
      ['новичок', emptyLevels()],
      ['5 ур. в телах', lv({ biceps: 5, fingers: 5, triceps: 5, grip: 3, stamina: 3 })],
      ['10 ур.', lv({ biceps: 10, fingers: 10, triceps: 10, grip: 6, stamina: 6, wrist: 3, shoulder: 3 })],
      ['20 ур.', lv({ biceps: 20, fingers: 20, triceps: 20, grip: 12, stamina: 12, wrist: 8, shoulder: 8, pronation: 6 })],
    ];
    const lines: string[] = [];
    for (const [name, levels] of tiers) {
      for (const bot of ['hook-only', 'reader'] as const) {
        const row = OPPONENTS.map((o) => {
          const r = winRate(o.id, levels, bot, 60);
          return `${o.id}:${Math.round(r.rate * 100)}%/${r.avgTime.toFixed(0)}с`;
        }).join('  ');
        lines.push(`${name.padEnd(14)} ${bot.padEnd(10)} ${row}`);
      }
    }
    console.log('\n' + lines.join('\n'));
    expect(lines.length).toBeGreaterThan(0);
  });

  it('новичок, читающий соперника, уверенно бьёт Борю', () => {
    expect(winRate('boris', emptyLevels(), 'reader').rate).toBeGreaterThanOrEqual(0.85);
  });

  it('у новичка почти нет шансов против финального босса', () => {
    expect(winRate('venya', emptyLevels(), 'reader').rate).toBeLessThanOrEqual(0.2);
  });

  it('прокачка и чтение соперника побеждают босса', () => {
    const levels = lv({ biceps: 10, fingers: 10, triceps: 10, grip: 6, stamina: 6, wrist: 3, shoulder: 3 });
    expect(winRate('venya', levels, 'reader').rate).toBeGreaterThanOrEqual(0.6);
  });

  it('чтение соперника лучше, чем бездумный спам одной техникой', () => {
    const levels = lv({ biceps: 3, fingers: 3, triceps: 3, grip: 2, stamina: 2 });
    const reader = winRate('spb_friend', levels, 'reader').rate;
    const dumb = winRate('spb_friend', levels, 'hook-only').rate;
    expect(reader).toBeGreaterThan(dumb);
  });
});
