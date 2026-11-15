import { describe, expect, it } from 'vitest';
import type { StereoCalibration } from './stereoGeometry';
import { stereoCalibrationIdentity } from './stereoCalibrationIdentity';

const calibration = (): StereoCalibration => ({
  format: 'suturehero-stereo-calibration-v1',
  imageSize: { width: 1280, height: 800 },
  camera1: {
    cameraMatrix: [[900, 0, 640], [0, 900, 400], [0, 0, 1]],
    distortionCoefficients: [0.1, -0.02, 0, 0, 0],
  },
  camera2: {
    cameraMatrix: [[905, 0, 638], [0, 904, 398], [0, 0, 1]],
    distortionCoefficients: [0.09, -0.01, 0, 0, 0],
  },
  stereo: {
    rotation: [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
    translationMm: [-120, 0, 0],
  },
  cameraIds: { first: 'camera-a', second: 'camera-b' },
});

describe('stereoCalibrationIdentity', () => {
  it('is stable for equivalent calibration data', () => {
    expect(stereoCalibrationIdentity(calibration())).toBe(stereoCalibrationIdentity(calibration()));
  });

  it('changes when geometry changes despite the same cameras and baseline', () => {
    const original = calibration();
    const rotated = calibration();
    rotated.stereo.rotation[0][1] = 0.01;
    const refocused = calibration();
    refocused.camera1.cameraMatrix[0][0] = 950;

    expect(stereoCalibrationIdentity(rotated)).not.toBe(stereoCalibrationIdentity(original));
    expect(stereoCalibrationIdentity(refocused)).not.toBe(stereoCalibrationIdentity(original));
  });
});
