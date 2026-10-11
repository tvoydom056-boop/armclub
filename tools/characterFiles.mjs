import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { PNG } from 'pngjs';
import { requiredSprites, validCharacterId, validateCharacter } from './characterValidation.mjs';
import { suggestRig } from './characterHints.mjs';

/** Чтение спрайтов персонажа с диска для tools/characterValidation.mjs (кэш по времени и размеру файла). */
const cache = new Map();
export function loadCharacterSprites(root, id, art) {
  if (!validCharacterId(id)) throw new Error('Некорректный id персонажа');
  return Object.fromEntries(requiredSprites(art).map((name) => {
    const file = resolve(root, 'public/art/opponents', id, `${name}.png`);
    try {
      const stat = statSync(file), stamp = `${stat.mtimeMs}:${stat.size}`;
      if (cache.get(file)?.stamp === stamp) return [name, cache.get(file).image];
      const bytes = readFileSync(file);
      if (bytes.length < 24 || !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error('Не PNG');
      const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
      if (width > 8192 || height > 8192 || width * height > 32_000_000) throw new Error('PNG слишком большой (максимум 32 млн пикселей)');
      const image = PNG.sync.read(bytes);
      cache.set(file, { stamp, image });
      return [name, image];
    } catch (e) {
      return [name, { error: e.code === 'ENOENT' ? `Отсутствует ${name}.png` : `Не удалось прочитать ${name}.png: ${e.message}` }];
    }
  }));
}

/** Эталон — Боря (src/game/characters/boris.json) и его спрайты. */
function reference(root) {
  const referenceArt = JSON.parse(readFileSync(resolve(root, 'src/game/characters/boris.json'), 'utf8'));
  return { referenceArt, referenceSprites: loadCharacterSprites(root, 'boris', referenceArt) };
}

/** Проверка набора против эталона. */
export function checkCharacter(root, id, art) {
  return validateCharacter(art, loadCharacterSprites(root, id, art), reference(root));
}

/**
 * Подсказка рига по картинкам из public/art/opponents/<id>/ (tools/characterHints.mjs).
 * Фон — первый bg_*.png в папке. Возвращает { art, notes } или { error }.
 */
export function suggestCharacter(root, id) {
  if (!validCharacterId(id)) return { error: 'Некорректный id персонажа' };
  const dir = resolve(root, 'public/art/opponents', id);
  if (!existsSync(dir)) return { error: `Нет папки public/art/opponents/${id}/` };
  const result = suggestRig(loadCharacterSprites(root, id, {}), reference(root));
  if (result.error) return result;
  const files = readdirSync(dir);
  const bg = files.map((f) => /^(bg_[a-z0-9_]+)\.png$/.exec(f)?.[1]).find(Boolean);
  if (bg) result.art = { bg, ...result.art };
  if (files.includes('cuff.png')) result.notes.push('В папке есть cuff.png — включи накладку на стык рукава, если шов виден на листе поз');
  return result;
}
