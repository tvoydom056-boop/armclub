import type { EndReason } from './match';
import { opponentById, type OpponentDef } from './opponents';
import type { Technique } from './techniques';
import { applyXp, type Fatigue, type Gain, type Grade, type SetResult, type TrainingState, freshness, GRADES } from './training';
import type { PlayerStats, UpgradeId } from './upgrades';

/** Спарринг в баре «Яма»: короткий бой с завсегдатаем вместо мини-игры. */
export const SPARRING_COST = 10;
export const SPARRING_TIME = 10;
/** Партнёра рисуют спрайты этого бойца. */
export const SPARRING_PARTNER_ID = 'leva';
/** Опыт за оценку «Норм» каждому из двух статов. */
const SPARRING_XP = 10;
/** Какую долю твоей силы жмёт партнёр. */
export const PARTNER_RATIO = 0.7;
/** Сила новичка с нулевой прокачкой: ориентир из `OpponentDef.power`. */
const BASE_FORCE = 2.7;

/** Опыт получают оба стата выбранной техники. */
export const SPARRING_STATS: Record<Technique, readonly [UpgradeId, UpgradeId]> = {
  hook: ['biceps', 'wrist'],
  toproll: ['fingers', 'pronation'],
  press: ['triceps', 'shoulder'],
};

/** Партнёр рисуется как Лева, но играет ровно и без фокусов: ни рывков, ни пауз, ни быстрых реакций. */
export function sparringPartner(stats: PlayerStats, tech: Technique): OpponentDef {
  const base = opponentById(SPARRING_PARTNER_ID, 2);
  return {
    ...base,
    name: 'Партнёр',
    nick: 'Завсегдатай «Ямы»',
    boss: false,
    power: PARTNER_RATIO * (BASE_FORCE * stats.power[tech] + stats.grip),
    weights: { hook: 1, toproll: 1, press: 1 },
    reactiveness: 0.1,
    decision: [4, 6],
    surgeEvery: null,
    pattern: undefined,
    drain: 1,
    reward: 0,
  };
}

/** Оценка по итогу: пин решает сразу, по времени — по тому, насколько рука ушла в твою сторону. */
export function sparringGrade(won: boolean, reason: EndReason, position: number): Grade {
  if (reason === 'pin') return won ? 'great' : 'weak';
  return position >= 0.35 ? 'great' : position >= -0.1 ? 'ok' : 'weak';
}

export function sparringGains(tech: Technique, grade: Grade, fatigue: Fatigue): Gain[] {
  return SPARRING_STATS[tech].map((stat) => ({
    stat,
    xp: Math.max(1, Math.round(SPARRING_XP * GRADES[grade].mult * freshness(fatigue[stat] ?? 0))),
  }));
}

/** Платит партнёру, начисляет опыт обоим статам и копит перетрен. Без денег — null. */
export function sparringSet(s: TrainingState, tech: Technique, grade: Grade): (SetResult & { cost: number }) | null {
  if (s.coins < SPARRING_COST) return null;
  let { levels, xp } = s;
  const fatigue = { ...s.fatigue };
  const gains = sparringGains(tech, grade, s.fatigue).map((g) => {
    const r = applyXp(levels, xp, g.stat, g.xp);
    levels = r.levels;
    xp = r.xp;
    fatigue[g.stat] = (fatigue[g.stat] ?? 0) + 1;
    return { ...g, levelsGained: r.levelsGained };
  });
  return { patch: { coins: s.coins - SPARRING_COST, levels, xp, fatigue }, gains, cost: SPARRING_COST };
}
