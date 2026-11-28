import { expect, it } from 'vitest';
import { describeNerveAlignment, normaliseTwist, startingTwist } from './nerveAlignment';

it('starts twisted and reports alignment within 5 degrees', () => {
  const twist = startingTwist(() => 0.25);
  expect(Math.abs(twist)).toBeGreaterThanOrEqual(12);
  expect(normaliseTwist(370)).toBeCloseTo(10);
  expect(describeNerveAlignment(-18)).toMatch(/^Fascicles 18° out of line/);
  expect(describeNerveAlignment(3)).toMatch(/^Fascicles aligned \(3° twist\) ✓/);
});

it('reports vessel twist from the stripes', async () => {
  const { describeVesselTwist } = await import('./nerveAlignment');
  expect(describeVesselTwist(20)).toMatch(/^Vessel ends twisted 20°/);
  expect(describeVesselTwist(-2)).toMatch(/in line/);
});
