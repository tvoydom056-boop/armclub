import { clamp, randRange, type Rng } from './rng';
import { COUNTER, TECHNIQUES, matchup, type Technique } from './techniques';
import type { OpponentDef } from './opponents';
import type { PlayerStats } from './upgrades';

/**
 * Все числа баланса в одном месте. Единицы: сила — условные «единицы силы»,
 * позиция — от −1 (положили нас) до +1 (положили соперника).
 */
export const TUNING = {
  /** За сколько секунд затухает импульс кликов. */
  momentumTau: 0.4,
  maxMomentum: 5.5,
  /** Скорость сдвига позиции на единицу разницы сил. */
  speed: 0.045,
  /** Насколько лидер «давит» сильнее: у пина отыграться почти нельзя. */
  leverage: 0.5,
  matchupBonus: 0.35,
  oppDisadvantage: 0.35,
  pressBoost: 1.25,
  pressPenalty: 0.65,
  oppPressGate: 0.15,
  clickCost: { hook: 0.0077, toproll: 0.0105, press: 0.0182 } as Record<Technique, number>,
  oppTechCost: { hook: 1, toproll: 1.15, press: 1.7 } as Record<Technique, number>,
  /** Выносливость восстанавливается только в паузе между кликами длиннее этой. */
  idleAfter: 0.45,
  regenIdle: 0.16,
  switchTime: 0.35,
  switchPenalty: 0.55,
  ready: [1.1, 2.6] as const,
  startWindow: 0.4,
  startImpulse: 1.5,
  surgeTelegraph: 0.6,
  surgeDuration: 1.3,
  surgeBoost: 1.7,
  oppDrain: 0.03,
  oppRestAt: 0.12,
  oppRest: [1.8, 2.8] as const,
  maxTime: 75,
  maxWarnings: 2,
} as const;

export type MatchPhase = 'ready' | 'fight' | 'won' | 'lost';
export type EndReason = 'pin' | 'foul' | 'time';

/** Наблюдения за боем: не влияют на силу, нужны для подсказок и разбора. */
export interface MatchMetrics {
  lowStaminaSeconds: number;
  counteredSeconds: number;
  counterSeconds: number;
  weakPressSeconds: number;
  strongPressSeconds: number;
  switchingSeconds: number;
  recoveredStamina: number;
  /** Сколько секунд соперник был в паузе и сколько из них ты давил. */
  oppRestSeconds: number;
  oppRestPressedSeconds: number;
}

export const emptyMatchMetrics = (): MatchMetrics => ({
  lowStaminaSeconds: 0, counteredSeconds: 0, counterSeconds: 0,
  weakPressSeconds: 0, strongPressSeconds: 0, switchingSeconds: 0, recoveredStamina: 0, oppRestSeconds: 0, oppRestPressedSeconds: 0,
});

export interface MatchConfig {
  stats: PlayerStats;
  opp: OpponentDef;
  /** Лимит боя в секундах вместо `TUNING.maxTime` (спарринг). */
  maxTime?: number;
}

export const matchLimit = (cfg: MatchConfig): number => cfg.maxTime ?? TUNING.maxTime;

interface OppState {
  tech: Technique;
  /** Техника, на которую он вот-вот переключится (видно по лицу). */
  next: Technique | null;
  telegraphLeft: number;
  decisionLeft: number;
  stamina: number;
  restLeft: number;
  surgeCooldown: number;
  surgeWarnLeft: number;
  surgeLeft: number;
  /** Сколько секунд подряд держит технику из `pattern`. */
  holdTime: number;
  /** Сколько рывков закончил с прошлой паузы. */
  surgesDone: number;
  /** Секунд до паузы по `pattern`: пока идёт, это видно по лицу и плашке. */
  breatherWarnLeft: number;
}

export interface MatchState {
  phase: MatchPhase;
  endReason: EndReason | null;
  /** Секунд с момента «ГО!». */
  time: number;
  readyLeft: number;
  warnings: number;
  /** −1 … +1; +1 — соперника положили. */
  position: number;
  momentum: number;
  stamina: number;
  sinceClick: number;
  tech: Technique;
  switchLeft: number;
  startUsed: boolean;
  clicks: number;
  metrics: MatchMetrics;
  opp: OppState;
}

export type MatchEvent =
  | { type: 'falseStart'; warnings: number }
  | { type: 'go' }
  | { type: 'click'; power: number }
  | { type: 'startBonus' }
  | { type: 'playerSwitch'; tech: Technique }
  | { type: 'oppTelegraph'; tech: Technique }
  | { type: 'oppSwitch'; tech: Technique }
  | { type: 'surgeWarn' }
  | { type: 'surge' }
  | { type: 'oppRest' }
  | { type: 'breatherWarn' }
  | { type: 'end'; result: 'won' | 'lost'; reason: EndReason };

interface MatchInput {
  clicks: number;
  tech?: Technique | null;
}

const staminaFactor = (stamina: number) => 0.35 + 0.65 * Math.min(1, stamina / 0.35);

function weightedPick(weights: Record<Technique, number>, rng: Rng): Technique {
  const total = TECHNIQUES.reduce((sum, t) => sum + weights[t], 0);
  let roll = rng() * total;
  for (const t of TECHNIQUES) {
    roll -= weights[t];
    if (roll <= 0) return t;
  }
  return TECHNIQUES[TECHNIQUES.length - 1];
}

/** Босс не жмёт пресс, пока не впереди (там пресс под штрафом), — берёт лучшее из крюка и топролла. */
function bossPick(pick: Technique, opp: OpponentDef, playerTech: Technique, position: number): Technique {
  if (!opp.boss || pick !== 'press' || position <= -TUNING.oppPressGate) return pick;
  return matchup('hook', playerTech) > matchup('toproll', playerTech) ? 'hook' : 'toproll';
}

export function createMatch(cfg: MatchConfig, rng: Rng): MatchState {
  const { opp } = cfg;
  return {
    phase: 'ready',
    endReason: null,
    time: 0,
    readyLeft: randRange(rng, TUNING.ready),
    warnings: 0,
    position: 0,
    momentum: 0,
    stamina: 1,
    sinceClick: 10,
    tech: 'hook',
    switchLeft: 0,
    startUsed: false,
    clicks: 0,
    metrics: emptyMatchMetrics(),
    opp: {
      // босс не начинает с пресса: со старта он под штрафом
      tech: weightedPick(opp.boss ? { ...opp.weights, press: 0 } : opp.weights, rng),
      next: null,
      telegraphLeft: 0,
      decisionLeft: randRange(rng, opp.decision),
      stamina: 1,
      restLeft: 0,
      surgeCooldown: opp.surgeEvery ? randRange(rng, opp.surgeEvery) + 2 : Infinity,
      surgeWarnLeft: 0,
      surgeLeft: 0,
      holdTime: 0,
      surgesDone: 0,
      breatherWarnLeft: 0,
    },
  };
}

export function playerForce(s: MatchState, cfg: MatchConfig): number {
  const { stats } = cfg;
  const t = s.tech;
  const m = matchup(t, s.opp.tech);
  let mult = 1;
  if (m > 0) mult += TUNING.matchupBonus * stats.counterMult;
  else if (m < 0) mult -= stats.disadvantage[t];
  if (s.time < stats.openingTime) mult *= stats.openingBoost;
  if (t === 'press') mult *= s.position >= stats.pressGate ? TUNING.pressBoost : TUNING.pressPenalty;
  if (s.switchLeft > 0) mult *= TUNING.switchPenalty;
  const grip = stats.grip * (0.6 + 0.4 * Math.min(1, s.stamina / 0.35));
  return (s.momentum + grip) * mult;
}

export function oppForce(s: MatchState, cfg: MatchConfig): number {
  const o = s.opp;
  const m = matchup(o.tech, s.tech);
  let mult = 1;
  if (m > 0) mult += TUNING.matchupBonus;
  else if (m < 0) mult -= TUNING.oppDisadvantage;
  if (o.tech === 'press') mult *= s.position <= -TUNING.oppPressGate ? TUNING.pressBoost : TUNING.pressPenalty;
  if (o.surgeLeft > 0) mult *= TUNING.surgeBoost;
  if (o.next) mult *= 0.9;
  if (o.restLeft > 0) mult *= 0.5;
  mult *= 0.6 + 0.4 * Math.min(1, o.stamina / 0.3);
  return cfg.opp.power * mult;
}

function finish(s: MatchState, result: 'won' | 'lost', reason: EndReason, ev: MatchEvent[]) {
  s.phase = result;
  s.endReason = reason;
  ev.push({ type: 'end', result, reason });
}

function chooseOppTech(s: MatchState, cfg: MatchConfig, rng: Rng): Technique {
  if (rng() < cfg.opp.reactiveness) return bossPick(COUNTER[s.tech], cfg.opp, s.tech, s.position);
  const w = { ...cfg.opp.weights };
  if (s.position <= -TUNING.oppPressGate) w.press *= 2.5;
  else if (s.position > 0.3) w.press *= 0.4;
  return bossPick(weightedPick(w, rng), cfg.opp, s.tech, s.position);
}

function stepOpponent(s: MatchState, cfg: MatchConfig, dt: number, rng: Rng, ev: MatchEvent[]) {
  const o = s.opp;
  const def = cfg.opp;

  if (o.restLeft > 0) {
    o.restLeft -= dt;
    o.stamina = Math.min(1, o.stamina + 0.16 * dt);
  } else {
    const surgeMult = o.surgeLeft > 0 ? 2.2 : 1;
    o.stamina = Math.max(0, o.stamina - TUNING.oppDrain * def.drain * TUNING.oppTechCost[o.tech] * surgeMult * dt);
    if (o.stamina <= TUNING.oppRestAt) {
      o.restLeft = randRange(rng, TUNING.oppRest);
      o.surgeLeft = 0;
      o.surgeWarnLeft = 0;
      o.holdTime = 0;
      o.surgesDone = 0;
      o.breatherWarnLeft = 0;
      ev.push({ type: 'oppRest' });
    }
  }

  if (o.next) {
    o.telegraphLeft -= dt;
    if (o.telegraphLeft <= 0) {
      o.tech = o.next;
      o.next = null;
      o.decisionLeft = randRange(rng, def.decision);
      ev.push({ type: 'oppSwitch', tech: o.tech });
    }
  } else {
    o.decisionLeft -= dt;
    if (o.decisionLeft <= 0) {
      const pick = chooseOppTech(s, cfg, rng);
      if (pick === o.tech) {
        o.decisionLeft = randRange(rng, def.decision);
      } else {
        o.next = pick;
        o.telegraphLeft = def.telegraph;
        ev.push({ type: 'oppTelegraph', tech: pick });
      }
    }
  }

  if (o.surgeLeft > 0) {
    o.surgeLeft -= dt;
    if (o.surgeLeft <= 0) o.surgesDone += 1;
  } else if (o.surgeWarnLeft > 0) {
    o.surgeWarnLeft -= dt;
    if (o.surgeWarnLeft <= 0) {
      o.surgeLeft = TUNING.surgeDuration;
      ev.push({ type: 'surge' });
    }
  } else if (def.surgeEvery && o.restLeft <= 0 && o.breatherWarnLeft <= 0) {
    o.surgeCooldown -= dt;
    if (o.surgeCooldown <= 0) {
      o.surgeWarnLeft = TUNING.surgeTelegraph;
      o.surgeCooldown = randRange(rng, def.surgeEvery);
      ev.push({ type: 'surgeWarn' });
    }
  }

  const pattern = def.pattern;
  if (!pattern) return;
  if (o.breatherWarnLeft > 0) {
    o.breatherWarnLeft -= dt;
    if (o.breatherWarnLeft <= 0) {
      o.restLeft = randRange(rng, pattern.rest);
      o.surgeLeft = 0;
      o.surgeWarnLeft = 0;
      o.holdTime = 0;
      o.surgesDone = 0;
      ev.push({ type: 'oppRest' });
    }
    return;
  }
  if (o.restLeft > 0 || o.surgeLeft > 0 || o.surgeWarnLeft > 0) return;

  if (pattern.kind === 'surges') {
    if (o.surgesDone >= pattern.count) {
      o.breatherWarnLeft = pattern.warn;
      ev.push({ type: 'breatherWarn' });
    }
  } else if (o.tech !== pattern.holdTech) {
    o.holdTime = 0;
  } else {
    o.holdTime += dt;
    if (o.holdTime >= pattern.holdFor) {
      o.breatherWarnLeft = pattern.warn;
      ev.push({ type: 'breatherWarn' });
    }
  }
}

/** Один шаг симуляции. Мутирует `s` и возвращает события для эффектов/звука. */
export function stepMatch(s: MatchState, cfg: MatchConfig, input: MatchInput, dt: number, rng: Rng): MatchEvent[] {
  const ev: MatchEvent[] = [];
  if (s.phase === 'won' || s.phase === 'lost') return ev;

  if (input.tech && input.tech !== s.tech) {
    s.tech = input.tech;
    s.switchLeft = TUNING.switchTime * cfg.stats.switchMult;
    ev.push({ type: 'playerSwitch', tech: s.tech });
  }
  s.switchLeft = Math.max(0, s.switchLeft - dt);

  if (s.phase === 'ready') {
    if (input.clicks > 0) {
      s.warnings += 1;
      ev.push({ type: 'falseStart', warnings: s.warnings });
      if (s.warnings >= TUNING.maxWarnings) finish(s, 'lost', 'foul', ev);
      else s.readyLeft = randRange(rng, TUNING.ready);
      return ev;
    }
    s.readyLeft -= dt;
    if (s.readyLeft <= 0) {
      s.phase = 'fight';
      s.time = 0;
      ev.push({ type: 'go' });
    }
    return ev;
  }

  s.time += dt;

  for (let i = 0; i < input.clicks; i++) {
    const t = s.tech;
    const impulse = cfg.stats.power[t] * staminaFactor(s.stamina);
    let bonus = 0;
    if (!s.startUsed && s.time <= TUNING.startWindow) {
      s.startUsed = true;
      bonus = TUNING.startImpulse * cfg.stats.explosive;
      ev.push({ type: 'startBonus' });
    }
    // потолок ограничивает только клики: иначе он съедал рывок, и прокачка «Взрывного старта» не работала
    s.momentum = Math.max(s.momentum, Math.min(TUNING.maxMomentum, s.momentum + impulse)) + bonus;
    s.stamina = Math.max(0, s.stamina - TUNING.clickCost[t] * cfg.stats.costMult[t]);
    s.clicks += 1;
    ev.push({ type: 'click', power: impulse + bonus });
  }
  s.sinceClick = input.clicks > 0 ? 0 : s.sinceClick + dt;

  s.momentum *= Math.exp(-dt / TUNING.momentumTau);
  // пока кликаешь — не восстанавливается, иначе прокачанное восстановление перекрывало расход
  if (s.sinceClick > TUNING.idleAfter) {
    const before = s.stamina;
    s.stamina = Math.min(1, s.stamina + TUNING.regenIdle * cfg.stats.regen * dt);
    s.metrics.recoveredStamina += s.stamina - before;
  }

  stepOpponent(s, cfg, dt, rng, ev);

  // Условия те же, при которых ниже считается сила; ожидание старта сюда не попадает.
  if (s.stamina < 0.2) s.metrics.lowStaminaSeconds += dt;
  const advantage = matchup(s.tech, s.opp.tech);
  if (advantage < 0) s.metrics.counteredSeconds += dt;
  if (advantage > 0 && s.switchLeft <= 0) s.metrics.counterSeconds += dt;
  if (s.switchLeft > 0) s.metrics.switchingSeconds += dt;
  if (s.opp.restLeft > 0) {
    s.metrics.oppRestSeconds += dt;
    if (s.sinceClick <= TUNING.idleAfter) s.metrics.oppRestPressedSeconds += dt;
  }
  if (s.tech === 'press') {
    if (s.position < cfg.stats.pressGate) s.metrics.weakPressSeconds += dt;
    else if (s.switchLeft <= 0) s.metrics.strongPressSeconds += dt;
  }

  const net = playerForce(s, cfg) - oppForce(s, cfg);
  const lever = 1 + TUNING.leverage * s.position * Math.sign(net);
  s.position = clamp(s.position + TUNING.speed * net * lever * dt, -1, 1);

  if (s.position >= 1) finish(s, 'won', 'pin', ev);
  else if (s.position <= -1) finish(s, 'lost', 'pin', ev);
  else if (s.time >= matchLimit(cfg)) finish(s, s.position >= 0 ? 'won' : 'lost', 'time', ev);

  return ev;
}

/** Обычное поражение приносит четверть награды; фол до борьбы не даёт монет. */
export function rewardFor(opp: OpponentDef, won: boolean, time: number, reason: EndReason = 'pin'): number {
  if (reason === 'foul') return 0;
  if (!won) return Math.round(opp.reward * 0.25);
  const speedBonus = time < 15 ? 0.25 : time < 25 ? 0.1 : 0;
  return Math.round(opp.reward * (1 + speedBonus));
}
