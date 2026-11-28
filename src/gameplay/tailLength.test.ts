import { expect, it } from 'vitest';
import { describeTail, tailLengthMm } from './tailLength';

it('measures the tail from the knot to the cut and grades it', () => {
  expect(tailLengthMm(10, 5, 0.05, 27)).toBeCloseTo(8 * 0.05 * 27);
  expect(describeTail(2)).toMatch(/short/);
  expect(describeTail(6)).toBe('tail 6 mm ✓');
  expect(describeTail(15)).toMatch(/long: trim/);
});
