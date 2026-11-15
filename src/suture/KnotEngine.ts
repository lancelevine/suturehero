import { InferredKnotSequence } from './InferredKnotSequence';
import type { ThrowRecord } from './KnotTechnique';

export type KnotEngineMode = 'legacy' | 'event-ledger';

export interface AutomaticKnotSequence {
  readonly throws: readonly ThrowRecord[];
  readonly technique: string;
  readonly label: string;
  readonly requiredWraps: number;
  readonly requiredDirection: number;
  readonly locked: boolean;
  readonly sliding: boolean;
  readonly instruction: string;
  acceptsGeometry(wraps: number, direction: number): boolean;
  seat(record: ThrowRecord): boolean;
}

/** Recognition from discrete, physically verified throw events. */
export class EventLedgerKnotSequence implements AutomaticKnotSequence {
  readonly throws: ThrowRecord[] = [];

  get technique() {
    const first = this.throws[0], second = this.throws[1];
    if (!first) return 'auto';
    if (first.wraps === 2) return 'surgeon';
    if (!second) return 'single';
    if (second.direction !== first.direction) return 'square';
    return second.postHeld ? 'sliding' : 'unsecured';
  }

  get label() {
    return {
      auto: 'Event ledger · detecting knot start', single: 'Event ledger · single first throw',
      surgeon: "Event ledger · surgeon's start", sliding: 'Event ledger · sliding start',
      square: 'Event ledger · square start', unsecured: 'Event ledger · unsecured same-direction throws',
    }[this.technique]!;
  }

  get requiredWraps() { return 0; }
  get requiredDirection() { return this.throws.length ? -this.throws.at(-1)!.direction : 0; }
  get locked() {
    const minimum = this.technique === 'sliding' ? 3 : 2;
    return this.throws.some((record, index) => index >= minimum - 1 && record.wraps === 1 && record.direction !== this.throws[index - 1].direction);
  }
  get sliding() { return !this.locked && (this.technique === 'single' || this.technique === 'sliding'); }
  acceptsGeometry(wraps: number, direction: number) {
    return Number.isInteger(wraps) && wraps >= 1 && wraps <= 2 && (direction === 1 || direction === -1);
  }
  seat(record: ThrowRecord) {
    if (!this.acceptsGeometry(record.wraps, record.direction)) return false;
    this.throws.push({ ...record });
    return true;
  }
  get instruction() {
    if (!this.throws.length) return 'Form a complete throw; recognition uses verified tail passage and seating';
    if (this.technique === 'single') return 'Reverse for a square throw, or keep the short post taut for a sliding start';
    if (this.technique === 'unsecured') return 'Same-direction throws lacked a taut post · reverse direction to lock them';
    if (this.sliding) return 'Keep the short post taut while advancing · reverse direction to lock';
    return this.locked ? 'Opposing lock verified · alternate later throws' : 'Reverse direction for an opposing lock';
  }
}

export function createAutomaticKnotSequence(mode: KnotEngineMode): AutomaticKnotSequence {
  return mode === 'event-ledger' ? new EventLedgerKnotSequence() : new InferredKnotSequence();
}
