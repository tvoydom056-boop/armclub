import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { HEAD_KEYS } from '../src/game/art.ts';
import { CHARACTERS, TEMPLATE } from '../src/game/characters.ts';

/**
 * Проверка набора каждого нарисованного персонажа (src/game/characters/<id>.json + public/art/opponents/<id>/):
 * все файлы на месте, размеры совпадают с шаблонами, точки манифеста лежат внутри картинок.
 * Порядок добавления персонажа — docs/adding-opponent.md.
 */
const ART = resolve(import.meta.dirname, '../public/art/opponents');

/** Ширина и высота PNG из заголовка IHDR. */
function pngSize(file) {
  const b = readFileSync(file);
  return { x: b.readUInt32BE(16), y: b.readUInt32BE(20) };
}

const sameAspect = (size, tpl) => Math.abs(size.x / size.y - tpl.x / tpl.y) < 0.015;
const inside = (p, tpl) => p.x >= 0 && p.y >= 0 && p.x <= tpl.x && p.y <= tpl.y;

describe.each(Object.entries(CHARACTERS))('персонаж %s', (id, art) => {
  const file = (name) => resolve(ART, id, `${name}.png`);

  it('все спрайты на месте', () => {
    const names = ['torso_motion', 'arm_free', 'arms_motion', ...HEAD_KEYS.map((h) => `head_${h}`)];
    if (art.cuff) names.push('cuff');
    if (art.bg) names.push(art.bg);
    expect(names.filter((n) => !existsSync(file(n)))).toEqual([]);
  });

  it('размеры по шаблонам', () => {
    // лист рук режется на сетку 3×3 по точкам ARM_POSES — только точный размер
    expect(pngSize(file('arms_motion'))).toEqual(TEMPLATE.armsMotion);
    expect(sameAspect(pngSize(file('torso_motion')), TEMPLATE.torso)).toBe(true);
    expect(sameAspect(pngSize(file('arm_free')), TEMPLATE.armFree)).toBe(true);
    if (art.cuff) expect(sameAspect(pngSize(file('cuff')), TEMPLATE.cuff)).toBe(true);
    // разрешение лиц может отличаться (сцена приводит каждое к шаблону 600×700), пропорции — нет
    const bad = HEAD_KEYS.filter((h) => !sameAspect(pngSize(file(`head_${h}`)), TEMPLATE.head));
    expect(bad).toEqual([]);
  });

  it('манифест: масштабы и точки', () => {
    for (const s of [art.torso.scale, art.head.scale, art.arms.scale, art.freeArm.scale]) expect(s).toBeGreaterThan(0);
    for (const p of [art.torso.shoulder, art.torso.neck, art.torso.freeShoulder]) expect(inside(p, TEMPLATE.torso)).toBe(true);
    expect(inside(art.head.neck, TEMPLATE.head)).toBe(true);
    expect(Number.isFinite(art.arms.drop + art.arms.sag.angle + art.arms.sag.drop)).toBe(true);
  });
});
