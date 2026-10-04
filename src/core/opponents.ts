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
  /** Множитель расхода выносливости. */
  drain: number;
  reward: number;
  look: OpponentLook;
}

export const OPPONENTS: readonly OpponentDef[] = [
  {
    id: 'boris',
    name: 'Дядя Боря',
    nick: 'Гроза гаражей',
    desc: 'Двадцать лет жмёт одну и ту же технику. Просто и без затей.',
    power: 2.2,
    weights: { hook: 0.75, toproll: 0.15, press: 0.1 },
    reactiveness: 0.05,
    telegraph: 1.0,
    decision: [6, 9],
    surgeEvery: [10, 15],
    drain: 1,
    reward: 25,
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
    look: { skin: 0xefa858, skinShade: 0xcf883e, hair: 0x2e2018, shirt: 0xefa858, shirtShade: 0xcf883e,
      hairStyle: 'messy', facial: 'none', glasses: false, build: 1.15, belly: 0, accent: 0xffcf3a },
  },
  {
    id: 'max',
    name: 'Грузчик Макс',
    nick: 'Два мешка',
    desc: 'Носит холодильники на пятый этаж без лифта. Любит навалиться сверху.',
    power: 3.3,
    weights: { hook: 0.3, toproll: 0.15, press: 0.55 },
    reactiveness: 0.25,
    telegraph: 0.85,
    decision: [4, 6],
    surgeEvery: [7, 11],
    drain: 1.1,
    reward: 65,
    look: { skin: 0xd99a6c, skinShade: 0xb97a4c, hair: 0x1f1a17, shirt: 0xff8a1f, shirtShade: 0xd96d0c,
      hairStyle: 'cap', facial: 'beard', glasses: false, build: 1.2, belly: 0.3, accent: 0x2b2b2b },
  },
  {
    id: 'zina',
    name: 'Баба Зина',
    nick: 'Бабушка-бицепс',
    desc: 'Тридцать лет у плиты и огорода. Никогда не знаешь, что она выберет.',
    power: 3.7,
    weights: { hook: 0.34, toproll: 0.33, press: 0.33 },
    reactiveness: 0.65,
    telegraph: 0.75,
    decision: [3.2, 4.6],
    surgeEvery: [8, 12],
    drain: 1,
    reward: 95,
    look: { skin: 0xf3c6a2, skinShade: 0xd9a37c, hair: 0xd8dde3, shirt: 0xd9486a, shirtShade: 0xb03352,
      hairStyle: 'bun', facial: 'none', glasses: true, build: 0.95, belly: 0.4, accent: 0xffd66b },
  },
  {
    id: 'leha',
    name: 'Сантехник Лёха',
    nick: 'Босс подвала',
    desc: 'Чинит трубы одной рукой, а другой — чемпионов. Читает тебя как инструкцию.',
    boss: true,
    power: 4.0,
    weights: { hook: 0.34, toproll: 0.33, press: 0.33 },
    reactiveness: 0.75,
    telegraph: 0.62,
    decision: [3, 4.5],
    surgeEvery: [6, 9],
    drain: 0.9,
    reward: 220,
    look: { skin: 0xe6a07a, skinShade: 0xc27d56, hair: 0x3a2417, shirt: 0x2f6fd0, shirtShade: 0x2455a3,
      hairStyle: 'bandana', facial: 'mustache', glasses: false, build: 1.25, belly: 0.5, accent: 0xe8344a },
  },
];

export const opponentById = (id: string): OpponentDef => OPPONENTS.find((o) => o.id === id) ?? OPPONENTS[0];
