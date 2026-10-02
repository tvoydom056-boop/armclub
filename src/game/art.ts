import type Phaser from 'phaser';
import type { Technique } from '../core/techniques';

/** Спрайты лежат в public/art (см. docs/art-brief.md). Нет набора — сцена рисует по-старому кодом. */
const BASE = `${import.meta.env.BASE_URL}art/`;

/** Бойцы, для которых уже есть нарисованные спрайты. */
export const ART_OPPONENTS: readonly string[] = ['boris'];

export type HeadKey = 'calm' | 'strain' | 'telegraph' | 'tired' | 'lose' | 'win' | 'press';
export const HEAD_KEYS: readonly HeadKey[] = ['calm', 'strain', 'telegraph', 'tired', 'lose', 'win', 'press'];
export type ClaspPose = 'neutral' | Technique;

const SCENE = ['bg', 'table', 'pad_opp', 'pad_me', 'pin_opp', 'pin_me'] as const;
const ME = ['free_idle', 'free_grip'] as const;
const OPP = ['torso_motion', 'arm_free'] as const;

export const sceneKey = (n: (typeof SCENE)[number]) => `art:scene/${n}`;
export const meKey = (n: (typeof ME)[number]) => `art:me/${n}`;
export const joinedArmsKey = (id: string) => `art:opponents/${id}/arms_motion`;
export const oppKey = (id: string, n: (typeof OPP)[number]) => `art:opponents/${id}/${n}`;
export const headKey = (id: string, h: HeadKey) => `art:opponents/${id}/head_${h}`;

/** Ставит в очередь загрузки все файлы набора; отсутствующие просто не загрузятся. */
export function queueArt(load: Phaser.Loader.LoaderPlugin): void {
  for (const n of SCENE) load.image(sceneKey(n), `${BASE}scene/${n}.png`);
  for (const n of ME) load.image(meKey(n), `${BASE}me/${n}.png`);
  for (const id of ART_OPPONENTS) {
    load.image(joinedArmsKey(id), `${BASE}opponents/${id}/arms_motion.png`);
    for (const n of OPP) load.image(oppKey(id, n), `${BASE}opponents/${id}/${n}.png`);
    for (const h of HEAD_KEYS) load.image(headKey(id, h), `${BASE}opponents/${id}/head_${h}.png`);
  }
}

/** Все нужные для боя с этим соперником картинки загружены. */
export function hasOppArt(scene: Phaser.Scene, id: string): boolean {
  if (!ART_OPPONENTS.includes(id)) return false;
  const keys = [
    ...SCENE.map(sceneKey),
    ...ME.map(meKey),
    joinedArmsKey(id),
    ...OPP.map((n) => oppKey(id, n)),
    ...HEAD_KEYS.map((h) => headKey(id, h)),
  ];
  return keys.every((k) => scene.textures.exists(k));
}
