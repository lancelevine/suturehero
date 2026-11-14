import { describe, expect, it } from 'vitest';
import { triangulate, type StereoCalibration } from './stereoGeometry';
import { projectToCamera } from './stereoProjection';

const camera = (fx: number, d: number[]) => ({ cameraMatrix: [[fx, 0, 960], [0, fx, 540], [0, 0, 1]], distortionCoefficients: d });
const calibration: StereoCalibration = {
  format: 'suturehero-stereo-calibration-v1', imageSize: { width: 1920, height: 1080 },
  camera1: camera(1300, [-0.3, 0.08, 0.001, -0.0005, 0]), camera2: camera(1320, [-0.28, 0.06, 0, 0, 0]),
  stereo: { rotation: [[Math.cos(0.3), 0, Math.sin(0.3)], [0, 1, 0], [-Math.sin(0.3), 0, Math.cos(0.3)]], translationMm: [-250, 5, 40] },
};

describe('stereo projection', () => {
  it('projects a point that triangulates back to itself (both cameras, with distortion, at overlay scale)', () => {
    const point: [number, number, number] = [40, -25, 520];
    const size = { width: 960, height: 540 };
    const a = projectToCamera(calibration, point, 1, size)!, b = projectToCamera(calibration, point, 2, size)!;
    const back = triangulate(calibration, a, b, size, size)!;
    back.xyzMm.forEach((value, i) => expect(value).toBeCloseTo(point[i], 1));
  });
  it('puts the optical axis at the principal point and refuses points behind the camera', () => {
    const p = projectToCamera(calibration, [0, 0, 500], 1, { width: 1920, height: 1080 })!;
    expect(p.x).toBeCloseTo(960, 9);
    expect(p.y).toBeCloseTo(540, 9);
    expect(projectToCamera(calibration, [0, 0, -100], 1, { width: 1920, height: 1080 })).toBeNull();
  });
});
