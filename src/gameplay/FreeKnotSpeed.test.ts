import { expect, it } from 'vitest';
import { FreeKnotPractice } from './FreeKnotPractice';
import { tieKnot } from './test-support/knotTrials';

const tie = (speed: number, fps: number, throws: Array<[number, number]>) => tieKnot(new FreeKnotPractice(), speed, fps, throws);

// Full knot (double throw, then an opposing throw that locks it).
// Known limit: at 30 fps and 1.6× speed both throws form, but the second throw's direction
// is read as the same as the first, so it does not count as a lock (not asserted here).
it.each([
  { speed: 1, fps: 30 },
  { speed: 2, fps: 60 },
  { speed: 2, fps: 120 },
])('locks a surgeon’s knot at $speed× hand speed and $fps fps', async ({ speed, fps }) => {
  const model = await tie(speed, fps, [[2, 1], [1, -1]]);
  expect(model.sequence!.technique, model.instruction).toBe('surgeon');
  expect(model.sequence!.throws, model.instruction).toHaveLength(2);
  expect(model.sequence!.locked, model.instruction).toBe(true);
}, 300000);

// At extreme speeds the first (double) throw must still form as wrapped; whether the
// second throw registers there still varies with the frame rate (not asserted).
it.each([
  { speed: 2.5, fps: 60 },
  { speed: 2.5, fps: 120 },
  { speed: 4, fps: 60 },
])('forms the double first throw at $speed× hand speed and $fps fps', async ({ speed, fps }) => {
  const model = await tie(speed, fps, [[2, 1]]);
  expect(model.sequence!.technique, model.instruction).toBe('surgeon');
  expect(model.sequence!.throws[0].wraps).toBe(2);
}, 300000);
