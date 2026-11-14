import type { Point, StereoCalibration } from './stereoGeometry';

/**
 * Projects a camera-1 millimetre point into camera 1 or 2 pixels with the
 * stereo calibration (lens distortion included), scaled to a canvas of
 * `size` (the overlay, which may be smaller than the calibrated image).
 * The inverse of what stereoGeometry.undistort does for triangulation.
 * Null behind the camera.
 */
export function projectToCamera(calibration: StereoCalibration, pointMm: readonly [number, number, number], camera: 1 | 2, size: { width: number; height: number }): Point | null {
  let [x, y, z] = pointMm;
  if (camera === 2) {
    const r = calibration.stereo.rotation, t = calibration.stereo.translationMm;
    [x, y, z] = [0, 1, 2].map((i) => r[i][0] * pointMm[0] + r[i][1] * pointMm[1] + r[i][2] * pointMm[2] + t[i]);
  }
  if (!(z > 1e-6)) return null;
  const intrinsic = camera === 1 ? calibration.camera1 : calibration.camera2;
  const calibrated = intrinsic.imageSize ?? calibration.imageSize;
  const k = intrinsic.cameraMatrix;
  const [k1 = 0, k2 = 0, p1 = 0, p2 = 0, k3 = 0] = intrinsic.distortionCoefficients;
  const xn = x / z, yn = y / z, r2 = xn * xn + yn * yn;
  const radial = 1 + k1 * r2 + k2 * r2 * r2 + k3 * r2 * r2 * r2;
  const xd = xn * radial + 2 * p1 * xn * yn + p2 * (r2 + 2 * xn * xn);
  const yd = yn * radial + p1 * (r2 + 2 * yn * yn) + 2 * p2 * xn * yn;
  const sx = size.width / calibrated.width, sy = size.height / calibrated.height;
  return { x: (k[0][0] * xd + k[0][2]) * sx, y: (k[1][1] * yd + k[1][2]) * sy };
}
