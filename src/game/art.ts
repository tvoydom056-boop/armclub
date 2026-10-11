import type Phaser from 'phaser';
import type { Technique } from '../core/techniques';
import { CHARACTERS } from './characters';
export { HEAD_KEYS } from './characterSpec.mjs';
import { HEAD_KEYS } from './characterSpec.mjs';

/** Спрайты лежат в public/art (см. docs/adding-opponent.md). Нет набора — сцена рисует по-старому кодом. */
const BASE = `${import.meta.env.BASE_URL}art/`;

/** Бойцы, для которых уже есть нарисованные спрайты: у кого есть манифест в src/game/characters. */
const ART_OPPONENTS: readonly string[] = Object.keys(CHARACTERS);

/** Свой фон за соперником (имя файла в его папке); у остальных — общий подвал. */
export const OPPONENT_BG: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(CHARACTERS).flatMap(([id, art]) => (art.bg ? [[id, art.bg]] : [])),
);
export const opponentBgUrl = (id: string) => opponentArtUrl(id, OPPONENT_BG[id]);

export type HeadKey = 'calm' | 'strain' | 'telegraph' | 'tired' | 'lose' | 'win' | 'press';
export type ClaspPose = 'neutral' | Technique;

const SCENE = ['bg', 'table'] as const;
const ME = ['free_idle', 'free_grip'] as const;
const OPP = ['torso_motion', 'arm_free', 'cuff'] as const;
/** cuff нужен только тем, у кого он есть в манифесте. */
const oppParts = (id: string) => OPP.filter((n) => n !== 'cuff' || CHARACTERS[id]?.cuff);
/** Новый адрес торса исключает старые PNG с культёй из браузерного кеша. */
const TORSO_REVISION = 'shoulder-2';
/** Обновляем весь набор Виталика вместе: головы, руки, торс и фон не смешиваются со старым кешем. */
const CHARACTER_REVISIONS: Readonly<Record<string, string>> = { vitalik: 'vitalik-2' };

/** Один адрес спрайта для сцены боя и портретов в интерфейсе. */
export function opponentArtUrl(id: string, part: string): string {
  const revision = CHARACTER_REVISIONS[id] ?? (part === 'torso_motion' ? TORSO_REVISION : undefined);
  return `${BASE}opponents/${id}/${part}.png${revision ? `?v=${revision}` : ''}`;
}

export const sceneKey = (n: (typeof SCENE)[number]) => `art:scene/${n}`;
export const meKey = (n: (typeof ME)[number]) => `art:me/${n}`;
export const joinedArmsKey = (id: string) => `art:opponents/${id}/arms_motion`;
export const oppKey = (id: string, n: (typeof OPP)[number]) => `art:opponents/${id}/${n}`;
export const headKey = (id: string, h: HeadKey) => `art:opponents/${id}/head_${h}`;
export const backgroundKey = (id: string) => OPPONENT_BG[id] ? `art:opponents/${id}/${OPPONENT_BG[id]}` : sceneKey('bg');

/** Ставит в очередь загрузки все файлы набора; отсутствующие просто не загрузятся. */
export function queueArt(load: Phaser.Loader.LoaderPlugin): void {
  for (const n of SCENE) load.image(sceneKey(n), `${BASE}scene/${n}.png`);
  for (const n of ME) load.image(meKey(n), `${BASE}me/${n}.png`);
  for (const id of ART_OPPONENTS) {
    if (OPPONENT_BG[id]) load.image(backgroundKey(id), opponentBgUrl(id));
    load.image(joinedArmsKey(id), opponentArtUrl(id, 'arms_motion'));
    for (const n of oppParts(id)) load.image(oppKey(id, n), opponentArtUrl(id, n));
    for (const h of HEAD_KEYS) load.image(headKey(id, h), opponentArtUrl(id, `head_${h}`));
  }
}

/** Все нужные для боя с этим соперником картинки загружены. */
export function hasOppArt(scene: Phaser.Scene, id: string): boolean {
  if (!ART_OPPONENTS.includes(id)) return false;
  const keys = [
    backgroundKey(id),
    ...SCENE.map(sceneKey),
    ...ME.map(meKey),
    joinedArmsKey(id),
    ...oppParts(id).map((n) => oppKey(id, n)),
    ...HEAD_KEYS.map((h) => headKey(id, h)),
  ];
  return keys.every((k) => scene.textures.exists(k));
}
