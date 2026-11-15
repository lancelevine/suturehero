import { describe, expect, it } from 'vitest';
import { createAutomaticKnotSequence, EventLedgerKnotSequence, retainedContactSweeps } from './KnotEngine';

describe('switchable knot engines', () => {
  it('keeps the current implementation available as legacy mode', () => {
    const sequence = createAutomaticKnotSequence('legacy');
    sequence.seat({ wraps: 1, direction: 1, postHeld: false });
    sequence.seat({ wraps: 1, direction: 1, postHeld: false });
    expect(sequence.technique).toBe('sliding');
  });
  it('does not infer sliding without evidence that the post was held', () => {
    const sequence = new EventLedgerKnotSequence();
    sequence.seat({ wraps: 1, direction: 1, postHeld: false });
    sequence.seat({ wraps: 1, direction: 1, postHeld: false });
    expect(sequence.technique).toBe('unsecured');
    expect(sequence.sliding).toBe(false);
    expect(sequence.locked).toBe(false);
  });
  it('recognizes verified sliding, square, and surgeon starts', () => {
    const sliding = new EventLedgerKnotSequence();
    sliding.seat({ wraps: 1, direction: -1, postHeld: false });
    sliding.seat({ wraps: 1, direction: -1, postHeld: true });
    expect(sliding.technique).toBe('sliding');
    sliding.seat({ wraps: 1, direction: 1, postHeld: true });
    expect(sliding.locked).toBe(true);
    const square = new EventLedgerKnotSequence();
    square.seat({ wraps: 1, direction: 1, postHeld: false });
    square.seat({ wraps: 1, direction: -1, postHeld: false });
    expect(square.technique).toBe('square');
    expect(square.locked).toBe(true);
    const surgeon = new EventLedgerKnotSequence();
    surgeon.seat({ wraps: 2, direction: 1, postHeld: false });
    surgeon.seat({ wraps: 2, direction: -1, postHeld: false });
    expect(surgeon.technique).toBe('surgeon');
    expect(surgeon.locked).toBe(true);
    const multiple = new EventLedgerKnotSequence();
    expect(multiple.seat({ wraps: 3, direction: 1, postHeld: false })).toBe(true);
    expect(multiple.technique).toBe('multiple');
    expect(multiple.seat({ wraps: 1, direction: -1, postHeld: false })).toBe(true);
    expect(multiple.locked).toBe(true);
  });
});

it('halves retained contact work while preserving extra low-FPS substeps', () => {
  expect(retainedContactSweeps('legacy', 1)).toBe(16);
  expect(retainedContactSweeps('event-ledger', 1)).toBe(8);
  expect(retainedContactSweeps('event-ledger', 2)).toBe(6);
});
