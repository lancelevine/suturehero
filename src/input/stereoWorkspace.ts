import { Matrix3, Vector3 } from 'three';
import { stereoPracticePosition } from './stereoTrackingPose';

/**
 * Stereo workspace calibration: maps camera-1 millimetres to practice-scene
 * units along the user's own right / up / forward directions, at a scale that
 * fits their working space to the virtual pad.
 *
 * Without it, stereo used camera 1's axes directly (200 mm per unit), so a
 * forward move over a tilted camera's view became a diagonal in the scene.
 *
 * Scene convention (as before): +x right, +y up, −z away from the user.
 */

/** Practice units per mm before a sweep sets the scale (100 mm per unit). */
export const DEFAULT_UNITS_PER_MM = 0.01;
/** The sweep's larger horizontal extent maps to this many practice units (the pad spans about ±2). */
export const SWEEP_TARGET_UNITS = 4;
/** Guided moves shorter than this are too small to define an axis. */
export const MIN_GUIDE_MOVE_MM = 30;
/** The "up" move must agree with right × forward at least this well (cosine). */
export const MIN_UP_AGREEMENT = 0.5;
/** A sweep must cover at least this much horizontally to set the scale. */
export const MIN_SWEEP_EXTENT_MM = 40;

export interface StereoWorkspace {
  /** Neutral position, camera-1 mm. */
  origin: Vector3;
  /** Unit axes in camera-1 coordinates. */
  right: Vector3;
  up: Vector3;
  forward: Vector3;
  unitsPerMm: number;
}

export interface GuideCaptures {
  neutral: Vector3;
  right: Vector3;
  forward: Vector3;
  up: Vector3;
}

/** Orthonormal right/up/forward axes from the guided moves, or a reason they cannot be used. */
export function solveWorkspaceAxes(c: GuideCaptures): Omit<StereoWorkspace, 'unitsPerMm'> | { error: string } {
  const right = c.right.clone().sub(c.neutral);
  const forward = c.forward.clone().sub(c.neutral);
  const up = c.up.clone().sub(c.neutral);
  for (const [name, move] of [['right', right], ['forward', forward], ['up', up]] as const) {
    if (move.length() < MIN_GUIDE_MOVE_MM) return { error: `The ${name} move was only ${move.length().toFixed(0)} mm; move about 10 cm.` };
  }
  right.normalize();
  // Forward, made exactly perpendicular to right.
  forward.addScaledVector(right, -forward.dot(right));
  if (forward.length() < 1e-6) return { error: 'The forward move was parallel to the right move.' };
  forward.normalize();
  // Right-handed with +y up and +z toward the user (−forward): up = right × forward.
  const derivedUp = new Vector3().crossVectors(right, forward).normalize();
  if (derivedUp.dot(up.clone().normalize()) < MIN_UP_AGREEMENT) {
    return { error: 'The up move did not point up relative to the right and forward moves. Repeat right, forward and up from the neutral position.' };
  }
  return { origin: c.neutral.clone(), right, up: derivedUp, forward };
}

/** Workspace coordinates (mm along right, up, forward) of a camera-1 point. */
export function workspaceCoordinates(w: Omit<StereoWorkspace, 'unitsPerMm'>, mm: Vector3): Vector3 {
  const d = mm.clone().sub(w.origin);
  return new Vector3(d.dot(w.right), d.dot(w.up), d.dot(w.forward));
}

/** Scale that fits the swept workspace onto the pad, or a reason it cannot. */
export function sweepScale(w: Omit<StereoWorkspace, 'unitsPerMm'>, points: readonly Vector3[]): number | { error: string } {
  if (points.length < 10) return { error: 'Sweep too short; move through the whole working space.' };
  const local = points.map((p) => workspaceCoordinates(w, p));
  const extent = (axis: 'x' | 'z') => Math.max(...local.map((p) => p[axis])) - Math.min(...local.map((p) => p[axis]));
  const horizontal = Math.max(extent('x'), extent('z'));
  if (horizontal < MIN_SWEEP_EXTENT_MM) return { error: `The sweep only covered ${horizontal.toFixed(0)} mm; move through the whole working space.` };
  return SWEEP_TARGET_UNITS / horizontal;
}

/** Practice-scene position for a camera-1 mm point (falls back to the old camera-axis mapping). */
export function workspacePracticePosition(mm: Vector3, w: StereoWorkspace | null): Vector3 {
  if (!w) return stereoPracticePosition(mm);
  const local = workspaceCoordinates(w, mm);
  return new Vector3(local.x, local.y, -local.z).multiplyScalar(w.unitsPerMm);
}

export interface SavedStereoWorkspace {
  version: 1;
  /** Stereo calibration this was measured with (camera ids + baseline). */
  calibrationKey: string;
  origin: number[];
  right: number[];
  up: number[];
  forward: number[];
  unitsPerMm: number;
}

export function serializeWorkspace(w: StereoWorkspace, calibrationKey: string): SavedStereoWorkspace {
  return { version: 1, calibrationKey, origin: w.origin.toArray(), right: w.right.toArray(), up: w.up.toArray(), forward: w.forward.toArray(), unitsPerMm: w.unitsPerMm };
}

const vec = (v: unknown) =>
  Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === 'number' && Number.isFinite(n)) ? new Vector3(...(v as [number, number, number])) : null;

/** A saved workspace, only if it was measured with the same stereo calibration. */
export function parseWorkspace(value: unknown, calibrationKey: string): StereoWorkspace | null {
  if (!value || typeof value !== 'object') return null;
  const s = value as Partial<SavedStereoWorkspace>;
  if (s.version !== 1 || s.calibrationKey !== calibrationKey) return null;
  const origin = vec(s.origin), right = vec(s.right), up = vec(s.up), forward = vec(s.forward);
  if (!origin || !right || !up || !forward || typeof s.unitsPerMm !== 'number' || !(s.unitsPerMm > 0 && s.unitsPerMm < 1)) return null;
  // Axes must still be orthonormal.
  const m = new Matrix3().set(right.x, up.x, forward.x, right.y, up.y, forward.y, right.z, up.z, forward.z);
  if (Math.abs(Math.abs(m.determinant()) - 1) > 1e-3) return null;
  return { origin, right, up, forward, unitsPerMm: s.unitsPerMm };
}
