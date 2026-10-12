import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../core/rng';
import { EXERCISES, exerciseById, freshness, type ExerciseDef } from '../core/training';
import { GAME_TUNING, createTrainingGame, type TrainingGameState } from '../core/trainingGames';
import { blendFrames, fatigueTremor, motionAt, newMotionTrack, poseTransform, sceneMotion, PROFILES, trackEvents, type MotionTrack } from './trainingMotion';
import { LAYERS, movingPixel } from './trainingLayers';

const ex = (id: string): ExerciseDef => exerciseById(id)!;
const game = (e: ExerciseDef, time: number): TrainingGameState => ({ ...createTrainingGame(e.game, mulberry32(1)), time });
const at = (s: TrainingGameState, time: number) => ({ ...s, time }) as TrainingGameState;
const hitAt = (time: number, track = newMotionTrack()): MotionTrack => trackEvents(track, [{ type: 'hit' }], time);
/** Самое большое отклонение кадра по x за секунду — так видно дрожь. */
const maxShift = (e: ExerciseDef, s: TrainingGameState, track: MotionTrack, fresh: number, reduced = false) => {
  let max = 0;
  for (let i = 0; i < 60; i++) max = Math.max(max, Math.abs(motionAt(e, at(s, s.time + i / 60), track, fresh, reduced).x));
  return max;
};

/** Полное усилие игрока в своей механике. */
function fullEffort(e: ExerciseDef, time: number): { s: TrainingGameState; track: MotionTrack } {
  const s = game(e, time);
  if (s.kind === 'pull') s.load = GAME_TUNING.pull.zone[1];
  if (s.kind === 'squeeze') { s.holding = true; s.power = 0.99; }
  if (s.kind === 'burst') { s.phase = 'go'; s.taps = 1; }
  return { s, track: s.kind === 'spin' || s.kind === 'burst' ? hitAt(time) : newMotionTrack() };
}

describe('движение руки на экране подхода', () => {
  it('дрожь от перетрена растёт с каждым подходом: 0, 1, 2, 3 px', () => {
    expect([0, 1, 2, 3].map((n) => fatigueTremor(freshness(n)))).toEqual([0, 1, 2, 3]);
  });

  it('в покое у свежего игрока кадр стоит ровно', () => {
    for (const e of EXERCISES) {
      expect(motionAt(e, game(e, 0), newMotionTrack(), 1), e.id).toEqual({ peak: 0, x: 0, y: 0, rotate: 0, scale: 1 });
    }
  });

  it('у каждого упражнения рука доходит до «пика»', () => {
    for (const e of EXERCISES) {
      const { s, track } = fullEffort(e, 1);
      expect(motionAt(e, s, track, 1).peak, e.id).toBeGreaterThan(0.9);
    }
  });

  it('камера движется отдельно от коврика/брусьев, а пара задаёт тягу без повторного сдвига', () => {
    for (const id of ['pushups', 'strap_dumbbell', 'dips', 'triple']) {
      const e = ex(id);
      const { s, track } = fullEffort(e, 1);
      expect(motionAt(e, s, track, 1, true), id).toEqual({ peak: 1, x: 0, y: 0, rotate: 0, scale: 1 });
      if (id === 'dips') expect(sceneMotion(e, s, track).backgroundY).toBe(40);
    }
  });

  it('срыв тяги трясёт и роняет кадр, к концу паузы всё возвращается', () => {
    const e = ex('dips');
    const s = game(e, 2);
    const track = trackEvents(newMotionTrack(), [{ type: 'fail' }], 2);
    expect(motionAt(e, at(s, 2.01), track, 1, true).y).toBeCloseTo(2.97);
    expect(maxShift(e, at(s, 2.01), track, 1)).toBeGreaterThan(0);
    expect(motionAt(e, at(s, 2 + GAME_TUNING.pull.stun + 0.01), track, 1)).toEqual({ peak: 0, x: 0, y: 0, rotate: 0, scale: 1 });
  });

  it('уставшая рука дрожит сильнее свежей', () => {
    const e = ex('cone');
    const s = game(e, 1);
    const track = newMotionTrack();
    const shifts = [0, 1, 3].map((n) => maxShift(e, s, track, freshness(n)));
    expect(shifts[0]).toBe(0);
    expect(shifts[1]).toBeGreaterThan(0);
    expect(shifts[2]).toBeGreaterThan(shifts[1]);
  });

  it('«Капитан» дрожит от натуги раньше обычного эспандера', () => {
    const tremble = (id: string) => {
      const e = ex(id);
      const s = game(e, 1);
      if (s.kind === 'squeeze') { s.holding = true; s.power = 0.6; }
      return maxShift(e, s, newMotionTrack(), 1);
    };
    expect(tremble('gripper')).toBe(0);
    expect(tremble('gripper_pro')).toBeGreaterThan(0);
  });

  it('мультиспин качается то в одну, то в другую сторону', () => {
    const e = ex('multispin');
    const first = hitAt(1);
    const second = hitAt(2, first);
    expect(motionAt(e, game(e, 1), first, 1).rotate).toBeCloseTo(12);
    expect(motionAt(e, game(e, 2), second, 1).rotate).toBeCloseTo(-12);
  });

  it('при «меньше движения» нет ни дрожи, ни тряски', () => {
    const e = ex('cone');
    const track = trackEvents(newMotionTrack(), [{ type: 'fail' }], 1);
    expect(maxShift(e, game(e, 1), track, freshness(3), true)).toBe(0);
  });

  it('события копятся в новом объекте, старый не меняется', () => {
    const track = newMotionTrack();
    const next = trackEvents(track, [{ type: 'hit' }, { type: 'miss' }, { type: 'go' }], 3);
    expect(track).toEqual(newMotionTrack());
    expect(next).toMatchObject({ hits: 1, lastHit: 3, lastMiss: 3, lastGo: 3 });
  });

  it('смена кадров не оставляет двойную полупрозрачную руку в середине усилия', () => {
    expect(blendFrames(0)).toEqual({ rest: 1, peak: 0 });
    expect(blendFrames(0.5)).toEqual({ rest: 0, peak: 1 });
    expect(blendFrames(1)).toEqual({ rest: 0, peak: 1 });
  });

  it('все 17 ID имеют собственный профиль и маски', () => {
    expect(Object.keys(PROFILES).sort()).toEqual(EXERCISES.map((e) => e.id).sort());
    expect(Object.keys(LAYERS).sort()).toEqual(EXERCISES.map((e) => e.id).sort());
  });

  it('опоры остаются вне подвижной маски, включая локоть семи ручек', () => {
    for (const id of ['strap_block', 'fat_grip', 'roller', 'cone', 'eccentric', 'triple', 'multispin']) {
      const spec = LAYERS[id];
      for (const [x, y] of [[1040, 850], [400, 700], [1350, 550], [750, 950]]) expect(movingPixel(spec, x, y, 245, 150, 70), id).toBe(false);
      expect(movingPixel(spec, 800, 350, 245, 150, 70), id).toBe(true);
    }
    expect(movingPixel(LAYERS.dips, 500, 300, 110, 110, 110)).toBe(false);
    expect(movingPixel(LAYERS.pushups, 400, 400, 245, 150, 70)).toBe(false);
  });

  it('burst: сигнал без ввода не прыгает и не бросает, бег не ускоряется', () => {
    for (const id of ['run', 'jump_rope', 'medball']) {
      const e = ex(id), s = game(e, 1);
      if (s.kind !== 'burst') throw Error('burst');
      s.phase = 'go';
      const t = trackEvents(newMotionTrack(), [{ type: 'go' }], 1);
      const pose = motionAt(e, s, t, 1);
      expect(pose.y).toBe(0); expect(pose.scale).toBe(1);
      if (id !== 'run') expect(pose.peak).toBe(0);
      expect(sceneMotion(e, s, t).flight).toBe(false);
      if (id === 'run') expect(sceneMotion(e, s, t).roadSpeed).toBe(80);
    }
  });

  it('быстрые броски обновляют один полёт; wait гасит импульс', () => {
    const e = ex('medball'), s = game(e, 1);
    if (s.kind !== 'burst') throw Error('burst');
    s.phase = 'go'; s.taps = 8;
    const track = trackEvents(newMotionTrack(), [{ type: 'hit' }, { type: 'hit' }], 1);
    expect(sceneMotion(e, at(s, 1.1), track).flight).toBe(true);
    expect(motionAt(e, at(s, 1.2), track, 1).peak).toBe(1);
    s.phase = 'wait';
    expect(sceneMotion(e, s, track).flight).toBe(false);
    expect(motionAt(e, s, track, 1).peak).toBe(0);
  });

  it('последовательность всех событий сохраняет оценку, высоту блинов и конец', () => {
    const next = trackEvents(newMotionTrack(), [{ type: 'hit' }, { type: 'hit' }, { type: 'miss' }, { type: 'rep', score: .83 }, { type: 'fail' }, { type: 'falseStart' }, { type: 'go' }, { type: 'end' }], 2);
    expect(next).toMatchObject({ hits: 3, plates: 8, score: .83, ended: true, lastFail: 2, lastFalseStart: 2, lastGo: 2 });
    expect(motionAt(ex('roller'), game(ex('roller'), 2), next, .4).peak).toBe(0);
  });

  it('поза превращается в CSS transform', () => {
    expect(poseTransform({ peak: 1, x: 1, y: -2.25, rotate: 3, scale: 0.92 })).toBe('translate(1.0px, -2.3px) rotate(3.00deg) scale(0.920)');
  });
});
