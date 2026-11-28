import { expect, it } from 'vitest';
import { describeVesselCount, stitchGaps, suggestedStitchCount } from './vesselStitchCount';

it('scales the suggested count with the vessel circumference', () => {
  expect(suggestedStitchCount(1)).toBe(8);
  expect(suggestedStitchCount(2)).toBe(16);
});

it('grades how evenly the saved stitches are spaced around the vessel', () => {
  const quarter = Math.PI / 2;
  expect(stitchGaps([0, quarter, 2 * quarter, 3 * quarter]).every((g) => Math.abs(g - quarter) < 1e-9)).toBe(true);
  expect(describeVesselCount([0, quarter, 2 * quarter, 3 * quarter], 1)).toBe('Stitches 4/8 (suggested for a 1.0 mm vessel) · evenly spaced');
  expect(describeVesselCount([0, 0.2, 0.4], 1)).toMatch(/uneven spacing \(widest gap 337°\)/);
});
