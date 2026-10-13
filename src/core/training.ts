import { upgradeById, type Levels, type UpgradeDef, type UpgradeId } from './upgrades';

/** Клубная карта качалки: покупается один раз. */
export const GYM_MEMBERSHIP = 100;

export type PlaceId = 'home' | 'gym';

export const PLACES: Record<PlaceId, { name: string; tier: number }> = {
  home: { name: 'Дом', tier: 0.7 },
  gym: { name: 'Качалка «Железо»', tier: 1 },
};

export type ItemId =
  | 'jump_rope' | 'gripper' | 'strap' | 'tricep_rope' | 'fat_grip' | 'roller' | 'medball'
  | 'cone' | 'gripper_pro' | 'eccentric' | 'triple' | 'multispin';

export interface ItemDef {
  id: ItemId;
  name: string;
  desc: string;
  price: number;
}

export const ITEMS: readonly ItemDef[] = [
  { id: 'jump_rope', name: 'Скакалка', price: 30, desc: 'Дыхалка и быстрые ноги — пригодится на старте.' },
  { id: 'gripper', name: 'Кистевой эспандер', price: 40, desc: 'Пружинный, для дома. Хват растёт сам собой.' },
  { id: 'strap', name: 'Ремень-петля', price: 60, desc: 'Петля на кисть: дома с гантелью, в зале на блоке. Бицепс и запястье.' },
  { id: 'tricep_rope', name: 'Канат для трицепса', price: 90, desc: 'Вешается на блок. Трицепс для пресса.' },
  { id: 'fat_grip', name: 'Толстая ручка', price: 100, desc: 'Толстый гриф раскрывает кисть — хват и пальцы.' },
  { id: 'roller', name: 'Ролик-рукоять', price: 120, desc: 'Крутится в руке: пальцы и пронация для топролла.' },
  { id: 'medball', name: 'Медбол', price: 140, desc: 'Бросай от груди — взрывной старт.' },
  { id: 'cone', name: 'Коническая ручка', price: 150, desc: 'Узкий верх, широкий низ — бицепс работает на крюк по полной.' },
  { id: 'gripper_pro', name: 'Эспандер «Капитан»', price: 220, desc: 'Жёсткая пружина. Хват растёт в полтора раза быстрее.' },
  { id: 'eccentric', name: 'Эксцентрик-ручка', price: 250, desc: 'Смещённая ось тянет кисть назад: каппинг и пальцы.' },
  { id: 'triple', name: 'Ручка с тремя отверстиями', price: 300, desc: 'Боковое давление: плечо и трицепс.' },
  { id: 'multispin', name: 'Мультиспин', price: 400, desc: 'Вращается во все стороны: пронация и запястье под любым углом.' },
];

export const itemById = (id: ItemId): ItemDef => ITEMS.find((i) => i.id === id)!;

/** Механика мини-игры на 10 секунд. */
export type GameKind = 'pull' | 'spin' | 'squeeze' | 'burst';

export interface ExerciseDef {
  id: string;
  name: string;
  /** Без этого предмета упражнение недоступно. */
  item?: ItemId;
  primary: UpgradeId;
  /** Побочный стат получает половину опыта. */
  secondary?: UpgradeId;
  game: GameKind;
  /** Тир снаряда: чем лучше снаряд, тем больше опыта за подход. */
  tier: number;
  place: PlaceId;
}

export const EXERCISES: readonly ExerciseDef[] = [
  // Бесплатное: дома тупика нет, в зале — то, что стоит там и так.
  { id: 'pushups', name: 'Отжимания', primary: 'triceps', game: 'pull', tier: 0.8, place: 'home' },
  { id: 'run', name: 'Пробежка', primary: 'stamina', game: 'burst', tier: 0.8, place: 'home' },
  { id: 'straight_bar', name: 'Блок: прямая рукоять', primary: 'triceps', game: 'pull', tier: 1, place: 'gym' },
  { id: 'dips', name: 'Брусья', primary: 'triceps', secondary: 'shoulder', game: 'pull', tier: 1, place: 'gym' },
  // Снаряды для дома.
  { id: 'jump_rope', name: 'Скакалка', item: 'jump_rope', primary: 'stamina', secondary: 'explosive', game: 'burst', tier: 1, place: 'home' },
  { id: 'gripper', name: 'Эспандер', item: 'gripper', primary: 'grip', game: 'squeeze', tier: 1, place: 'home' },
  { id: 'gripper_pro', name: 'Эспандер «Капитан»', item: 'gripper_pro', primary: 'grip', game: 'squeeze', tier: 1.5, place: 'home' },
  { id: 'strap_dumbbell', name: 'Ремень с гантелью', item: 'strap', primary: 'biceps', secondary: 'wrist', game: 'pull', tier: 1, place: 'home' },
  { id: 'medball', name: 'Броски медбола', item: 'medball', primary: 'explosive', game: 'burst', tier: 1, place: 'home' },
  // Ручки на блок — только в зале.
  { id: 'strap_block', name: 'Блок: ремень', item: 'strap', primary: 'biceps', secondary: 'wrist', game: 'pull', tier: 1, place: 'gym' },
  { id: 'tricep_rope', name: 'Блок: канат', item: 'tricep_rope', primary: 'triceps', game: 'pull', tier: 1.25, place: 'gym' },
  { id: 'fat_grip', name: 'Блок: толстая ручка', item: 'fat_grip', primary: 'grip', secondary: 'fingers', game: 'squeeze', tier: 1, place: 'gym' },
  { id: 'roller', name: 'Блок: ролик', item: 'roller', primary: 'fingers', secondary: 'pronation', game: 'spin', tier: 1, place: 'gym' },
  { id: 'cone', name: 'Блок: коническая ручка', item: 'cone', primary: 'biceps', game: 'pull', tier: 1.5, place: 'gym' },
  { id: 'eccentric', name: 'Блок: эксцентрик', item: 'eccentric', primary: 'wrist', secondary: 'fingers', game: 'spin', tier: 1.25, place: 'gym' },
  { id: 'triple', name: 'Блок: три отверстия', item: 'triple', primary: 'shoulder', secondary: 'triceps', game: 'pull', tier: 1.25, place: 'gym' },
  { id: 'multispin', name: 'Блок: мультиспин', item: 'multispin', primary: 'pronation', secondary: 'wrist', game: 'spin', tier: 1.5, place: 'gym' },
];

export const exerciseById = (id: string): ExerciseDef | undefined => EXERCISES.find((e) => e.id === id);

/** Можно ли сделать упражнение: нужный снаряд куплен, а для зала есть клубная карта. */
export const canDo = (ex: ExerciseDef, owned: readonly ItemId[], gym: boolean): boolean =>
  (!ex.item || owned.includes(ex.item)) && (ex.place === 'home' || gym);

export type Grade = 'weak' | 'ok' | 'great';

export const GRADES: Record<Grade, { name: string; mult: number }> = {
  weak: { name: 'Слабо', mult: 0.6 },
  ok: { name: 'Норм', mult: 1 },
  great: { name: 'Отлично', mult: 1.3 },
};

const BASE_XP = 10;
const SECONDARY_SHARE = 0.5;
const FRESHNESS = [1, 0.75, 0.55];
const FRESHNESS_FLOOR = 0.4;

/** Перетрен: n — сколько подходов на этот стат было с последнего боя. */
export const freshness = (n: number): number => FRESHNESS[n] ?? FRESHNESS_FLOOR;

/** Подходы на каждый стат с последнего боя; бой сбрасывает. */
export type Fatigue = Partial<Record<UpgradeId, number>>;

export interface Gain {
  stat: UpgradeId;
  xp: number;
}

/** Опыт за подход: 10 × место × снаряд × оценка × свежесть × доля стата. Не меньше 1. */
export function setGains(ex: ExerciseDef, grade: Grade, fatigue: Fatigue): Gain[] {
  const base = BASE_XP * PLACES[ex.place].tier * ex.tier * GRADES[grade].mult;
  const gain = (stat: UpgradeId, share: number): Gain => ({
    stat,
    xp: Math.max(1, Math.round(base * share * freshness(fatigue[stat] ?? 0))),
  });
  return ex.secondary ? [gain(ex.primary, 1), gain(ex.secondary, SECONDARY_SHARE)] : [gain(ex.primary, 1)];
}

/** Порог следующего уровня: половина прежней цены уровня в монетах, та же кривая. */
export const xpToNext = (def: UpgradeDef, level: number): number => Math.ceil((def.baseCost / 2) * def.growth ** level);

export type Xp = Record<UpgradeId, number>;

export const emptyXp = (): Xp => ({
  biceps: 0, wrist: 0, fingers: 0, pronation: 0, triceps: 0, shoulder: 0, grip: 0, stamina: 0, explosive: 0,
});

/** Добавляет опыт стату и поднимает уровни. На максимуме опыт сгорает. Входные объекты не меняет. */
export function applyXp(levels: Levels, xp: Xp, stat: UpgradeId, amount: number): { levels: Levels; xp: Xp; levelsGained: number } {
  const def = upgradeById(stat);
  let level = levels[stat];
  let have = xp[stat] + amount;
  let levelsGained = 0;
  while (level < def.maxLevel && have >= xpToNext(def, level)) {
    have -= xpToNext(def, level);
    level++;
    levelsGained++;
  }
  if (level >= def.maxLevel) have = 0;
  return { levels: { ...levels, [stat]: level }, xp: { ...xp, [stat]: have }, levelsGained };
}

/** Деньги, прокачка, снаряды и перетрен. */
export interface TrainingState {
  coins: number;
  levels: Levels;
  xp: Xp;
  owned: ItemId[];
  /** Куплена клубная карта качалки. */
  gym: boolean;
  fatigue: Fatigue;
}

/** Изменения состояния; null — действие сейчас невозможно. */
export type TrainingPatch = Partial<TrainingState> | null;

/** Покупка снаряда в лавке: один раз и на свои деньги. */
export function buyItem(s: TrainingState, id: ItemId): TrainingPatch {
  const item = itemById(id);
  if (s.coins < item.price || s.owned.includes(id)) return null;
  return { coins: s.coins - item.price, owned: [...s.owned, id] };
}

export const buyGym = (s: TrainingState): TrainingPatch =>
  s.gym || s.coins < GYM_MEMBERSHIP ? null : { coins: s.coins - GYM_MEMBERSHIP, gym: true };

export interface SetResult {
  patch: Partial<TrainingState>;
  gains: (Gain & { levelsGained: number })[];
}

/** Подход: начисляет опыт и копит перетрен. Оценку даёт мини-игра. */
export function trainSet(s: TrainingState, exerciseId: string, grade: Grade): SetResult | null {
  const ex = exerciseById(exerciseId);
  if (!ex || !canDo(ex, s.owned, s.gym)) return null;
  let { levels, xp } = s;
  const fatigue = { ...s.fatigue };
  const gains = setGains(ex, grade, s.fatigue).map((g) => {
    const r = applyXp(levels, xp, g.stat, g.xp);
    levels = r.levels;
    xp = r.xp;
    fatigue[g.stat] = (fatigue[g.stat] ?? 0) + 1;
    return { ...g, levelsGained: r.levelsGained };
  });
  return { patch: { levels, xp, fatigue }, gains };
}

/** Лучшее доступное упражнение для стата: больше всего опыта именно ему с учётом свежести. */
export function bestExercise(stat: UpgradeId, owned: readonly ItemId[], gym: boolean, fatigue: Fatigue): { ex: ExerciseDef; xp: number } | null {
  let best: { ex: ExerciseDef; xp: number } | null = null;
  for (const ex of EXERCISES) {
    if (!canDo(ex, owned, gym)) continue;
    const xp = setGains(ex, 'ok', fatigue).find((g) => g.stat === stat)?.xp;
    if (xp === undefined) continue;
    // при равенстве опыта основное упражнение стата лучше побочного
    if (!best || xp > best.xp || (xp === best.xp && ex.primary === stat && best.ex.primary !== stat)) best = { ex, xp };
  }
  return best;
}

/** Самый дешёвый способ открыть упражнение для стата: что докупить и сколько это стоит. */
export function cheapestUnlock(stat: UpgradeId, owned: readonly ItemId[], gym: boolean): { ex: ExerciseDef; item: ItemId | null; needsGym: boolean; cost: number } | null {
  let best: { ex: ExerciseDef; item: ItemId | null; needsGym: boolean; cost: number } | null = null;
  for (const ex of EXERCISES) {
    if (ex.primary !== stat && ex.secondary !== stat) continue;
    const item = ex.item && !owned.includes(ex.item) ? ex.item : null;
    const needsGym = ex.place === 'gym' && !gym;
    const cost = (item ? itemById(item).price : 0) + (needsGym ? GYM_MEMBERSHIP : 0);
    if (!best || cost < best.cost) best = { ex, item, needsGym, cost };
  }
  return best;
}
