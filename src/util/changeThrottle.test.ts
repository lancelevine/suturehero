import { expect, it } from 'vitest';
import { changeThrottle } from './changeThrottle';

it('sends changes at once and repeats an unchanged key only after the interval', () => {
  const due = changeThrottle(500);
  expect(due('a', 0)).toBe(true);
  expect(due('a', 400)).toBe(false);
  expect(due('b', 450)).toBe(true);
  expect(due('b', 900)).toBe(false);
  expect(due('b', 951)).toBe(true);
});
