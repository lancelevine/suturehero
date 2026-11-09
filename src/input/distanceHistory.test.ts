import { expect, it } from 'vitest';
import { DistanceHistory } from './distanceHistory';

it('returns the median of the last five distances', () => {
  const history = new DistanceHistory();
  let median = 0;
  for (const [i, mm] of [400, 900, 410, 405, 420, 415].entries()) median = history.update(mm, i, false);
  expect(median).toBe(415);
});

it('repeats the newest distance at rest and records once per frame time', () => {
  const history = new DistanceHistory();
  history.update(400, 0, false);
  expect(history.update(800, 1, true)).toBe(400);
  expect(history.update(800, 1, false)).toBe(400);
  expect(history.update(800, 2, false)).toBe(400);
  expect(history.update(800, 3, false)).toBe(800);
});
