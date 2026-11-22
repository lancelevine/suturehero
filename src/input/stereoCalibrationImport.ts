import { parseCalibration, type StereoCalibration } from './stereoGeometry';

/** The two cameras currently selected on the tracking page (device ids; empty when none). */
export interface SelectedCameras { first: string; second: string }

/**
 * A stereo calibration accepted for the selected cameras (moved out of tracking.ts,
 * 2026-11-23). A fresh import needs two distinct, explicitly chosen cameras in the same
 * order as the calibration captures, and is then bound to them. A calibration restored
 * from storage is accepted as saved. Throws with a user-facing message otherwise.
 */
export function acceptStereoCalibration(raw: unknown, cameras: SelectedCameras, restore: boolean): StereoCalibration {
  const parsed = parseCalibration(raw);
  if (restore) return parsed;
  if (!cameras.first || !cameras.second || cameras.first === cameras.second) {
    throw Error('Select two distinct, explicitly identified cameras before importing.');
  }
  const ids = parsed.cameraIds;
  if (ids && ((ids.first && ids.first !== cameras.first) || (ids.second && ids.second !== cameras.second))) {
    throw Error('Select the same camera order used for the calibration captures.');
  }
  parsed.cameraIds = { first: cameras.first, second: cameras.second };
  return parsed;
}

/** Status line after a calibration is loaded. */
export function stereoCalibrationSummary(calibration: StereoCalibration): string {
  const baselineMm = Math.hypot(...calibration.stereo.translationMm).toFixed(1);
  const rms = calibration.stereo.rmsPx?.toFixed(2) ?? 'unknown';
  return `Calibration loaded · ${baselineMm} mm baseline · stereo RMS ${rms} px. Enable metric 3D after checking camera setup.`;
}
