import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CHARACTERS } from '../src/game/characters.ts';
import { checkCharacter, suggestCharacter } from './characterFiles.mjs';

/**
 * Проверка набора каждого нарисованного персонажа (src/game/characters/<id>.json + public/art/opponents/<id>/)
 * теми же правилами, что и сохранение из редактора ?rig=<id> (tools/characterValidation.mjs).
 * Ошибки валят тест; предупреждения только печатаются — их разбирают глазами по листу ?sheet=<id>.
 * Порядок добавления персонажа — docs/adding-opponent.md.
 */
const ROOT = resolve(import.meta.dirname, '..');
/** Декодирование PNG персонажа занимает 2–4 с — стандартных 5 с под нагрузкой не хватает. */
const SLOW = 30_000;

describe.each(Object.entries(CHARACTERS))('персонаж %s', (id, art) => {
  it('набор без ошибок', () => {
    const { errors, warnings } = checkCharacter(ROOT, id, art);
    for (const w of warnings) console.warn(`[${id}] ${w.path}: ${w.message}`);
    expect(errors.map((e) => `${e.path}: ${e.message}`)).toEqual([]);
  }, SLOW);
});

// подсказка рига (tools/characterHints.mjs) на эталоне должна почти повторять ручную подгонку
it('подсказка точек на Боре — в пределах 10 px от ручных', () => {
  const { art, error } = suggestCharacter(ROOT, 'boris');
  expect(error).toBeUndefined();
  const manual = CHARACTERS.boris;
  for (const [hinted, real] of [[art.head.neck, manual.head.neck], [art.torso.neck, manual.torso.neck]]) {
    expect(Math.hypot(hinted.x - real.x, hinted.y - real.y)).toBeLessThanOrEqual(10);
  }
  expect(art.head.scale).toBeCloseTo(manual.head.scale, 2);
}, SLOW);
