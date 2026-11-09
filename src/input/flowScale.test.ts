import { expect, it } from 'vitest';
import { flowFrameScale } from './flowScale';

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
