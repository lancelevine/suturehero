import { expect, it } from 'vitest';
import { driftCorrections, holdDecodedMarkers, meanCornerDistance, recordFlowMotion } from './driftCorrection';

const square = (id: number, dx: number) => ({ id, corners: [{ x: dx, y: 0 }, { x: 10 + dx, y: 0 }, { x: 10 + dx, y: 10 }, { x: dx, y: 10 }] });

it('measures the mean corner distance', () => {
  expect(meanCornerDistance(square(1, 0).corners, square(1, 3).corners)).toBe(3);
});

it('corrects only still, recently tracked markers by a plausible amount, from a recent image', () => {
  const active = [square(1, 0), square(2, 0), square(3, 0), square(4, 0)];
  const found = [square(1, 3), square(2, 3), square(3, 1), square(4, 60), square(5, 3)];
  const motion = new Map([[1, { at: 990, speed: 0.01 }], [2, { at: 990, speed: 0.2 }], [3, { at: 990, speed: 0.01 }], [4, { at: 990, speed: 0.01 }]]);
  // 1: corrected. 2: moving. 3: error too small. 4: error too large. 5: not tracked by flow.
  const corrected = driftCorrections(found, active, motion, 1000, 900);
  expect(corrected).toEqual([square(1, 3)]);
  expect(corrected[0]).not.toBe(found[0]);
  // The decoded image is too old.
  expect(driftCorrections(found, active, motion, 1000, 800)).toEqual([]);
});

it('records flow speed between frames', () => {
  const motion = new Map();
  recordFlowMotion(motion, [square(1, 0)], 1000);
  expect(motion.get(1).speed).toBe(Infinity);
  recordFlowMotion(motion, [square(1, 2)], 1010);
  expect(motion.get(1).speed).toBeCloseTo(0.2);
});

it('holds only recently decoded markers when flow finds nothing', () => {
  const confirmed = new Map([[1, 900], [2, 900], [9, 900]]);
  const held = holdDecodedMarkers([square(1, 0), square(2, 0)], new Map([[1, 800], [2, 500]]), confirmed, 1000);
  expect(held.map((m) => m.id)).toEqual([1]);
  expect([...confirmed]).toEqual([[1, 1000]]);
});
