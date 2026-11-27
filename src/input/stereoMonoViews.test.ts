import { expect, it } from 'vitest';
import { parseCalibration } from './stereoGeometry';
import { stereoMonoViews } from './stereoMonoViews';
import { trackerGeometry } from './prismPose';

const calibration = parseCalibration({
  format: 'suturehero-stereo-calibration-v1', imageSize: { width: 1000, height: 800 },
  camera1: { cameraMatrix: [[1000, 0, 500], [0, 1000, 400], [0, 0, 1]], distortionCoefficients: [0, 0, 0, 0, 0] },
  camera2: { cameraMatrix: [[1000, 0, 500], [0, 1000, 400], [0, 0, 1]], distortionCoefficients: [0, 0, 0, 0, 0] },
  stereo: { rotation: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], translationMm: [-260, 0, 0], baselineMm: 260, rmsPx: 1 },
});
const size = { width: 1000, height: 800 };

/** A ring8 marker facing the camera, centred, at `depthMm`. */
function facingMarker(id: number, depthMm: number) {
  const half = ((trackerGeometry('ring8').markerSizeMm / 2) * 1000) / depthMm;
  return { id, corners: [{ x: 500 - half, y: 400 - half }, { x: 500 + half, y: 400 - half }, { x: 500 + half, y: 400 + half }, { x: 500 - half, y: 400 + half }] };
}

it('gives each fresh camera its best single-marker pose at a plausible depth', () => {
  const views = stereoMonoViews(calibration, [0, 1, 2], 'ring8', [
    { at: 1000, size, markers: [facingMarker(0, 600), facingMarker(20, 600)] },
    { at: 500, size, markers: [facingMarker(1, 600)] },
  ], 1050);
  // Camera 2's markers are too old; marker 20 belongs to another instrument.
  expect(views).toHaveLength(1);
  expect(views[0].camera).toBe(0);
  expect(views[0].position.z).toBeGreaterThan(550);
  expect(views[0].position.z).toBeLessThan(700);
});

it('rejects implausible poses', () => {
  const tooFar = stereoMonoViews(calibration, [0], 'ring8', [{ at: 1000, size, markers: [facingMarker(0, 5000)] }, { at: 0, size, markers: [] }], 1000);
  expect(tooFar).toEqual([]);
});
