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
  isLockThrow?(index: number): boolean;
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
    if (first.wraps > 2) return 'multiple';
    if (!second) return 'single';
    if (second.direction !== first.direction) return 'square';
    return second.postHeld ? 'sliding' : 'unsecured';
  }

  get label() {
    return {
      auto: 'Event ledger · detecting knot start', single: 'Event ledger · single first throw',
      surgeon: "Event ledger · surgeon's start", sliding: 'Event ledger · sliding start',
      square: 'Event ledger · square start', multiple: 'Event ledger · multiple-wrap start',
      unsecured: 'Event ledger · unsecured same-direction throws',
    }[this.technique]!;
  }

  get requiredWraps() { return 0; }
  get requiredDirection() { return this.throws.length ? -this.throws.at(-1)!.direction : 0; }
  isLockThrow(index: number) {
    const minimum = this.technique === 'sliding' ? 2 : 1;
    return index >= minimum && this.throws[index].direction !== this.throws[index - 1].direction;
  }
  get locked() {
    return this.throws.some((_, index) => this.isLockThrow(index));
  }
  get sliding() { return !this.locked && (this.technique === 'single' || this.technique === 'sliding'); }
  acceptsGeometry(wraps: number, direction: number) {
    return Number.isInteger(wraps) && wraps >= 1 && wraps <= 4 && (direction === 1 || direction === -1);
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

/** Contact projections per retained-throw physics substep. */
export function retainedContactSweeps(mode: KnotEngineMode, physicsStepsThisFrame: number): number {
  if (mode === 'legacy') return 16;
  return physicsStepsThisFrame > 1 ? 6 : 8;
}
