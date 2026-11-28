import { describe, expect, it } from 'vitest';
import type { TissueSite } from '../tissue/StitchField';
import { gapScan } from './gapScan';

const site = (siteZ: number): TissueSite => ({ siteZ, closure: 1, initialGap: 0.1, eversion: 0, pucker: 0 });

it('finds the open stretches between and beyond well-closed stitches', () => {
  const close = gapScan([site(-0.4), site(0), site(0.4)]);
  // Closely spaced stitches leave only the wound ends open.
  expect(close.every((span) => span.from < -0.8 || span.to > 0.8)).toBe(true);
  const wide = gapScan([site(-0.9), site(0.9)]);
  expect(wide.some((span) => span.from < 0 && span.to > 0)).toBe(true);
  expect(gapScan([])).toEqual([]);
});

import { describeWoundEnds, woundEndOpenings } from './gapScan';
describe('wound end check', () => {
  const ends = { min: -1, max: 1 };
  it('reports openings that reach either apex', () => {
    expect(woundEndOpenings([{ from: -1, to: -0.7, widest: 0.1 }, { from: 0.1, to: 0.2, widest: 0.1 }], ends)).toEqual({ start: expect.closeTo(0.3, 6), finish: 0 });
    expect(woundEndOpenings([{ from: 0.8, to: 1, widest: 0.1 }], ends).finish).toBeCloseTo(0.2, 6);
    expect(describeWoundEnds([], (u) => `${u}`, ends)).toBe('Wound ends: both closed');
    expect(describeWoundEnds([{ from: 0.8, to: 1, widest: 0.1 }], (u) => u.toFixed(1), ends)).toContain('far end open 0.2');
  });
});
