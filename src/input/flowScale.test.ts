import { expect, it } from 'vitest';
import { flowFrameScale, mergeNewMarkers, offsetMarkers } from './flowScale';

it('shrinks wide frames to 960 px and converts corners both ways', () => {
  const s = flowFrameScale(1920, 1080);
  expect([s.width, s.height]).toEqual([960, 540]);
  const native = s.toNative([{ id: 1, corners: [{ x: 100, y: 50 }] }]);
  expect(native[0].corners[0]).toEqual({ x: 200, y: 100 });
  expect(s.toFlow(native)[0].corners[0]).toEqual({ x: 100, y: 50 });
});

it('keeps frames up to 960 px wide and handles the OV9281 size', () => {
  expect(flowFrameScale(640, 480)).toMatchObject({ width: 640, height: 480 });
  expect(flowFrameScale(1280, 800)).toMatchObject({ width: 960, height: 600 });
});

it('moves region corners to full-frame coordinates', () => {
  expect(offsetMarkers([{ id: 2, corners: [{ x: 1, y: 2 }] }], 100, 50)).toEqual([{ id: 2, corners: [{ x: 101, y: 52 }] }]);
});

it('adds only newly decoded IDs to the tracked markers', () => {
  const m = (id: number, x = 0) => ({ id, corners: [{ x, y: 0 }] });
  const { merged, added } = mergeNewMarkers([m(1, 5)], [m(1, 9), m(2)]);
  expect(merged.map((x) => [x.id, x.corners[0].x])).toEqual([[1, 5], [2, 0]]);
  expect(added.map((x) => x.id)).toEqual([2]);
});
