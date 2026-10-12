import type { Technique } from './techniques';

/** Данные для отрисовки соперника (цвета — hex-числа Phaser). */
export interface OpponentLook {
  skin: number;
  skinShade: number;
  hair: number;
  shirt: number;
  shirtShade: number;
  hairStyle: 'bald' | 'messy' | 'cap' | 'bun' | 'bandana';
  facial: 'none' | 'mustache' | 'beard';
  glasses: boolean;
  /** Ширина плеч относительно базовой. */
  build: number;
  /** Живот: 0 — нет, 1 — выпирает. */
  belly: number;
  /** Цвет кепки / банданы. */
  accent: number;
}

/**
 * Фирменный приём: боец выдыхается — окно слабости с предупреждением. Что его запускает:
 * `hold` — долгое удержание одной техники, `surges` — серия рывков подряд.
 */
export type OpponentPattern = {
  /** За сколько секунд до паузы это видно (лицо, звук, плашка). */
  warn: number;
  /** Длительность паузы, в которой он давит вполсилы. */
  rest: readonly [number, number];
} & (
  | { kind: 'hold'; holdTech: Technique; /** Секунд подряд до паузы. */ holdFor: number }
  | { kind: 'surges'; /** Сколько рывков подряд, прежде чем он выдохнется. */ count: number }
);

export interface OpponentDef {
  id: string;
  name: string;
  nick: string;
  desc: string;
  boss?: boolean;
  /** Базовая сила. У игрока на старте при ~6.5 кликах/с это около 2.7. */
  power: number;
  /** Насколько охотно выбирает ту или иную технику. */
  weights: Record<Technique, number>;
  /** Шанс, что вместо любимой техники он выберет ту, что бьёт твою текущую. */
  reactiveness: number;
  /** За сколько секунд до смены техники это видно по лицу. */
  telegraph: number;
  /** Сколько секунд держит технику, прежде чем решить, менять ли её. */
  decision: readonly [number, number];
  /** Интервал рывков в секундах; null — без рывков. */
  surgeEvery: readonly [number, number] | null;
  /** Фирменный приём; без него у бойца нет предсказуемого окна слабости. */
  pattern?: OpponentPattern;
  /** Множитель расхода выносливости. */
  drain: number;
  reward: number;
  /** Основной тон голоса (рык, пыхтение, стон), Гц. */
  voice: number;
  look: OpponentLook;
}

export const OPPONENTS: readonly OpponentDef[] = [
  {
    id: 'boris',
    name: 'Дядя Боря',
    nick: 'Гроза гаражей',
    desc: 'Работает в гараже Хай хукерс, в Канаде. В свои 51 , все такой же молоток.',
    power: 2.2,
    weights: { hook: 0.75, toproll: 0.15, press: 0.1 },
    reactiveness: 0.05,
    telegraph: 1.0,
    decision: [6, 9],
    surgeEvery: [10, 15],
    pattern: { kind: 'hold', holdTech: 'hook', holdFor: 10, warn: 0.7, rest: [1.0, 1.4] },
    drain: 1,
    reward: 25,
    voice: 78,
    look: { skin: 0xf0b48a, skinShade: 0xd99468, hair: 0x5a3b26, shirt: 0xe9eef2, shirtShade: 0xc6d0d8,
      hairStyle: 'bald', facial: 'mustache', glasses: false, build: 1.0, belly: 1, accent: 0x3b82c4 },
  },
  {
    id: 'yos',
    name: 'Йос',
    nick: 'Волосатая мощь',
    desc: 'Мышцы наготове, улыбка на месте. Хитрый топролл идёт в комплекте.',
    power: 2.7,
    weights: { hook: 0.2, toproll: 0.65, press: 0.15 },
    reactiveness: 0.2,
    telegraph: 0.9,
    decision: [4.5, 6.5],
    surgeEvery: [9, 13],
    drain: 1,
    reward: 40,
    voice: 100,
    look: { skin: 0xefa858, skinShade: 0xcf883e, hair: 0x2e2018, shirt: 0xefa858, shirtShade: 0xcf883e,
      hairStyle: 'messy', facial: 'none', glasses: false, build: 1.15, belly: 0, accent: 0xffcf3a },
  },
  {
    id: 'brunette',
    name: 'Подруга',
    nick: 'Англичанка из Лондона',
    desc: 'Чай в пять, победа — по расписанию. Безупречные манеры и хитрый топролл.',
    power: 3.1,
    weights: { hook: 0.25, toproll: 0.55, press: 0.2 },
    reactiveness: 0.35,
    telegraph: 0.85,
    decision: [4, 6],
    surgeEvery: [8, 12],
    drain: 1,
    reward: 55,
    voice: 195,
    look: { skin: 0xf0b48a, skinShade: 0xd99468, hair: 0x4a2c20, shirt: 0xf0e5cd, shirtShade: 0xc9b99c,
      hairStyle: 'messy', facial: 'none', glasses: false, build: 0.95, belly: 0, accent: 0xb63c42 },
  },
  {
    id: 'olya',
    name: 'Оля',
    nick: 'Подруга полицейского',
    desc: 'Дежурит с котами и попугаем. Крюк держит крепко — права зачитает потом.',
    power: 3.2,
    weights: { hook: 0.55, toproll: 0.2, press: 0.25 },
    reactiveness: 0.4,
    telegraph: 0.85,
    decision: [4, 6],
    surgeEvery: [7, 11],
    drain: 1,
    reward: 60,
    voice: 205,
    look: { skin: 0xf0b48a, skinShade: 0xd99468, hair: 0x4a2c20, shirt: 0x1f2a4d, shirtShade: 0x141c36,
      hairStyle: 'messy', facial: 'none', glasses: false, build: 0.95, belly: 0, accent: 0xe8c04a },
  },
  {
    id: 'spb_friend',
    name: 'Аня',
    nick: 'Питерская подруга',
    desc: 'Из Питера, где мосты разводят. Давит прессом — и тебя разведёт.',
    power: 3.25,
    weights: { hook: 0.3, toproll: 0.25, press: 0.45 },
    reactiveness: 0.45,
    telegraph: 0.85,
    decision: [4, 6],
    surgeEvery: [7, 11],
    drain: 1,
    reward: 62,
    voice: 190,
    look: { skin: 0xf0b48a, skinShade: 0xd99468, hair: 0xd9b36c, shirt: 0x1c1c1f, shirtShade: 0x101012,
      hairStyle: 'messy', facial: 'none', glasses: false, build: 1.0, belly: 0, accent: 0xd9a441 },
  },
  {
    id: 'venya',
    name: 'Веня',
    nick: 'Пушистый финальный босс',
    desc: 'Три кило пуха и ноль жалости. Хозяин подвала: кто проиграл — чешет ему пузо.',
    boss: true,
    // сила ниже прежней, но босс играет умно (см. bossPick в match.ts) — в итоге самый трудный
    power: 3.3,
    weights: { hook: 0.3, toproll: 0.3, press: 0.4 },
    reactiveness: 0.8,
    telegraph: 0.62,
    decision: [3, 4.2],
    surgeEvery: [6, 9],
    drain: 0.9,
    reward: 300,
    voice: 165,
    look: { skin: 0xffb447, skinShade: 0xd78328, hair: 0xf69c27, shirt: 0xffe2a3, shirtShade: 0xe7ba72,
      hairStyle: 'messy', facial: 'none', glasses: false, build: 1.3, belly: 0.3, accent: 0x23d8d0 },
  },
];

/** Бойцы только второй версии состава: в карьеру первой не входят. */
const LEVA: OpponentDef = {
  id: 'leva',
  name: 'Лева',
  nick: 'Борода-тяжеловес',
  desc: 'Тяжеловес в жёлтой майке. Говорит мало, давит много — пресс у него как гидравлика.',
  power: 2.6,
  weights: { hook: 0.3, toproll: 0.1, press: 0.6 },
  reactiveness: 0.15,
  telegraph: 0.95,
  decision: [5, 7.5],
  surgeEvery: [9, 13],
  drain: 1,
  reward: 40,
  voice: 82,
  look: { skin: 0xd09a6a, skinShade: 0xb07a4c, hair: 0x2a1d16, shirt: 0xf2c230, shirtShade: 0xc99a1c,
    hairStyle: 'messy', facial: 'beard', glasses: false, build: 1.3, belly: 0.3, accent: 0x1c1c1f },
};
const DENCH: OpponentDef = {
  id: 'dench',
  name: 'Дэнч',
  nick: 'Чёрная майка',
  desc: 'Майка без рукавов, чтобы руки дышали. Крутит топролл, пока у тебя не разожмутся пальцы.',
  power: 2.9,
  weights: { hook: 0.2, toproll: 0.6, press: 0.2 },
  reactiveness: 0.3,
  telegraph: 0.9,
  decision: [4.5, 6.5],
  surgeEvery: [3.5, 5],
  pattern: { kind: 'surges', count: 2, warn: 0.7, rest: [1.6, 2.2] },
  drain: 1,
  reward: 50,
  voice: 105,
  look: { skin: 0xf0b48a, skinShade: 0xd99468, hair: 0x2e2018, shirt: 0x1c1c1f, shirtShade: 0x101012,
    hairStyle: 'messy', facial: 'none', glasses: false, build: 1.15, belly: 0, accent: 0xb63c42 },
};
const VITALIK: OpponentDef = {
  id: 'vitalik',
  name: 'Виталик',
  nick: 'Борода из качалки',
  desc: 'Живёт в качалке, борода растёт быстрее рекордов. Его крюк не разогнуть.',
  power: 3.1,
  weights: { hook: 0.55, toproll: 0.2, press: 0.25 },
  reactiveness: 0.4,
  telegraph: 0.85,
  decision: [4, 6],
  surgeEvery: [7, 11],
  drain: 1,
  reward: 60,
  voice: 92,
  look: { skin: 0xf0b48a, skinShade: 0xd99468, hair: 0x2a1d16, shirt: 0x1c1c1f, shirtShade: 0x101012,
    hairStyle: 'messy', facial: 'beard', glasses: false, build: 1.2, belly: 0, accent: 0x3b82c4 },
};
const ILYA: OpponentDef = {
  id: 'ilya',
  name: 'Илья',
  nick: 'Молодой атлет',
  desc: 'Свежий, быстрый и без слабых мест. Читает твою технику и сразу отвечает.',
  power: 3.25,
  weights: { hook: 0.3, toproll: 0.35, press: 0.35 },
  reactiveness: 0.5,
  telegraph: 0.8,
  decision: [3.5, 5.5],
  surgeEvery: [7, 10],
  drain: 1,
  reward: 70,
  voice: 118,
  look: { skin: 0xf0b48a, skinShade: 0xd99468, hair: 0x8a6a45, shirt: 0x1c1c1f, shirtShade: 0x101012,
    hairStyle: 'messy', facial: 'none', glasses: false, build: 1.1, belly: 0, accent: 0x9aa3ad },
};
const ERMES: OpponentDef = {
  id: 'ermes',
  name: 'Ермес',
  nick: 'Бритые виски',
  desc: 'Щетина, чёрная футболка и тяжёлые предплечья. Меняет хват, пока ты думаешь.',
  power: 3.4,
  weights: { hook: 0.4, toproll: 0.4, press: 0.2 },
  reactiveness: 0.55,
  telegraph: 0.75,
  decision: [3.5, 5],
  surgeEvery: [6, 9],
  drain: 1,
  reward: 80,
  voice: 96,
  look: { skin: 0xf0b48a, skinShade: 0xd99468, hair: 0x2a1d16, shirt: 0x1c1c1f, shirtShade: 0x101012,
    hairStyle: 'messy', facial: 'beard', glasses: false, build: 1.2, belly: 0, accent: 0x9aa3ad },
};

/** Во сколько раз бойцы версии 2 сильнее, чем в версии 1. */
export const V2_POWER = 1.5;
const harder = (o: OpponentDef): OpponentDef => ({ ...o, power: o.power * V2_POWER });

/** Состав боёв по версии игры; порядок — порядок открытия. */
export const ROSTERS: Readonly<Record<1 | 2, readonly OpponentDef[]>> = {
  1: OPPONENTS,
  2: [OPPONENTS[0], LEVA, DENCH, VITALIK, ILYA, ERMES].map(harder),
};
const EASY = [...OPPONENTS, LEVA, DENCH, VITALIK, ILYA, ERMES];

export const opponentById = (id: string, version: 1 | 2 = 1): OpponentDef =>
  ROSTERS[version].find((o) => o.id === id) ?? EASY.find((o) => o.id === id) ?? OPPONENTS[0];
