import type { EndReason } from '../core/match';
import type { Technique } from '../core/techniques';
import type { PlayerStats } from '../core/upgrades';

export interface BusEvents {
  'game:ready': { ok: true };
  'match:start': { oppId: string; stats: PlayerStats };
  'match:end': { oppId: string; result: 'won' | 'lost'; reason: EndReason; time: number; clicks: number };
  'match:abort': { oppId: string | null };
  'input:tech': Technique;
  'input:click': { n: number };
}

type Handler<T> = (payload: T) => void;

/** Мост React ↔ Phaser: никто не знает друг о друге, только об этой шине. */
class Bus {
  private handlers = new Map<keyof BusEvents, Set<Handler<never>>>();

  on<K extends keyof BusEvents>(event: K, handler: Handler<BusEvents[K]>): () => void {
    const set = this.handlers.get(event) ?? new Set();
    set.add(handler as Handler<never>);
    this.handlers.set(event, set);
    return () => set.delete(handler as Handler<never>);
  }

  emit<K extends keyof BusEvents>(event: K, payload: BusEvents[K]): void {
    this.handlers.get(event)?.forEach((h) => (h as Handler<BusEvents[K]>)(payload));
  }
}

export const bus = new Bus();
