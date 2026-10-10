export type Technique = 'hook' | 'toproll' | 'press';

export const TECHNIQUES: readonly Technique[] = ['hook', 'toproll', 'press'];

interface TechniqueInfo {
  name: string;
  /** Одна строка: чем техника хороша. */
  hint: string;
  key: string;
  color: string;
  icon: string;
}

export const TECH_INFO: Record<Technique, TechniqueInfo> = {
  hook: { name: 'Крюк', hint: 'Запястье и бицепс. Тянет руку соперника на себя.', key: '1', color: '#ff7a1a', icon: '🪝' },
  toproll: { name: 'Топролл', hint: 'Пальцы и пронация. Побеждает рычагом, а не силой.', key: '2', color: '#2fa8ff', icon: '🌀' },
  press: { name: 'Пресс', hint: 'Трицепс и плечо. Добивает, когда ты уже впереди.', key: '3', color: '#e8344a', icon: '🔨' },
};

/**
 * Игровая абстракция «камень-ножницы-бумага» (не строгая физика борьбы):
 *  - топролл бьёт крюк: рычаг сильнее голой силы;
 *  - крюк бьёт пресс: тяга на себя не даёт навалиться плечом;
 *  - пресс бьёт топролл: навал сверху ломает дугу прокрута.
 * Ключ бьёт значение.
 */
export const BEATS: Record<Technique, Technique> = { toproll: 'hook', hook: 'press', press: 'toproll' };

/** Какая техника бьёт указанную. */
export const COUNTER: Record<Technique, Technique> = { hook: 'toproll', press: 'hook', toproll: 'press' };

/** +1 — a бьёт b, −1 — b бьёт a, 0 — одинаковые. */
export function matchup(a: Technique, b: Technique): -1 | 0 | 1 {
  if (a === b) return 0;
  return BEATS[a] === b ? 1 : -1;
}
