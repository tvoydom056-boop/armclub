import { playMatch } from './botPlayer';
import { rewardFor } from './match';
import { ROSTERS, type OpponentDef } from './opponents';
import { freshSave, type SaveData } from './save';
import { EXERCISES, buyGym, buyItem, canDo, setGains, trainSet, type Grade, type ItemId } from './training';
import { UPGRADES, deriveStats, upgradeCost, type Levels, type UpgradeId } from './upgrades';

/**
 * Бот проходит лигу версии 2 целиком: бой → лавка → подходы → бой. Нужен для баланса тренировок (этап T7):
 * сколько боёв, подходов и минут уходит на каждого соперника.
 */

/** Насколько стат нужен боту «reader»: силы техник важнее всего, взрывной старт — меньше всего. */
export const STAT_WEIGHT: Record<UpgradeId, number> = {
  biceps: 1, fingers: 1, triceps: 1, grip: 0.8, stamina: 0.8, wrist: 0.5, shoulder: 0.5, pronation: 0.5, explosive: 0.3,
};

/** Порядок покупок: сначала дешёвое и полезное для дома, потом зал и сильные ручки. */
export const BUY_ORDER: readonly (ItemId | 'gym')[] = [
  'strap', 'gripper', 'jump_rope', 'gym', 'cone', 'roller', 'tricep_rope', 'fat_grip',
  'gripper_pro', 'eccentric', 'triple', 'multispin', 'medball',
];

/** Секунд на подход вместе с правилами и экраном результата; на бой — сверх самой борьбы. */
export const SET_SECONDS = 14;
export const FIGHT_OVERHEAD = 8;

export interface CareerOptions {
  /** train — тренировки (сейчас), buy — старая покупка уровней за монеты, для сравнения. */
  mode: 'train' | 'buy';
  grade?: Grade;
  /** Подходов между боями. */
  setsPerFight?: number;
  seed?: number;
  maxFights?: number;
  /** Состав по порядку; по умолчанию — лига версии 2. */
  roster?: readonly OpponentDef[];
}

export interface OpponentStep {
  id: string;
  /** Боёв с ним до первой победы. */
  fights: number;
  /** Нарастающим итогом с начала карьеры. */
  totalFights: number;
  totalSets: number;
  minutes: number;
  /** Сумма уровней статов в момент победы. */
  levels: number;
}

export interface CareerResult {
  finished: boolean;
  steps: OpponentStep[];
  fights: number;
  sets: number;
  minutes: number;
  /** Средняя длина боя после «ГО!», секунд. */
  fightTime: number;
}

const levelSum = (l: Levels) => Object.values(l).reduce((a, b) => a + b, 0);

/** Лучшее упражнение сейчас: максимум взвешенного опыта с учётом перетрена. */
function bestExercise(s: SaveData, grade: Grade): string | null {
  let best: string | null = null, bestValue = 0;
  for (const ex of EXERCISES) {
    if (!canDo(ex, s.owned, s.gym)) continue;
    const value = setGains(ex, grade, s.fatigue).reduce((v, g) => v + g.xp * STAT_WEIGHT[g.stat], 0);
    if (value > bestValue) { best = ex.id; bestValue = value; }
  }
  return best;
}

function shop(s: SaveData) {
  for (const id of BUY_ORDER) {
    const owned = id === 'gym' ? s.gym : s.owned.includes(id);
    if (owned) continue;
    const patch = id === 'gym' ? buyGym(s) : buyItem(s, id);
    if (!patch) return; // ждём денег на следующую по списку
    Object.assign(s, patch);
  }
}

/** Старая экономика: монеты сразу в самый выгодный уровень (цена / нужность стата). */
function buyLevels(s: SaveData) {
  for (;;) {
    const options = UPGRADES.filter((u) => s.levels[u.id] < u.maxLevel)
      .map((u) => ({ u, cost: upgradeCost(u, s.levels[u.id]) }))
      .sort((a, b) => a.cost / STAT_WEIGHT[a.u.id] - b.cost / STAT_WEIGHT[b.u.id]);
    const pick = options[0];
    if (!pick || pick.cost > s.coins) return;
    s.coins -= pick.cost;
    s.levels = { ...s.levels, [pick.u.id]: s.levels[pick.u.id] + 1 };
  }
}

export function simulateCareer(opts: CareerOptions): CareerResult {
  const { mode, grade = 'ok', setsPerFight = 6, seed = 1, maxFights = 400, roster = ROSTERS[2] } = opts;
  const s = freshSave();
  const steps: OpponentStep[] = [];
  let fights = 0, sets = 0, seconds = 0, fightsWithCurrent = 0, fightTime = 0;
  for (const opp of roster) {
    fightsWithCurrent = 0;
    for (;;) {
      if (fights >= maxFights) return { finished: false, steps, fights, sets, minutes: seconds / 60, fightTime: fightTime / fights };
      const r = playMatch({ stats: deriveStats(s.levels), opp }, 'reader', seed * 10_000 + fights);
      fights++;
      fightsWithCurrent++;
      seconds += r.time + FIGHT_OVERHEAD;
      fightTime += r.time;
      s.coins += rewardFor(opp, r.won, r.time);
      s.fatigue = {};
      if (r.won) s.wins[opp.id] = (s.wins[opp.id] ?? 0) + 1;
      else s.losses++;
      if (mode === 'buy') buyLevels(s);
      else {
        shop(s);
        for (let i = 0; i < setsPerFight; i++) {
          const ex = bestExercise(s, grade);
          const set = ex && trainSet(s, ex, grade);
          if (!set) break;
          Object.assign(s, set.patch);
          sets++;
          seconds += SET_SECONDS;
        }
      }
      if (r.won) break;
    }
    steps.push({ id: opp.id, fights: fightsWithCurrent, totalFights: fights, totalSets: sets, minutes: seconds / 60, levels: levelSum(s.levels) });
  }
  return { finished: true, steps, fights, sets, minutes: seconds / 60, fightTime: fightTime / fights };
}
