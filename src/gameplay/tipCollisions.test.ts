import { expect, it } from 'vitest';
import { TipCollisionCounter } from './tipCollisions';

it('counts each bump once and ignores needle handoffs', () => {
  const counter = new TipCollisionCounter();
  for (const distance of [10, 2, 1, 4, 2, 8]) counter.update(distance, false);
  expect(counter.count).toBe(1);
  counter.update(2, false);
  counter.update(9, false);
  expect(counter.count).toBe(2);
  counter.update(1, true);
  counter.update(9, false);
  expect(counter.count).toBe(2);
  counter.reset();
  expect(counter.count).toBe(0);
});
