import type { Rng } from '../core/rng';
import type { Grade, SetResult } from '../core/training';
import { hasTrainingInput, stepTrainingGame, type GameEvent, type TrainingGameState } from '../core/trainingGames';

export type InputEdge = 'press' | 'release';
/** Сохраняет порядок фронтов, в том числе несколько пар нажатие/отпускание за кадр. */
export function consumeInput(s: TrainingGameState, edges: readonly InputEdge[], rng: Rng): GameEvent[] {
  const events: GameEvent[] = [];
  for (let i = 0; i < edges.length;) {
    const edge = edges[i];
    let count = 0;
    while (edges[i] === edge) { count++; i++; }
    events.push(...stepTrainingGame(s, { presses: edge === 'press' ? count : 0, releases: edge === 'release' ? count : 0 }, 0, rng));
  }
  return events;
}

/** Билет подхода выдаёт награду один раз. Повтор создаёт новый билет, выход — ни одного. */
export function completionTicket() {
  let claimed = false;
  return (s: TrainingGameState, id: string, grade: Grade, train: (id: string, grade: Grade) => SetResult | null): SetResult | null => {
    if (!s.done || claimed) return null;
    claimed = true;
    if (!hasTrainingInput(s)) return null;
    return train(id, grade);
  };
}
