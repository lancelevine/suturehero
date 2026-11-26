import { expect, it } from 'vitest';
import { DepthRange, RESET_WORKING_DEPTH_MM } from './depthRangeControls';

const sample = (proxy: number, distanceMm: number, binding = 'cam|ring8') => ({ proxy, normalizedSide: 1 / proxy, binding, instrument: 'needleDriver', at: 0, distanceMm });

it('captures Near then Far, sets the working depth from them, and reports progress', () => {
  const range = new DepthRange();
  expect(range.status('cam|ring8')).toMatch(/Near, then Far/);
  range.setNear(sample(1, 300));
  expect(range.status('cam|ring8')).toMatch(/Near size captured/);
  expect(range.status('other|ring8')).toMatch(/same camera and tracker/);
  expect(range.setFar(sample(1.01, 320))).toBe(false);
  expect(range.setFar(sample(2, 700))).toBe(true);
  expect([range.nearMm, range.farMm, range.workingMm]).toEqual([300, 700, 400]);
  expect(range.status('cam|ring8')).toMatch(/calibrated/);
  expect(range.range('cam|ring8')).toEqual({ near: 300, span: 400 });
});

it('round-trips through its saved form and drops Far when the working depth changes', () => {
  const range = new DepthRange();
  range.setNear(sample(1, 300));
  range.setFar(sample(2, 650));
  const copy = new DepthRange();
  copy.restore(JSON.parse(JSON.stringify(range.serialize())));
  expect([copy.nearMm, copy.farMm, copy.workingMm]).toEqual([300, 650, 350]);
  copy.setWorking(500);
  expect([copy.farMm, copy.size.far, copy.workingMm]).toEqual([null, null, 500]);
  copy.reset();
  expect([copy.nearMm, copy.farMm, copy.workingMm]).toEqual([null, null, RESET_WORKING_DEPTH_MM]);
});
