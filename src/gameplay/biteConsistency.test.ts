import { expect, it } from 'vitest';
import { biteConsistency, describeBiteConsistency } from './biteConsistency';

it('finds bites far from the median bite', () => {
  const result = biteConsistency([{ entryMm: 5, exitMm: 5.4 }, { entryMm: 5.2, exitMm: 8 }, { entryMm: 4.8, exitMm: null }]);
  expect(result.medianMm).toBeCloseTo(5.2);
  expect(result.outliers).toEqual([{ pass: 2, side: 'exit', biteMm: 8 }]);
  expect(describeBiteConsistency(result)).toBe('Bite consistency: 4/5 within 1.5 mm of 5.2 mm · outliers: pass 2 exit 8.0 mm');
});

it('reports even bites and the empty case', () => {
  expect(describeBiteConsistency(biteConsistency([{ entryMm: 5, exitMm: 5.5 }]))).toBe('Bite consistency: 2/2 within 1.5 mm of 5.3 mm');
  expect(describeBiteConsistency(biteConsistency([]))).toMatch(/make a pass/);
});
