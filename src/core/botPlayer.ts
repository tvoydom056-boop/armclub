import { createMatch, stepMatch, type MatchConfig } from './match';
import { mulberry32 } from './rng';
import { COUNTER, type Technique } from './techniques';

const DT = 1 / 60;

/** hook-only — давит одним крюком; reader — читает соперника и отвечает контртехникой с реакцией 0,3 с. */
export type Bot = 'hook-only' | 'reader';

export interface BotResult {
  won: boolean;
  /** Секунд боя после «ГО!». */
  time: number;
  /** Позиция руки в конце боя, −1 … +1. */
  position: number;
}

/** Бот играет матч целиком: cps кликов в секунду. Нужен для таблиц баланса. */
export function playMatch(cfg: MatchConfig, bot: Bot, seed: number, cps = 6.5): BotResult {
  const rng = mulberry32(seed);
  const s = createMatch(cfg, rng);
  let acc = 0;
  let sawChangeAt = -1;
  let lastSeen: Technique | null = null;
  let wanted: Technique = 'hook';
  let clock = 0;
  const reaction = 0.3;

  for (let i = 0; i < 60 * 120 && s.phase !== 'won' && s.phase !== 'lost'; i++) {
    clock += DT;
    let clicks = 0;
    let tech: Technique | undefined;
    if (s.phase === 'fight') {
      acc += cps * DT;
      clicks = Math.floor(acc);
      acc -= clicks;
      if (bot === 'reader') {
        const target = s.opp.next ?? s.opp.tech;
        if (target !== lastSeen) {
          lastSeen = target;
          sawChangeAt = clock;
        }
        if (sawChangeAt >= 0 && clock - sawChangeAt >= reaction) {
          wanted = COUNTER[target];
          // пресс до того, как ты впереди, не нужен — остаёмся на крюке
          if (wanted === 'press' && s.position < cfg.stats.pressGate) wanted = 'hook';
        }
        tech = wanted;
      }
    }
    stepMatch(s, cfg, { clicks, tech }, DT, rng);
  }
  return { won: s.phase === 'won', time: s.time, position: s.position };
}
