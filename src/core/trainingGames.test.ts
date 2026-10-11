import { describe, expect, it } from 'vitest';
import { mulberry32 } from './rng';
import type { GameKind } from './training';
import {
  GAME_TIME, GAME_TUNING, createTrainingGame, gameGrade, gameQuality, stepTrainingGame,
  type GameInput, type TrainingGameState,
} from './trainingGames';

const DT = 1 / 60;
type Bot = (s: TrainingGameState, frame: number) => GameInput;
const tap = (presses = 1): GameInput => ({ presses, releases: 0 });
const idle: Bot = () => tap(0);
/** Кликает каждый кадр (60 раз в секунду) — тупой спам. */
const spam: Bot = () => ({ presses: 1, releases: 1 });

function play(kind: GameKind, bot: Bot, seed = 1) {
  const rng = mulberry32(seed);
  const s = createTrainingGame(kind, rng);
  let frame = 0;
  while (!s.done && frame < 2000) stepTrainingGame(s, bot(s, frame++), DT, rng);
  return { s, frames: frame, quality: gameQuality(s), grade: gameGrade(s) };
}

/** Идеальные игроки: делают ровно то, что просит подсказка на экране. */
const perfect: Record<GameKind, Bot> = {
  // поддерживает нагрузку в середине зелёной зоны, кликая 10 раз в секунду
  pull: (s, f) => tap(s.kind === 'pull' && s.load < 0.62 && f % 6 === 0 ? 1 : 0),
  // кликает точно в удар метронома
  spin: (s) => tap(s.kind === 'spin' && s.next < s.beats.length && Math.abs(s.time + DT - s.beats[s.next]) < DT / 2 ? 1 : 0),
  // зажимает и отпускает у цели
  squeeze: (s) => {
    if (s.kind !== 'squeeze') return tap(0);
    if (!s.holding) return tap(1);
    return { presses: 0, releases: s.power >= s.target ? 1 : 0 };
  },
  // реакция 0,2 с, потом 8 кликов в секунду
  burst: (s, f) => tap(s.kind === 'burst' && s.phase === 'go' && s.since >= 0.2 && f % 7 === 0 ? 1 : 0),
};

const KINDS: GameKind[] = ['pull', 'spin', 'squeeze', 'burst'];

describe('мини-игры тренировки', () => {
  it.each(KINDS)('%s: подход длится ровно 10 секунд', (kind) => {
    const { s, frames } = play(kind, idle);
    expect(s.done).toBe(true);
    expect(s.time).toBeCloseTo(GAME_TIME, 5);
    expect(frames).toBe(Math.ceil(GAME_TIME / DT));
  });

  it.each(KINDS)('%s: без кликов — «Слабо»', (kind) => {
    expect(play(kind, idle).grade).toBe('weak');
  });

  it.each(KINDS)('%s: спам без ритма — «Слабо»', (kind) => {
    expect(play(kind, spam).grade).toBe('weak');
  });

  it.each(KINDS)('%s: игра по подсказке — «Отлично»', (kind) => {
    for (const seed of [1, 2, 3]) expect(play(kind, perfect[kind], seed).grade, `seed ${seed}`).toBe('great');
  });

  it.each(KINDS)('%s: качество всегда от 0 до 1 и после конца не меняется', (kind) => {
    const { s, quality } = play(kind, perfect[kind]);
    expect(quality).toBeGreaterThanOrEqual(0);
    expect(quality).toBeLessThanOrEqual(1);
    expect(stepTrainingGame(s, tap(5), DT, mulberry32(9))).toEqual([]);
    expect(gameQuality(s)).toBe(quality);
  });

  it('тяга: за красной линией — срыв и пауза', () => {
    const rng = mulberry32(1);
    const s = createTrainingGame('pull', rng);
    const ev = stepTrainingGame(s, tap(Math.ceil(GAME_TUNING.pull.redLine / GAME_TUNING.pull.push)), DT, rng);
    expect(ev).toContainEqual({ type: 'fail' });
    expect(s.kind === 'pull' && s.load).toBe(0);
    stepTrainingGame(s, tap(3), DT, rng);
    expect(s.kind === 'pull' && s.load).toBe(0);
  });

  it('сжатие: держать до упора — срыв, повтор в ноль', () => {
    const rng = mulberry32(1);
    const s = createTrainingGame('squeeze', rng);
    stepTrainingGame(s, tap(1), DT, rng);
    let failed = false;
    for (let i = 0; i < 120 && !failed; i++) failed = stepTrainingGame(s, tap(0), DT, rng).some((e) => e.type === 'fail');
    expect(failed).toBe(true);
    expect(s.kind === 'squeeze' && s.reps).toEqual([0]);
  });

  it('взрыв: клик до сигнала — фальстарт', () => {
    const rng = mulberry32(1);
    const s = createTrainingGame('burst', rng);
    expect(stepTrainingGame(s, tap(1), DT, rng)).toContainEqual({ type: 'falseStart' });
  });

  it('средняя игра даёт «Норм»', () => {
    // тяга: проспал первые 3 секунды, дальше держит зону
    expect(play('pull', (s, f) => (f > 180 ? perfect.pull(s, f) : tap(0))).grade).toBe('ok');
    // вращение: попадает в каждый второй удар
    let n = 0;
    expect(play('spin', (s, f) => {
      const hit = perfect.spin(s, f);
      return hit.presses && n++ % 2 === 0 ? hit : tap(0);
    }).grade).toBe('ok');
  });
});
