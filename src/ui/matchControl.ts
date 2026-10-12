import { sfx } from '../audio/sfx';
import { applyStyle } from '../core/styles';
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

export function leaveMatch(tab?: 'fights' | 'shop'): void {
  bus.emit('match:abort', { oppId: useGame.getState().oppId });
  useGame.getState().toHub(tab);
}
