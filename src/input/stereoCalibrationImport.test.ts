import { expect, it } from 'vitest';
import { acceptStereoCalibration, stereoCalibrationSummary } from './stereoCalibrationImport';

const camera = { cameraMatrix: [[700, 0, 480], [0, 700, 270], [0, 0, 1]], distortionCoefficients: [0, 0, 0, 0, 0] };
const solved = (cameraIds?: { first: string; second: string }) => ({
  format: 'suturehero-stereo-calibration-v1',
  imageSize: { width: 960, height: 540 },
  camera1: camera,
  camera2: camera,
  stereo: { rotation: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], translationMm: [120, 0, 0], rmsPx: 0.42 },
  ...(cameraIds ? { cameraIds } : {}),
});

it('binds a fresh import to the two selected cameras', () => {
  expect(acceptStereoCalibration(solved(), { first: 'a', second: 'b' }, false).cameraIds).toEqual({ first: 'a', second: 'b' });
});

it('rejects an import without two distinct cameras, or in the wrong camera order', () => {
  expect(() => acceptStereoCalibration(solved(), { first: 'a', second: 'a' }, false)).toThrow(/two distinct/);
  expect(() => acceptStereoCalibration(solved(), { first: '', second: 'b' }, false)).toThrow(/two distinct/);
  expect(() => acceptStereoCalibration(solved({ first: 'b', second: 'a' }), { first: 'a', second: 'b' }, false)).toThrow(/same camera order/);
});

it('restores a saved calibration as saved, whatever is selected', () => {
  expect(acceptStereoCalibration(solved({ first: 'x', second: 'y' }), { first: '', second: '' }, true).cameraIds).toEqual({ first: 'x', second: 'y' });
});

it('summarises the baseline and stereo error', () => {
  expect(stereoCalibrationSummary(acceptStereoCalibration(solved(), { first: 'a', second: 'b' }, false))).toMatch(/120\.0 mm baseline · stereo RMS 0\.42 px/);
});
