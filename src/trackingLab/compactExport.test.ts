import { describe, expect, it } from 'vitest';
import { COMPACT_PRESETS, estimateTotalBytes, sampleIndices } from './compactExport';

describe('compact export planning', () => {
  it('estimates the total from sampled frame sizes', () => {
    expect(estimateTotalBytes([100, 200, 300], 10)).toBe(2000);
    expect(estimateTotalBytes([], 10)).toBe(0);
  });

  it('samples evenly spaced frames, or all of a short recording', () => {
    expect(sampleIndices(5, 8)).toEqual([0, 1, 2, 3, 4]);
    expect(sampleIndices(80, 8)).toEqual([5, 15, 25, 35, 45, 55, 65, 75]);
  });

  it('tries presets from largest to smallest', () => {
    for (let i = 1; i < COMPACT_PRESETS.length; i++) {
      expect(COMPACT_PRESETS[i].maxWidth).toBeLessThan(COMPACT_PRESETS[i - 1].maxWidth);
    }
  });
});
