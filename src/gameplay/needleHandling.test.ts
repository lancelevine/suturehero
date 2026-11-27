import { expect, it } from 'vitest';
import { NeedleHandlingCheck } from './needleHandling';

it('times forceps-to-driver loading and counts drops and re-grabs', () => {
  const check = new NeedleHandlingCheck();
  check.update('forceps', false, 1);
  check.update(null, false, 2);
  check.update('forceps', false, 3);
  check.update('needle-driver', false, 5);
  check.update(null, true, 8);
  expect([check.drops, check.regrabs, check.loads]).toEqual([1, 1, [4]]);
});
