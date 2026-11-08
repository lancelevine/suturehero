import { Quaternion, Vector3 } from 'three';

/**
 * Jaw opening from a triangular marker prism on the moving handle.
 *
 * Only one handle moves relative to the ring tracker, so the jaw opening is
 * that handle's rotation about the hinge, measured relative to the ring. The
 * hinge axis is not measured by hand: it is learned from a "closed" and an
 * "open" capture, as the axis of the rotation between them. Rotation about
 * any other axis (pose noise) is ignored.
 *
 * Synthetic tests only so far; not yet validated on real hardware.
 */

/** ArUco IDs of the handle prism faces, per instrument (4×4_50 dictionary; rings use 0–27). */
export const HANDLE_PRISM_IDS = {
  needleDriver: [30, 31, 32],
  forceps: [33, 34, 35],
  scissors: [36, 37, 38],
} as const;

/** Faces of an equilateral triangular prism, evenly spaced about its long (x) axis. */
export const HANDLE_PRISM_FACES = 3;

/** The closed→open rotation must be at least this large to define a hinge (radians). */
export const MIN_HINGE_SPAN_RADIANS = (5 * Math.PI) / 180;

/**
 * Rotation from a face's marker frame to the prism body frame. Face k's
 * marker is turned k·120° about the prism's long (x) axis.
 */
export function faceToBody(face: number): Quaternion {
  const angle = (face * 2 * Math.PI) / HANDLE_PRISM_FACES;
  return new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -angle);
}

/** Prism body orientation (camera frame) from one face's marker orientation. */
export function prismBodyFromFace(markerRotation: Quaternion, face: number): Quaternion {
  return markerRotation.clone().multiply(faceToBody(face)).normalize();
}

/** Handle orientation relative to the ring: ring⁻¹ · handle. */
export function handleRelativeToRing(ring: Quaternion, handle: Quaternion): Quaternion {
  return ring.clone().invert().multiply(handle).normalize();
}

export interface HingeModel {
  /** Relative handle rotation with the jaws closed. */
  closed: Quaternion;
  /** Unit hinge axis, in the closed handle frame. */
  axis: Vector3;
  /** Signed rotation about `axis` from closed to open (radians). */
  openAngle: number;
}

/** Signed twist angle of `q` about unit `axis` (swing-twist decomposition). */
export function twistAngle(q: Quaternion, axis: Vector3): number {
  const projection = q.x * axis.x + q.y * axis.y + q.z * axis.z;
  return 2 * Math.atan2(projection, q.w);
}

/** Hinge model from closed and open captures (relative rotations), or why it cannot be built. */
export function solveHinge(closed: Quaternion, open: Quaternion): HingeModel | { error: string } {
  const delta = closed.clone().invert().multiply(open).normalize();
  if (delta.w < 0) delta.set(-delta.x, -delta.y, -delta.z, -delta.w);
  const angle = 2 * Math.acos(Math.min(1, delta.w));
  if (angle < MIN_HINGE_SPAN_RADIANS) {
    return { error: `The handle only turned ${((angle * 180) / Math.PI).toFixed(1)}° between closed and open; open the jaws fully.` };
  }
  const axis = new Vector3(delta.x, delta.y, delta.z).normalize();
  return { closed: closed.clone(), axis, openAngle: angle };
}

/** Jaw opening, 0 = closed … 1 = calibrated open (clamped to 0–1.2). */
export function hingeOpening(model: HingeModel, relative: Quaternion): number {
  const fromClosed = model.closed.clone().invert().multiply(relative).normalize();
  const opening = twistAngle(fromClosed, model.axis) / model.openAngle;
  return Math.min(1.2, Math.max(0, opening));
}

export interface SavedHinge {
  version: 1;
  closed: number[];
  axis: number[];
  openAngle: number;
}

export function serializeHinge(model: HingeModel): SavedHinge {
  return { version: 1, closed: model.closed.toArray(), axis: model.axis.toArray(), openAngle: model.openAngle };
}

export function parseHinge(value: unknown): HingeModel | null {
  if (!value || typeof value !== 'object') return null;
  const saved = value as Partial<SavedHinge>;
  const numbers = (v: unknown, n: number) => Array.isArray(v) && v.length === n && v.every((x) => typeof x === 'number' && Number.isFinite(x));
  if (saved.version !== 1 || !numbers(saved.closed, 4) || !numbers(saved.axis, 3)) return null;
  if (typeof saved.openAngle !== 'number' || !(saved.openAngle >= MIN_HINGE_SPAN_RADIANS && saved.openAngle < Math.PI)) return null;
  const axis = new Vector3(...(saved.axis as [number, number, number]));
  if (Math.abs(axis.length() - 1) > 1e-3) return null;
  return { closed: new Quaternion(...(saved.closed as [number, number, number, number])).normalize(), axis, openAngle: saved.openAngle };
}
