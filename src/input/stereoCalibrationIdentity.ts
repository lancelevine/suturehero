import type { StereoCalibration } from './stereoGeometry';

/**
 * Stable identity for every value that defines a stereo camera coordinate system.
 * Workspace and table calibrations are only valid for this exact geometry.
 */
export function stereoCalibrationIdentity(calibration: StereoCalibration): string {
  return `stereo-geometry-v1:${JSON.stringify({
    imageSize: calibration.imageSize,
    camera1: {
      cameraMatrix: calibration.camera1.cameraMatrix,
      distortionCoefficients: calibration.camera1.distortionCoefficients,
      imageSize: calibration.camera1.imageSize ?? calibration.imageSize,
    },
    camera2: {
      cameraMatrix: calibration.camera2.cameraMatrix,
      distortionCoefficients: calibration.camera2.distortionCoefficients,
      imageSize: calibration.camera2.imageSize ?? calibration.imageSize,
    },
    stereo: {
      rotation: calibration.stereo.rotation,
      translationMm: calibration.stereo.translationMm,
    },
    cameraIds: calibration.cameraIds ?? null,
  })}`;
}
