import { Quaternion, Vector3 } from 'three';

/**
 * Pivot (tip) calibration for a tracked instrument (2026-11-14).
 *
 * The user rests the instrument tip on one spot and rocks the instrument.
 * Each stereo sample gives the tracker body pose in camera-1 millimetres
 * (rotation R, position p). The tip is fixed in the body (offset t) and on
 * the spot (pivot q), so p + R·t = q for every sample. Least squares over
 * all samples gives t (tip in the body frame) and q.
 *
 * With t, the tip of either instrument is p + R·t in one shared camera
 * frame, so two instruments whose real tips touch get virtual tips that
 * touch, instead of the fixed 55 / 110 mm guesses (trackerTipDistanceMm).
 */

export interface PivotSample {
  /** Tracker body position, camera-1 mm. */
  position: Vector3;
  /** Tracker body rotation in camera 1. */
  quaternion: Quaternion;
}

export interface PivotResult {
  /** Tip in the tracker body frame (mm). */
  tipInBody: Vector3;
  /** The spot the tip rested on, camera-1 mm. */
  pivot: Vector3;
  /** RMS distance of each sample's tip from the pivot (mm). */
  rmsMm: number;
  samples: number;
}

/** Fewer samples than this cannot give a reliable tip. */
export const MIN_PIVOT_SAMPLES = 30;
/** The instrument must be rocked through at least this angle (degrees) around the spot. */
export const MIN_PIVOT_SPREAD_DEGREES = 20;
/** A result whose tips scatter more than this (mm RMS) is refused: the tip slid or tracking was poor. */
export const MAX_PIVOT_RMS_MM = 3;

/** Largest angle (degrees) between any sample's rotation and the first one. */
function rotationSpreadDegrees(samples: readonly PivotSample[]): number {
  const first = samples[0].quaternion;
  let largest = 0;
  for (const sample of samples) largest = Math.max(largest, first.angleTo(sample.quaternion));
  return (largest * 180) / Math.PI;
}

/** Solves the symmetric linear system A·x = b (Gaussian elimination with partial pivoting); null if singular. */
function solveLinear(matrix: number[][], vector: number[]): number[] | null {
  const n = vector.length;
  const a = matrix.map((row, i) => [...row, vector[i]]);
  for (let column = 0; column < n; column++) {
    let best = column;
    for (let row = column + 1; row < n; row++) if (Math.abs(a[row][column]) > Math.abs(a[best][column])) best = row;
    if (Math.abs(a[best][column]) < 1e-9) return null;
    [a[column], a[best]] = [a[best], a[column]];
    for (let row = 0; row < n; row++) {
      if (row === column) continue;
      const factor = a[row][column] / a[column][column];
      for (let k = column; k <= n; k++) a[row][k] -= factor * a[column][k];
    }
  }
  return a.map((row, i) => row[n] / row[i]);
}

/** The tip offset and pivot point from rocking samples, or why they cannot be used. */
export function solvePivot(samples: readonly PivotSample[]): PivotResult | { error: string } {
  if (samples.length < MIN_PIVOT_SAMPLES) return { error: `Only ${samples.length} stereo poses; keep rocking until at least ${MIN_PIVOT_SAMPLES} are collected.` };
  const spread = rotationSpreadDegrees(samples);
  if (spread < MIN_PIVOT_SPREAD_DEGREES) return { error: `The instrument only turned ${spread.toFixed(0)}°; rock it further (about 30° each way) while the tip stays on the spot.` };
  // Unknowns x = [t (3), q (3)]. Each sample: [R  −I]·x = −p. Normal equations (6×6).
  const normal = Array.from({ length: 6 }, () => new Array(6).fill(0));
  const rhs = new Array(6).fill(0);
  for (const sample of samples) {
    const r = new Vector3();
    const columns = [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)].map((axis) => r.copy(axis).applyQuaternion(sample.quaternion).toArray());
    for (let row = 0; row < 3; row++) {
      const coefficients = [columns[0][row], columns[1][row], columns[2][row], row === 0 ? -1 : 0, row === 1 ? -1 : 0, row === 2 ? -1 : 0];
      const target = -sample.position.getComponent(row);
      for (let i = 0; i < 6; i++) {
        rhs[i] += coefficients[i] * target;
        for (let j = 0; j < 6; j++) normal[i][j] += coefficients[i] * coefficients[j];
      }
    }
  }
  const solution = solveLinear(normal, rhs);
  if (!solution) return { error: 'The poses do not determine a tip; rock the instrument in two directions.' };
  const tipInBody = new Vector3(solution[0], solution[1], solution[2]);
  const pivot = new Vector3(solution[3], solution[4], solution[5]);
  let squared = 0;
  for (const sample of samples) squared += tipPosition(sample, tipInBody).distanceToSquared(pivot);
  const rmsMm = Math.sqrt(squared / samples.length);
  if (rmsMm > MAX_PIVOT_RMS_MM) return { error: `The tip positions scattered ${rmsMm.toFixed(1)} mm; keep the tip still on one spot and rock more slowly.` };
  return { tipInBody, pivot, rmsMm, samples: samples.length };
}

/** The tip in camera-1 mm for a tracker body pose and a calibrated tip offset. */
export function tipPosition(pose: PivotSample, tipInBody: Vector3): Vector3 {
  return tipInBody.clone().applyQuaternion(pose.quaternion).add(pose.position);
}
