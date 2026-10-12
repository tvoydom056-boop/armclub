import { describe, expect, it } from 'vitest';
import { simulateCareer, type CareerOptions } from './career';

const SEEDS = [1, 2, 3];

/** Среднее по нескольким прогонам: бой случайный, одна карьера — шум. */
function average(opts: CareerOptions) {
  const runs = SEEDS.map((seed) => simulateCareer({ ...opts, seed }));
  const mean = (f: (r: (typeof runs)[number]) => number) => runs.reduce((a, r) => a + f(r), 0) / runs.length;
  return {
    finished: runs.every((r) => r.finished),
    fights: mean((r) => r.fights),
    sets: mean((r) => r.sets),
    minutes: mean((r) => r.minutes),
    fightTime: mean((r) => r.fightTime),
    steps: runs[0].steps.map((st, i) => ({
      id: st.id,
      fights: runs.reduce((a, r) => a + (r.steps[i]?.fights ?? 0), 0) / runs.length,
      minutes: runs.reduce((a, r) => a + (r.steps[i]?.minutes ?? 0), 0) / runs.length,
      levels: runs.reduce((a, r) => a + (r.steps[i]?.levels ?? 0), 0) / runs.length,
    })),
  };
}

describe('карьера лиги v2 (боты)', () => {
  it('таблица прохождения (смотреть вывод)', () => {
    const rows: [string, CareerOptions][] = [
      ['покупка уровней (старое)', { mode: 'buy' }],
      ['тренировки, «Норм», 6 подх.', { mode: 'train' }],
      ['тренировки, «Слабо», 6 подх.', { mode: 'train', grade: 'weak' }],
      ['тренировки, «Отлично», 6 подх.', { mode: 'train', grade: 'great' }],
      ['тренировки, «Норм», 3 подх.', { mode: 'train', setsPerFight: 3 }],
      ['тренировки, «Норм», 10 подх.', { mode: 'train', setsPerFight: 10 }],
    ];
    const lines = rows.map(([name, opts]) => {
      const r = average(opts);
      const steps = r.steps.map((st) => `${st.id}:${st.fights.toFixed(1)}б/${st.minutes.toFixed(0)}м/${st.levels.toFixed(0)}ур`).join('  ');
      return `${name.padEnd(32)} ${r.finished ? '' : 'НЕ ПРОШЁЛ '}боёв ${r.fights.toFixed(0).padStart(4)}  подх. ${r.sets.toFixed(0).padStart(4)}  ${r.minutes.toFixed(0).padStart(4)} мин  бой ${r.fightTime.toFixed(0)} с | ${steps}`;
    });
    console.log('\n' + lines.join('\n'));
    expect(lines).toHaveLength(rows.length);
  });

  it('лига проходится одними тренировками, а оценка «Слабо» не быстрее «Отлично»', () => {
    const ok = average({ mode: 'train' });
    expect(ok.finished).toBe(true);
    expect(average({ mode: 'train', grade: 'weak' }).fights).toBeGreaterThanOrEqual(average({ mode: 'train', grade: 'great' }).fights);
  });
});
