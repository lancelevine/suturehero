import { Quaternion, Vector3 } from 'three';
import { faceGeometry } from '../input/prismPose';

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

/**
 * ArUco IDs of the handle prism faces, per instrument, in face order (face
 * 0, 1, 2 going around the prism). Chosen by Lance: the two IDs right after
 * each 8-face ring, plus one free ID. (The legacy 3-face prism tracker's
 * scissors group also uses 8; that tracker is not in use.)
 */
export const HANDLE_PRISM_IDS = {
  needleDriver: [8, 9, 30],
  forceps: [18, 19, 31],
  scissors: [28, 29, 32],
} as const;

/**
 * Prism layout: the original 3-face prism tracker's (src/input/prismPose.ts,
 * type 'prism'): faces 120° apart around the prism's long axis, each
 * marker's top edge across that axis, faces in ID order. Only rotation is
 * used, so the prism's width does not matter.
 */

/** The closed→open rotation must be at least this large to define a hinge (radians). */
export const MIN_HINGE_SPAN_RADIANS = (5 * Math.PI) / 180;

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

/**
 * Largest rotation off the hinge axis a reading may have (radians). The
 * handle can only turn about its hinge, so a real reading differs from
 * closed by a twist about `axis` plus pose noise (1–3° per frame on 12 mm
 * markers). A lone face solved as its mirror image tilts the reading well
 * off the axis (tens of degrees) and is rejected instead of moving the jaws.
 */
export const MAX_HINGE_SWING_RADIANS = (15 * Math.PI) / 180;

/** How far `relative` is rotated off the hinge axis (radians): the swing part of closed⁻¹ · relative. */
export function hingeSwing(model: HingeModel, relative: Quaternion): number {
  const fromClosed = model.closed.clone().invert().multiply(relative).normalize();
  const twist = twistAngle(fromClosed, model.axis);
  const twistOnly = new Quaternion().setFromAxisAngle(model.axis, twist);
  const swing = fromClosed.multiply(twistOnly.invert()).normalize();
  return 2 * Math.acos(Math.min(1, Math.abs(swing.w)));
}

/** The candidate reading that best fits a turn about the hinge, or null if none is within MAX_HINGE_SWING_RADIANS. */
export function bestHingeReading<T>(model: HingeModel, candidates: readonly T[], relative: (candidate: T) => Quaternion): { candidate: T; swing: number } | null {
  let best: { candidate: T; swing: number } | null = null;
  for (const candidate of candidates) {
    const swing = hingeSwing(model, relative(candidate));
    if (!best || swing < best.swing) best = { candidate, swing };
  }
  return best && best.swing <= MAX_HINGE_SWING_RADIANS ? best : null;
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

/**
 * Capture samples further than this from the robust mean are outliers (radians).
 * Real single-camera ring and prism poses on 12 mm markers each wobble 1–3° per
 * frame with occasional flips, so the 3° "all samples" rule of build 0.109
 * failed with the instrument held still (Lance, 2026-11-08).
 */
export const CAPTURE_INLIER_RADIANS = (5 * Math.PI) / 180;
/** At least this share of a capture's samples must be inliers. */
export const MIN_CAPTURE_INLIER_FRACTION = 0.6;

function signAlignedMean(samples: readonly Quaternion[], reference: Quaternion): Quaternion {
  const sum = new Quaternion(0, 0, 0, 0);
  for (const q of samples) {
    const sign = q.dot(reference) < 0 ? -1 : 1;
    sum.set(sum.x + sign * q.x, sum.y + sign * q.y, sum.z + sign * q.z, sum.w + sign * q.w);
  }
  return sum.normalize();
}

export interface CaptureAverage {
  /** Mean of the inliers, or null if too few samples agree. */
  mean: Quaternion | null;
  inliers: number;
  /** Largest inlier distance from the mean, radians (or of all samples if rejected). */
  spread: number;
}

/**
 * Robust mean of a held-still capture: start from the sample with the most
 * neighbours, drop samples beyond CAPTURE_INLIER_RADIANS, average the rest.
 * Real movement during the capture leaves too few inliers and is rejected.
 */
export function averageRotation(samples: readonly Quaternion[]): CaptureAverage {
  if (!samples.length) return { mean: null, inliers: 0, spread: 0 };
  // Seed: the sample that most others lie near (ignores a flipped first sample).
  let seed = samples[0];
  let bestNeighbours = -1;
  for (const candidate of samples) {
    const neighbours = samples.filter((q) => q.angleTo(candidate) <= CAPTURE_INLIER_RADIANS).length;
    if (neighbours > bestNeighbours) {
      bestNeighbours = neighbours;
      seed = candidate;
    }
  }
  let mean = signAlignedMean(samples.filter((q) => q.angleTo(seed) <= CAPTURE_INLIER_RADIANS), seed);
  const inliers = samples.filter((q) => q.angleTo(mean) <= CAPTURE_INLIER_RADIANS);
  mean = signAlignedMean(inliers, mean);
  const enough = inliers.length >= Math.ceil(samples.length * MIN_CAPTURE_INLIER_FRACTION);
  const spread = Math.max(0, ...(enough ? inliers : samples).map((q) => q.angleTo(mean)));
  return { mean: enough ? mean : null, inliers: inliers.length, spread };
}

/** Readings in the rolling median (≈ 0.2–0.3 s at 15–25 Hz). */
export const OPENING_MEDIAN_SAMPLES = 5;
/** A jump larger than this (fraction of closed→open) must repeat before it is followed. */
export const OPENING_JUMP = 0.3;
/** Fraction of the way the output moves toward the median per reading. */
export const OPENING_SMOOTHING = 0.35;

/**
 * Steadies the hinge opening. Each raw reading comes from two single-camera
 * marker poses (ring and prism) that wobble and occasionally flip, so a
 * median rejects isolated outliers, a large jump must be seen twice in a row,
 * and light exponential smoothing removes the remaining jitter.
 */
export class OpeningFilter {
  private recent: number[] = [];
  private output: number | null = null;
  private pendingJump: number | null = null;

  update(raw: number): number {
    if (this.output !== null && Math.abs(raw - this.output) > OPENING_JUMP) {
      // First sighting of a large jump: hold until a second reading agrees.
      if (this.pendingJump === null || Math.abs(raw - this.pendingJump) > OPENING_JUMP / 2) {
        this.pendingJump = raw;
        return this.output;
      }
      // Confirmed: restart the median at the new opening.
      this.recent = [this.pendingJump];
    }
    this.pendingJump = null;
    this.recent.push(raw);
    if (this.recent.length > OPENING_MEDIAN_SAMPLES) this.recent.shift();
    const sorted = [...this.recent].sort((a, b) => a - b);
    const median = sorted[sorted.length >> 1];
    this.output = this.output === null ? median : this.output + (median - this.output) * OPENING_SMOOTHING;
    return this.output;
  }

  reset() {
    this.recent = [];
    this.output = null;
    this.pendingJump = null;
  }
}

/**
 * Per-face corrections for a prism whose faces are not laid out exactly as
 * the 3-face model assumes (order reversed, a sticker turned). With the jaws
 * still, every face must give the same handle-to-ring rotation; a face's
 * correction maps its reading onto the reference face's. Learned by
 * "Align prism faces" (handlePrismController.ts).
 */
export interface FaceLayout {
  /** Face index (0–2, order of HANDLE_PRISM_IDS) whose reading is used as-is. */
  reference: number;
  /** Correction per face, or null if that face has not been aligned (reference: identity). */
  corrections: Array<Quaternion | null>;
}

export function newFaceLayout(reference: number): FaceLayout {
  return { reference, corrections: [0, 1, 2].map((face) => (face === reference ? new Quaternion() : null)) };
}

/** Correction for a face from its mean relative rotation and the reference face's, both measured with the jaws still. */
export function faceCorrection(faceRelative: Quaternion, referenceRelative: Quaternion): Quaternion {
  return faceRelative.clone().invert().multiply(referenceRelative).normalize();
}

/** A face's relative rotation expressed as the reference face would read it, or null if the face is not aligned. */
export function correctedRelative(layout: FaceLayout, face: number, relative: Quaternion): Quaternion | null {
  const correction = layout.corrections[face];
  return correction ? relative.clone().multiply(correction).normalize() : null;
}

export function serializeFaceLayout(layout: FaceLayout) {
  return { version: 1 as const, reference: layout.reference, corrections: layout.corrections.map((q) => (q ? q.toArray() : null)) };
}

export function parseFaceLayout(value: unknown): FaceLayout | null {
  if (!value || typeof value !== 'object') return null;
  const saved = value as { version?: unknown; reference?: unknown; corrections?: unknown };
  if (saved.version !== 1 || typeof saved.reference !== 'number' || ![0, 1, 2].includes(saved.reference) || !Array.isArray(saved.corrections) || saved.corrections.length !== 3) return null;
  const corrections = saved.corrections.map((q) =>
    Array.isArray(q) && q.length === 4 && q.every((n) => typeof n === 'number' && Number.isFinite(n)) ? new Quaternion(...(q as [number, number, number, number])).normalize() : null,
  );
  if (!corrections[saved.reference]) return null;
  return { reference: saved.reference, corrections };
}

/** A measured face correction within this angle of a physically possible sticker layout is snapped to it (radians). */
export const FACE_SNAP_RADIANS = (25 * Math.PI) / 180;

/**
 * How a face's marker sits on the body, for a sticker that belongs on face k
 * but sits on face `position`, turned `quarterTurns` × 90° on its face:
 * derived body = true body × E. (Model marker frames: faceGeometry(·, 'prism').)
 */
function stickerError(face: number, position: number, quarterTurns: number): Quaternion {
  const model = faceGeometry(face, 'prism').rotation;
  const actual = faceGeometry(position, 'prism').rotation.clone().multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), (quarterTurns * Math.PI) / 2));
  return actual.multiply(model.clone().invert()).normalize();
}

/**
 * Snap a learned correction (faceCorrection) to the nearest one a real prism
 * can produce — the face's and the reference face's stickers each on any of
 * the three faces, turned by any multiple of 90° — removing single-camera
 * pose noise from it. Corrections that match nothing physical are kept.
 */
export function snapFaceCorrection(measured: Quaternion, face: number, reference: number): Quaternion {
  let best: Quaternion | null = null;
  let bestAngle = Infinity;
  for (let p = 0; p < 3; p++) for (let m = 0; m < 4; m++) {
    const faceError = stickerError(face, p, m);
    for (let pr = 0; pr < 3; pr++) for (let mr = 0; mr < 4; mr++) {
      const candidate = faceError.clone().invert().multiply(stickerError(reference, pr, mr)).normalize();
      const angle = candidate.angleTo(measured);
      if (angle < bestAngle) {
        bestAngle = angle;
        best = candidate;
      }
    }
  }
  return best && bestAngle <= FACE_SNAP_RADIANS ? best : measured.clone();
}
