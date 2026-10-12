import { sfx } from '../audio/sfx';
import { SPARRING_TIME, sparringPartner } from '../core/sparring';
import { applyStyle } from '../core/styles';
import type { Technique } from '../core/techniques';
import { deriveStats } from '../core/upgrades';
import { bus } from '../game/bus';
import { useGame } from '../store/game';

/** Запускает бой с выбранным соперником с текущей прокачкой. */
export function beginMatch(oppId: string): void {
  const { levels, version, style, startMatch } = useGame.getState();
  if (!startMatch(oppId)) return;
  sfx.ui.start();
  bus.emit('match:start', { oppId, stats: applyStyle(deriveStats(levels), style), version });
}

/** Спарринг в баре: 10 секунд с партнёром. Платит и начисляет опыт стор в конце. */
export function beginSparring(tech: Technique): void {
  const { levels, version, style, startSparring } = useGame.getState();
  if (!startSparring(tech)) return;
  const stats = applyStyle(deriveStats(levels), style);
  const opp = sparringPartner(stats, tech);
  sfx.ui.start();
  bus.emit('match:start', { oppId: opp.id, stats, version, opp, maxTime: SPARRING_TIME });
}

export function leaveMatch(tab?: 'fights' | 'shop'): void {
  bus.emit('match:abort', { oppId: useGame.getState().oppId });
  useGame.getState().toHub(tab);
}
