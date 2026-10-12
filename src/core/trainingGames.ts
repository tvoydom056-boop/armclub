import { clamp, randRange, type Rng } from './rng';
import type { GameKind, Grade } from './training';

/** Подход длится 10 секунд. */
export const GAME_TIME = 10;

/** Все числа мини-игр в одном месте. Нагрузка и сила сжатия — доли от 0 до 1. */
export const GAME_TUNING = {
  /** Доля качества, с которой начинается оценка. */
  grade: { ok: 0.45, great: 0.75 },
  /** Тяга: клик поднимает нагрузку, она сама падает; держи в зелёной зоне, за красной линией — срыв. */
  pull: { push: 0.09, fall: 0.15, fallLoad: 0.25, zone: [0.5, 0.8] as const, redLine: 0.92, stun: 1 },
  /** Вращение: метроном ускоряется, клик в окне вокруг удара — попадание. */
  spin: { first: 0.9, from: 0.8, to: 0.42, window: 0.1, extraPenalty: 0.5 },
  /** Сжатие: держи — сила растёт, отпусти у цели; до упора — срыв. Меньше minReps повторов не бывает в зачёте. */
  squeeze: { rise: 0.75, target: [0.6, 0.88] as const, tolerance: 0.22, rest: 0.35, minReps: 5 },
  /** Взрыв: после «ГО!» кликай как можно раньше и чаще; клик до сигнала — фальстарт. */
  burst: { pause: [0.9, 1.8] as const, window: 0.9, react: [0.2, 0.7] as const, taps: 5, falseStartPenalty: 0.1 },
};

/** Ввод за кадр: нажатия и отпускания (клик мыши или пробел). */
export interface GameInput {
  presses: number;
  releases: number;
}

export type GameEvent =
  | { type: 'hit' }
  | { type: 'miss' }
  | { type: 'fail' }
  | { type: 'rep'; score: number }
  | { type: 'go' }
  | { type: 'falseStart' }
  | { type: 'end' };

interface BaseState {
  /** Секунд с начала подхода. */
  time: number;
  done: boolean;
  /** Участие считаем отдельно от качества: промахи новичка тоже являются попыткой. */
  presses: number;
}

export interface PullState extends BaseState {
  kind: 'pull';
  load: number;
  /** Пауза после срыва. */
  stunLeft: number;
  /** Секунд в зелёной зоне. */
  inZone: number;
  fails: number;
}

export interface SpinState extends BaseState {
  kind: 'spin';
  /** Моменты ударов метронома. */
  beats: number[];
  /** Первый ещё не засчитанный удар. */
  next: number;
  hits: number;
  misses: number;
  /** Клики мимо ударов. */
  extra: number;
}

export interface SqueezeState extends BaseState {
  kind: 'squeeze';
  power: number;
  holding: boolean;
  restLeft: number;
  target: number;
  /** Оценки повторов, 0…1. */
  reps: number[];
}

export interface BurstState extends BaseState {
  kind: 'burst';
  phase: 'wait' | 'go';
  phaseLeft: number;
  /** Сигнал «ГО!» идёт столько секунд. */
  since: number;
  reaction: number | null;
  taps: number;
  /** Оценки сигналов, 0…1. */
  scores: number[];
  falseStarts: number;
}

export type TrainingGameState = PullState | SpinState | SqueezeState | BurstState;

function spinBeats(): number[] {
  const { first, from, to, window } = GAME_TUNING.spin;
  const beats: number[] = [];
  for (let t = first; t <= GAME_TIME - window; t += from + (to - from) * (t / GAME_TIME)) beats.push(t);
  return beats;
}

export function createTrainingGame(kind: GameKind, rng: Rng): TrainingGameState {
  const base = { time: 0, done: false, presses: 0 };
  switch (kind) {
    case 'pull': return { ...base, kind, load: 0, stunLeft: 0, inZone: 0, fails: 0 };
    case 'spin': return { ...base, kind, beats: spinBeats(), next: 0, hits: 0, misses: 0, extra: 0 };
    case 'squeeze': return { ...base, kind, power: 0, holding: false, restLeft: 0, target: randRange(rng, GAME_TUNING.squeeze.target), reps: [] };
    case 'burst': return { ...base, kind, phase: 'wait', phaseLeft: randRange(rng, GAME_TUNING.burst.pause), since: 0, reaction: null, taps: 0, scores: [], falseStarts: 0 };
  }
}

function stepPull(s: PullState, input: GameInput, dt: number, ev: GameEvent[]) {
  const t = GAME_TUNING.pull;
  if (s.stunLeft > 0) {
    s.stunLeft = Math.max(0, s.stunLeft - dt);
    return;
  }
  s.load += input.presses * t.push;
  if (s.load >= t.redLine) {
    s.load = 0;
    s.stunLeft = t.stun;
    s.fails++;
    ev.push({ type: 'fail' });
    return;
  }
  s.load = Math.max(0, s.load - (t.fall + t.fallLoad * s.load) * dt);
  if (s.load >= t.zone[0] && s.load <= t.zone[1]) s.inZone += dt;
}

function stepSpin(s: SpinState, input: GameInput, ev: GameEvent[]) {
  const { window } = GAME_TUNING.spin;
  while (s.next < s.beats.length && s.time > s.beats[s.next] + window) {
    s.next++;
    s.misses++;
    ev.push({ type: 'miss' });
  }
  for (let i = 0; i < input.presses; i++) {
    if (s.next < s.beats.length && Math.abs(s.time - s.beats[s.next]) <= window) {
      s.next++;
      s.hits++;
      ev.push({ type: 'hit' });
    } else {
      s.extra++;
      ev.push({ type: 'miss' });
    }
  }
}

function stepSqueeze(s: SqueezeState, input: GameInput, dt: number, rng: Rng, ev: GameEvent[]) {
  const t = GAME_TUNING.squeeze;
  const endRep = (score: number) => {
    s.reps.push(score);
    s.holding = false;
    s.power = 0;
    s.restLeft = t.rest;
    s.target = randRange(rng, t.target);
    ev.push(score > 0 ? { type: 'rep', score } : { type: 'fail' });
  };
  const release = () => endRep(clamp(1 - Math.abs(s.power - s.target) / t.tolerance, 0, 1));
  let { releases } = input;
  if (s.holding && releases > 0) {
    release();
    releases--;
  }
  s.restLeft = Math.max(0, s.restLeft - dt);
  if (!s.holding && input.presses > 0 && s.restLeft <= 0) {
    s.holding = true;
    s.power = 0;
    // короткий тап: нажали и отпустили в одном кадре
    if (releases > 0) return release();
  }
  if (!s.holding) return;
  s.power += t.rise * dt;
  if (s.power >= 1) endRep(0);
}

function stepBurst(s: BurstState, input: GameInput, dt: number, rng: Rng, ev: GameEvent[]) {
  const t = GAME_TUNING.burst;
  s.phaseLeft -= dt;
  if (s.phase === 'wait') {
    if (input.presses > 0) {
      s.falseStarts++;
      ev.push({ type: 'falseStart' });
    }
    if (s.phaseLeft <= 0 && s.time + t.window <= GAME_TIME) {
      s.phase = 'go';
      s.phaseLeft = t.window;
      s.since = 0;
      s.reaction = null;
      s.taps = 0;
      ev.push({ type: 'go' });
    }
    return;
  }
  s.since += dt;
  if (input.presses > 0) {
    s.reaction ??= s.since;
    s.taps += input.presses;
    ev.push({ type: 'hit' });
  }
  if (s.phaseLeft <= 0) finishSignal(s, rng);
}

function finishSignal(s: BurstState, rng: Rng) {
  const t = GAME_TUNING.burst;
  const [fast, slow] = t.react;
  const react = s.reaction === null ? 0 : clamp(1 - (s.reaction - fast) / (slow - fast), 0, 1);
  s.scores.push(0.5 * react + 0.5 * Math.min(1, s.taps / t.taps));
  s.phase = 'wait';
  s.phaseLeft = randRange(rng, t.pause);
}

/** Шаг подхода. Меняет состояние на месте и возвращает события для звука и подсказок. */
export function stepTrainingGame(s: TrainingGameState, input: GameInput, dt: number, rng: Rng): GameEvent[] {
  const ev: GameEvent[] = [];
  if (s.done) return ev;
  s.presses += Math.max(0, input.presses);
  dt = Math.min(dt, GAME_TIME - s.time);
  s.time += dt;
  switch (s.kind) {
    case 'pull': stepPull(s, input, dt, ev); break;
    case 'spin': stepSpin(s, input, ev); break;
    case 'squeeze': stepSqueeze(s, input, dt, rng, ev); break;
    case 'burst': stepBurst(s, input, dt, rng, ev); break;
  }
  if (s.time >= GAME_TIME) {
    if (s.kind === 'burst' && s.phase === 'go') finishSignal(s, rng);
    s.done = true;
    ev.push({ type: 'end' });
  }
  return ev;
}

/** Качество подхода от 0 до 1 — его видно на экране во время игры. */
export function gameQuality(s: TrainingGameState): number {
  switch (s.kind) {
    case 'pull': return clamp(s.inZone / GAME_TIME, 0, 1);
    case 'spin': return clamp((s.hits - GAME_TUNING.spin.extraPenalty * s.extra) / s.beats.length, 0, 1);
    case 'squeeze': return s.reps.reduce((a, b) => a + b, 0) / Math.max(s.reps.length, GAME_TUNING.squeeze.minReps);
    case 'burst': {
      const mean = s.scores.length ? s.scores.reduce((a, b) => a + b, 0) / s.scores.length : 0;
      return clamp(mean - GAME_TUNING.burst.falseStartPenalty * s.falseStarts, 0, 1);
    }
  }
}

export function gameGrade(s: TrainingGameState): Grade {
  const q = gameQuality(s);
  return q >= GAME_TUNING.grade.great ? 'great' : q >= GAME_TUNING.grade.ok ? 'ok' : 'weak';
}

/** Ожидание конца таймера без единого нажатия не является подходом. */
export const hasTrainingInput = (s: TrainingGameState): boolean => s.presses > 0;
