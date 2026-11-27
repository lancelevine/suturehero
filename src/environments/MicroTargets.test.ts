import { afterEach, expect, it } from 'vitest';
import { CLAMP_SPREAD, MICRO_TARGETS, microProfile, setClampSpread } from './MicroTargets';

afterEach(() => setClampSpread(CLAMP_SPREAD.default));

it('scales the vessel gap with the clamp, within its range', () => {
  expect(microProfile('artery').gap).toBe(MICRO_TARGETS.artery.gap);
  setClampSpread(0.5);
  expect(microProfile('artery').gap).toBeCloseTo(MICRO_TARGETS.artery.gap * 0.5);
  expect(setClampSpread(9)).toBe(CLAMP_SPREAD.max);
  expect(setClampSpread(Number.NaN)).toBe(CLAMP_SPREAD.default);
});
