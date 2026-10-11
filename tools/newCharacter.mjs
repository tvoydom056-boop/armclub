import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { checkCharacter, loadCharacterSprites, suggestCharacter } from './characterFiles.mjs';
import { requiredSprites, validCharacterId } from './characterValidation.mjs';

/**
 * Заготовка нового бойца: npm run new:character -- <id> [--force]
 * 1. Создаёт public/art/opponents/<id>/ и проверяет, что там все спрайты (docs/sprite-spec.md).
 * 2. Пишет src/game/characters/<id>.json с точками, подсказанными по картинкам (tools/characterHints.mjs), —
 *    не копию соседа. С ошибками проверки набора не пишет: иначе упадёт tools/characters.test.mjs.
 * 3. Печатает заготовку OpponentDef для src/core/opponents.ts — баланс и место в составе решает человек.
 */
const ROOT = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith('--'));
const force = args.includes('--force');
const fail = (message) => {
  console.error(message);
  process.exit(1);
};

if (!id || !validCharacterId(id)) fail('Использование: npm run new:character -- <id> [--force], id — латиница, цифры и _ (например spb_friend)');
const dir = resolve(ROOT, 'public/art/opponents', id);
const manifest = resolve(ROOT, 'src/game/characters', `${id}.json`);
if (existsSync(manifest) && !force) fail(`Манифест уже есть: src/game/characters/${id}.json. Подгонка — в ?rig=${id}; перезаписать подсказкой — --force`);

if (!existsSync(dir)) {
  mkdirSync(dir, { recursive: true });
  console.log(`Создана папка public/art/opponents/${id}/`);
}
const sprites = loadCharacterSprites(ROOT, id, {});
const missing = requiredSprites({}).filter((name) => sprites[name].error);
if (missing.length) {
  fail(`Не хватает спрайтов в public/art/opponents/${id}/:\n${missing.map((n) => `  - ${sprites[n].error}`).join('\n')}\nКак рисовать — docs/sprite-spec.md. Положи файлы и запусти снова.`);
}

const hint = suggestCharacter(ROOT, id);
if (hint.error) fail(hint.error);
const { errors, warnings } = checkCharacter(ROOT, id, hint.art);
for (const n of hint.notes) console.log(`· ${n}`);
for (const w of warnings) console.warn(`! ${w.path}: ${w.message}`);
if (errors.length) fail(`Манифест не записан — ошибки набора:\n${errors.map((e) => `  ✗ ${e.path}: ${e.message}`).join('\n')}`);
writeFileSync(manifest, JSON.stringify(hint.art, null, 2) + '\n');
console.log(`\nЗаписан src/game/characters/${id}.json`);

const name = id.toUpperCase();
console.log(`
Дальше:
1. npm run dev → http://localhost:5173/?rig=${id} — сверь с полупрозрачным Борей, подгони, «Сохранить».
2. http://localhost:5173/?sheet=${id} — лист поз.
3. В src/core/opponents.ts — заготовка бойца (числа взяты у Левы, поменяй), затем добавь ${name} в ROSTERS[2] и EASY:

const ${name}: OpponentDef = {
  id: '${id}',
  name: 'Имя',
  nick: 'Прозвище',
  desc: 'Пара фраз для карточки в хабе.',
  power: 2.6,
  weights: { hook: 0.4, toproll: 0.3, press: 0.3 },
  reactiveness: 0.2,
  telegraph: 0.95,
  decision: [5, 7.5],
  surgeEvery: [9, 13],
  drain: 1,
  reward: 40,
  voice: 90,
  look: { skin: 0xd09a6a, skinShade: 0xb07a4c, hair: 0x2a1d16, shirt: 0x3a3a40, shirtShade: 0x26262b,
    hairStyle: 'messy', facial: 'none', glasses: false, build: 1.1, belly: 0, accent: 0x1c1c1f },
};
`);
