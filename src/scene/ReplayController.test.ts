import { expect, it } from 'vitest';
import { Instrument } from '../instruments/Instrument';
import { SutureModel } from '../suture/SutureModel';
import { ReplayController } from './ReplayController';

it('replays recorded instrument motion and restores the live pose afterwards', () => {
  const tool = new Instrument('left', 0);
  const replay = new ReplayController([tool], new SutureModel());
  expect(replay.start()).toBe(false);
  for (let frame = 0; frame <= 120; frame++) {
    tool.root.position.set(frame / 100, 0, 0);
    replay.record(frame / 60);
  }
  expect(replay.available).toBe(true);
  tool.root.position.set(5, 5, 5);
  expect(replay.start()).toBe(true);
  expect(replay.paths.children).toHaveLength(1);
  expect(replay.step(1 / 60)).toBe(true);
  expect(tool.root.position.x).toBeLessThan(1.3);
  expect(replay.progress).toBeGreaterThan(0);
  // Recording is paused while replaying.
  replay.record(99);
  replay.stop();
  expect(replay.replaying).toBe(false);
  expect(tool.root.position.toArray()).toEqual([5, 5, 5]);
  expect(replay.paths.children).toHaveLength(0);
  replay.clear();
  expect(replay.available).toBe(false);
});
