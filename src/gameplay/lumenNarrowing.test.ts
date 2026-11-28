import { expect, it } from 'vitest';
import { describeLumenNarrowing, lumenNarrowingPercent } from './lumenNarrowing';

it('estimates narrowing from dilation, extra stitches and inversions', () => {
  expect(lumenNarrowingPercent({ dilation: 1.2, stitches: 16, suggested: 16, inverted: 0 })).toBe(5);
  expect(lumenNarrowingPercent({ dilation: 1, stitches: 18, suggested: 16, inverted: 1 })).toBe(5 + 6 + 6 + 8);
  expect(describeLumenNarrowing(5)).toMatch(/patent ✓/);
  expect(describeLumenNarrowing(30)).toMatch(/too narrow/);
});
