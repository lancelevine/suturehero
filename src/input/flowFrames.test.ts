import { describe, expect, it } from 'vitest';
import { isFlowSeedRef, KeptFrames, nextFlowFrameKey } from './flowFrames';

describe('kept flow frames', () => {
  it('returns each kept frame once and drops the oldest beyond the limit', () => {
    const kept = new KeptFrames<string>(2);
    kept.keep(1, 'a');
    kept.keep(2, 'b');
    kept.keep(3, 'c');
    expect(kept.size).toBe(2);
    expect(kept.take(1)).toBeUndefined();
    expect(kept.take(2)).toBe('b');
    expect(kept.take(2)).toBeUndefined();
    expect(kept.take(3)).toBe('c');
  });

  it('recognizes seed references and gives unique keys', () => {
    expect(isFlowSeedRef({ key: 1, ready: Promise.resolve() })).toBe(true);
    expect(isFlowSeedRef(undefined)).toBe(false);
    expect(isFlowSeedRef({ key: 1 })).toBe(false);
    expect(nextFlowFrameKey()).not.toBe(nextFlowFrameKey());
  });
});
