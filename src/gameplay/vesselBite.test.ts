import { expect, it } from 'vitest';
import { describeVesselBites, vesselBite } from './vesselBite';

it('grades vessel bites against the wall thickness', () => {
  const good = vesselBite(-0.31, 0.31, 0.3, 0.08);
  expect(good.ratio).toBeCloseTo(2);
  expect(good.good).toBe(true);
  const lopsided = vesselBite(-0.31, 0.4, 0.3, 0.08);
  expect(lopsided.matched).toBe(false);
  expect(describeVesselBites([good, lopsided])).toMatch(/^Bites: 1\/2 at ~2× wall.*sides unequal$/);
});
