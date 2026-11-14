import { Quaternion, Vector3 } from 'three';
import { trackedInstrumentRotation } from './trackingFrame';

/**
 * Stereo instruments in one shared frame (2026-11-14): with a calibrated tip
 * (src/input/stereoTipCalibration.ts), the instrument is placed at its real
 * tip position and its shaft is turned to point from the tip toward the
 * tracker ring, which sits on the handle.
 */

/**
 * `quaternion` (tracking-pose convention, before the model mounting) turned
 * by the smallest rotation that makes the model's shaft (+Z after mounting,
 * tip → handle) point along `tipToRing`. Roll about the shaft is kept.
 */
export function alignShaft(quaternion: Quaternion, tipToRing: Vector3): Quaternion {
  if (tipToRing.lengthSq() < 1e-12) return quaternion.clone();
  const shaft = new Vector3(0, 0, 1).applyQuaternion(trackedInstrumentRotation(quaternion));
  const fix = new Quaternion().setFromUnitVectors(shaft.normalize(), tipToRing.clone().normalize());
  return fix.multiply(quaternion).normalize();
}
