import type Phaser from 'phaser';
import type { Technique } from '../core/techniques';

/** Спрайты лежат в public/art (см. docs/art-brief.md). Нет набора — сцена рисует по-старому кодом. */
const BASE = `${import.meta.env.BASE_URL}art/`;

/** Бойцы, для которых уже есть нарисованные спрайты. */
export const ART_OPPONENTS: readonly string[] = ['boris', 'yos', 'brunette', 'olya', 'spb_friend', 'venya'];

/** Свой фон за соперником (имя файла в его папке); у остальных — общий подвал. */
export const OPPONENT_BG: Readonly<Record<string, string>> = { yos: 'bg_georgia_gym', brunette: 'bg_london', olya: 'bg_police', spb_friend: 'bg_neva', venya: 'bg_birch_park' };
export const opponentBgUrl = (id: string) => `${BASE}opponents/${id}/${OPPONENT_BG[id]}.png`;

export type HeadKey = 'calm' | 'strain' | 'telegraph' | 'tired' | 'lose' | 'win' | 'press';
export const HEAD_KEYS: readonly HeadKey[] = ['calm', 'strain', 'telegraph', 'tired', 'lose', 'win', 'press'];
export type ClaspPose = 'neutral' | Technique;

const SCENE = ['bg', 'table'] as const;
const ME = ['free_idle', 'free_grip'] as const;
const OPP = ['torso_motion', 'arm_free', 'cuff'] as const;
/** Новый адрес торса исключает старые PNG с культёй из браузерного кеша. */
const TORSO_REVISION = 'shoulder-2';

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
    load.image(joinedArmsKey(id), `${BASE}opponents/${id}/arms_motion.png`);
    for (const n of OPP) load.image(oppKey(id, n), `${BASE}opponents/${id}/${n}.png${n === 'torso_motion' ? `?v=${TORSO_REVISION}` : ''}`);
    for (const h of HEAD_KEYS) load.image(headKey(id, h), `${BASE}opponents/${id}/head_${h}.png`);
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
    ...OPP.map((n) => oppKey(id, n)),
    ...HEAD_KEYS.map((h) => headKey(id, h)),
  ];
  return keys.every((k) => scene.textures.exists(k));
}
