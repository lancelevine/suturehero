import { expect, it } from 'vitest';
import { describeUnequalEdges, stepRatios } from './unequalEdges';

const bite = (shortZ: number, longZ: number) => ({ entry: { x: 0.2, z: longZ }, exit: { x: -0.2, z: shortZ } });

it('grades how the extra length of the long edge is spread across the bites', () => {
  expect(stepRatios([bite(0, 0), bite(0.2, 0.25), bite(0.4, 0.5)])).toEqual([1.25, 1.25]);
  expect(describeUnequalEdges([bite(0, 0), bite(0.2, 0.25), bite(0.4, 0.45)])).toBe('Unequal edges: 1/2 gaps spread the extra length (steps 1.25 / 1.00×, aim 1.25×)');
  expect(describeUnequalEdges([])).toMatch(/25% longer/);
});
