import { Quaternion, Vector3 } from 'three';
import { triangulate, type StereoCalibration } from '../input/stereoGeometry';

/**
 * Handle-prism jaw opening from both cameras (stereo).
 *
 * A single camera reads the 3D rotation of one 12 mm prism face badly: in
 * Lance's 11:21 AM recording it often jumped 40–160° to the other "mirror"
 * solution, and single-camera depth was off by hundreds of mm. Triangulating
 * the face's corners with both cameras gives positions to about a millimetre,
 * with no ambiguity. Opening the jaws moves the prism ~15–20 mm along an arc
 * relative to the ring, while rolling the instrument does not move it relative
 * to the ring, so the opening is measured from the prism's position in the
 * ring's frame. Synthetic tests only until checked on real hardware.
 */

type Pixel = { x: number; y: number };
type Size = { width: number; height: number };

/** Rays farther apart than this at a corner mean a mismatched or blurred detection (mm). */
export const MAX_CORNER_RAY_GAP_MM = 3;
/** Default prism face width (mm): 12 mm square on a 19 mm face, like the ring pads. */
export const DEFAULT_PRISM_FACE_WIDTH_MM = 19;
/** The closed→open movement must be at least this long to calibrate (mm). */
export const MIN_STEREO_TRAVEL_MM = 3;

/** 3D corners (camera-1 mm) of one marker seen by both cameras, or null if any corner fails. */
export function triangulateMarker(calibration: StereoCalibration, first: Pixel[], second: Pixel[], size1: Size, size2: Size): Vector3[] | null {
  if (first.length !== 4 || second.length !== 4) return null;
  const points: Vector3[] = [];
  for (let i = 0; i < 4; i++) {
    const p = triangulate(calibration, first[i], second[i], size1, size2);
    if (!p || p.rayGapMm > MAX_CORNER_RAY_GAP_MM) return null;
    points.push(new Vector3(...p.xyzMm));
  }
  return points;
}

/** Inradius of an equilateral triangular prism with this face width (mm). */
export const prismApothem = (faceWidthMm: number) => faceWidthMm / (2 * Math.sqrt(3));

/**
 * The prism's central axis next to one face: the face's centre moved inward by
 * the prism's apothem, so every face gives (nearly) the same point. For
 * markers in ArUco corner order, corner0→1 × corner0→3 points out of the
 * object (towards the viewer), so inward is its negation.
 */
export function prismAxisPoint(corners: Vector3[], apothemMm: number): Vector3 {
  const center = corners.reduce((sum, p) => sum.add(p), new Vector3()).multiplyScalar(0.25);
  const outward = new Vector3().crossVectors(corners[1].clone().sub(corners[0]), corners[3].clone().sub(corners[0])).normalize();
  const inward = outward.negate();
  return center.addScaledVector(inward, apothemMm);
}

/** A camera-1 point in the ring's own frame. */
export function inRingFrame(point: Vector3, ring: { quaternion: Quaternion; translation: Vector3 }): Vector3 {
  return point.clone().sub(ring.translation).applyQuaternion(ring.quaternion.clone().invert());
}

export interface StereoHandleModel {
  /** Prism axis point in the ring frame with the jaws closed / open (mm). */
  closed: Vector3;
  open: Vector3;
}

/** Opening 0 (closed) … 1 (calibrated open) from the prism position, clamped to 0–1.2. */
export function stereoOpening(model: StereoHandleModel, point: Vector3): number {
  const travel = model.open.clone().sub(model.closed);
  const lengthSquared = travel.lengthSq();
  if (lengthSquared < 1e-9) return 0;
  return Math.min(1.2, Math.max(0, point.clone().sub(model.closed).dot(travel) / lengthSquared));
}

/** Robust mean of captured points: per-axis median, then the mean of points within 3 mm of it. */
export function robustPoint(points: readonly Vector3[]): { point: Vector3; inliers: number } | null {
  if (!points.length) return null;
  const median = (values: number[]) => { const s = [...values].sort((a, b) => a - b); return s[s.length >> 1]; };
  const center = new Vector3(median(points.map((p) => p.x)), median(points.map((p) => p.y)), median(points.map((p) => p.z)));
  const near = points.filter((p) => p.distanceTo(center) <= 3);
  if (near.length < Math.ceil(points.length * 0.6)) return null;
  return { point: near.reduce((s, p) => s.add(p), new Vector3()).multiplyScalar(1 / near.length), inliers: near.length };
}

export function serializeStereoHandle(model: StereoHandleModel) {
  return { version: 1 as const, closed: model.closed.toArray(), open: model.open.toArray() };
}

export function parseStereoHandle(value: unknown): StereoHandleModel | null {
  if (!value || typeof value !== 'object') return null;
  const s = value as { version?: unknown; closed?: unknown; open?: unknown };
  const vec = (v: unknown) => (Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === 'number' && Number.isFinite(n)) ? new Vector3(...(v as [number, number, number])) : null);
  const closed = vec(s.closed), open = vec(s.open);
  if (s.version !== 1 || !closed || !open || closed.distanceTo(open) < MIN_STEREO_TRAVEL_MM) return null;
  return { closed, open };
}
