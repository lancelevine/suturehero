import { expect, it } from 'vitest';
import { AirKnotWatcher } from './airKnot';

it('flags a second throw laid over an unseated first throw, except for sliding knots', () => {
  const watcher = new AirKnotWatcher();
  watcher.update(1, 0, false);
  watcher.update(2, 0, false);
  expect(watcher.flagged).toBe(true);
  watcher.update(0, 0, false);
  expect(watcher.flagged).toBe(false);
  watcher.update(1, 1, false);
  watcher.update(2, 1, false);
  expect(watcher.flagged).toBe(false);
  const sliding = new AirKnotWatcher();
  sliding.update(1, 0, true);
  sliding.update(2, 0, true);
  expect(sliding.flagged).toBe(false);
});
