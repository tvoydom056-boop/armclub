import type { ExerciseDef, GameKind, Grade, ItemId } from '../core/training';
import manifest from './trainingArt.json';

/**
 * Спрайты тренировок (docs/training-art-prompt.md). Список готовых файлов собирает
 * node tools/importTrainingArt.mjs; чего в списке нет, интерфейс рисует заглушкой.
 */
const BASE = `${import.meta.env.BASE_URL}art/training/`;
const HAVE: ReadonlySet<string> = new Set(manifest.files);

const art = (path: string): string | null => (HAVE.has(path) ? BASE + path : null);

export type MapArt = 'home' | 'shop' | 'gym' | 'bar' | 'chain' | 'shutter' | 'player' | 'star' | 'steam' | 'sign';
export type SceneArt = 'map_base' | 'room_home' | 'room_gym' | 'room_shop' | 'run_street' | 'shopkeeper' | 'shopkeeper_happy' | 'shopkeeper_doubt' | 'dog' | 'weight_stack';
export const mapArt = (name: MapArt) => art(`map/${name}.png`);
export const sceneArt = (name: SceneArt) => art(`${name}.png`);

export const itemArt = (id: ItemId | 'gym_card') => art(`items/${id}.png`);
export const stampArt = (name: Grade | 'level') => art(`stamps/${name}.png`);
export type FxName = 'sweat' | 'dust' | 'motion' | 'impact' | 'steam' | 'sparks';
export const fxArt = (name: FxName) => art(`fx/${name}.png`);

/** Резервная пара механики для неизвестного ID; собственная пара всегда имеет приоритет. */
const SHARED_FRAMES: Record<GameKind, string> = { pull: 'cone', squeeze: 'gripper', spin: 'roller', burst: 'medball' };

/** Кадры мини-игры «покой» и «пик»: свои у упражнения, иначе общие для механики; null — нарисовать нечем. */
export function gameFrames(ex: ExerciseDef): { rest: string; peak: string } | null {
  for (const id of [ex.id, SHARED_FRAMES[ex.game]]) {
    const rest = art(`games/${id}_rest.png`), peak = art(`games/${id}_peak.png`);
    if (rest && peak) return { rest, peak };
  }
  return null;
}
