import { expect, it } from 'vitest';
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
