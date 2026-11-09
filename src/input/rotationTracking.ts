import * as THREE from 'three';
import type { PrismPose } from './prismPose';

/**
 * Per-instrument rotation tracking for the tracker body (moved out of
 * updateLiveTargets in src/tracking.ts on 2026-11-09 without changing
 * behaviour). The solver gives a raw body rotation each frame; these
 * functions predict the next rotation, decide whether a new reading is
 * credible (a lone planar face can briefly return a mirrored solution), and
 * update the state.
 */

export interface RigidBodyState {
  /** Raw rotation and output rotation when tracking (re)started: output = anchorOutput · anchorRaw⁻¹ · raw. */
  anchorRaw: THREE.Quaternion;
  anchorOutput: THREE.Quaternion;
  lastRaw: THREE.Quaternion;
  lastAt: number;
  pose: PrismPose;
  stallSince: number | null;
  status: 'tracking' | 'stalled' | 'reacquiring';
  /** Body angular velocity (rad/s, axis × speed). */
  angularVelocity: THREE.Vector3;
}

/** The ring face being followed, and a candidate new face awaiting confirmation. */
export interface FaceTransitionState {
  faceId: number;
  candidateId: number | null;
  candidateCount: number;
}

/** Predict at most this far ahead (s). */
const MAX_PREDICTION_S = 0.09;
/** Largest predicted step (rad). */
const MAX_PREDICTED_STEP_RAD = 0.45;

/** The last rotation advanced by the angular velocity, for seeding the solver. */
export function predictRotation(state: RigidBodyState, now: number): PrismPose {
  const dt = Math.min(MAX_PREDICTION_S, Math.max(0, (now - state.lastAt) / 1000));
  const step = state.angularVelocity.clone().multiplyScalar(dt);
  const angle = step.length();
  const quaternion = state.lastRaw.clone();
  if (angle > 1e-5) quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(step.normalize(), Math.min(angle, MAX_PREDICTED_STEP_RAD)));
  return { ...state.pose, quaternion };
}

/** A fresh tracking state anchored so the output continues from `output`. */
export function startRigidBody(raw: PrismPose, output: THREE.Quaternion, now: number): RigidBodyState {
  return {
    anchorRaw: raw.quaternion.clone(),
    anchorOutput: output.clone(),
    lastRaw: raw.quaternion.clone(),
    lastAt: now,
    pose: raw,
    stallSince: null,
    status: 'tracking',
    angularVelocity: new THREE.Vector3(),
  };
}

/** Elapsed time used for velocity and gates (s), clamped to 16–150 ms. */
export const gateElapsedSeconds = (state: RigidBodyState, now: number) => Math.max(0.016, Math.min(0.15, (now - state.lastAt) / 1000));

/**
 * Counts consecutive fresh sightings of a new face (in place). A sighting that
 * is not fresh leaves the count; seeing the current face again clears it.
 */
export function updateFaceTransition(transition: FaceTransitionState, currentFace: number | null, newFaceFresh: boolean) {
  const changedFace = currentFace !== null && currentFace !== transition.faceId;
  if (newFaceFresh) {
    transition.candidateCount = transition.candidateId === currentFace ? transition.candidateCount + 1 : 1;
    transition.candidateId = currentFace;
  } else if (!changedFace) {
    transition.candidateId = null;
    transition.candidateCount = 0;
  }
}

export interface RotationGateInput {
  /** Solver fit error (px) and number of faces in the solve. */
  error: number;
  faces: number;
  stereo: boolean;
  /** Angle from the last accepted raw rotation (rad). */
  angularDifference: number;
  /** Angle from the predicted rotation (rad); Infinity without a prediction. */
  predictedDifference: number;
  elapsedSeconds: number;
  /** Time since the last accepted rotation (ms). */
  staleMs: number;
  /** A face in the solve was decoded within the last 110 ms. */
  freshDecodedFace: boolean;
  /** Experimental flow rotation is on and a solve marker moved within 100 ms. */
  flowRotationRecent: boolean;
  faceTransitionEnabled: boolean;
  /** The current face differs from the followed one and was decoded within 180 ms. */
  newFaceFresh: boolean;
  /** Consecutive fresh sightings of the candidate face. */
  candidateCount: number;
}

export type RotationVerdict = 'accepted' | 'face transition accepted' | 'fast face accepted' | 'flow accepted' | 'reacquired' | 'rejected';

/**
 * Whether a new rotation reading is credible. Multi-face and stereo solves
 * are accepted when they fit; a lone face must stay continuous unless one of
 * the special cases applies (fresh well-fitted face, small flow increment,
 * confirmed face transition, or reacquiring after a pause).
 */
export function rotationVerdict(input: RotationGateInput): RotationVerdict {
  const singleFaceLimit = Math.max(0.35, input.elapsedSeconds * 10);
  const reacquire = input.staleMs > 220 && input.error < (input.stereo ? 4 : 5);
  const fastFaceTransition = !input.stereo && input.faces === 1 && input.freshDecodedFace && input.error < 2.0 && input.angularDifference < Math.PI * 0.85;
  const flowIncrement = input.flowRotationRecent && !input.stereo && input.faces === 1 && input.error < 3 && input.angularDifference < Math.max(0.55, input.elapsedSeconds * 14);
  const faceTransitionAccepted = input.faceTransitionEnabled && !input.stereo && input.newFaceFresh && input.candidateCount >= 2 && input.error < 2.5 && input.predictedDifference < 0.85 && input.angularDifference < 2.5;
  const credible = input.error < (input.stereo ? 5 : 10)
    && (input.stereo || input.faces >= 2 || input.angularDifference < singleFaceLimit || fastFaceTransition || flowIncrement || faceTransitionAccepted || reacquire);
  if (!credible) return 'rejected';
  return faceTransitionAccepted ? 'face transition accepted' : fastFaceTransition ? 'fast face accepted' : flowIncrement ? 'flow accepted' : reacquire ? 'reacquired' : 'accepted';
}

/** Largest angular step used to update the velocity estimate (rad), and the speed cap (rad/s). */
const MAX_VELOCITY_STEP_RAD = 1.2;
const MAX_ANGULAR_SPEED = 12;
const VELOCITY_SMOOTHING = 0.25;

/**
 * Applies an accepted reading: returns the output rotation (from the anchor,
 * so face switches do not accumulate error) and updates velocity and state.
 */
export function acceptRotation(state: RigidBodyState, raw: PrismPose, now: number, elapsedSeconds: number, angularDifference: number): THREE.Quaternion {
  const motion = state.lastRaw.clone().invert().multiply(raw.quaternion).normalize();
  const output = state.anchorOutput.clone().multiply(state.anchorRaw.clone().invert().multiply(raw.quaternion)).normalize();
  const axis = new THREE.Vector3(motion.x, motion.y, motion.z);
  if (axis.lengthSq() > 1e-9 && angularDifference < MAX_VELOCITY_STEP_RAD) {
    axis.normalize().multiplyScalar((angularDifference / elapsedSeconds) * (motion.w < 0 ? -1 : 1));
    state.angularVelocity.lerp(axis, VELOCITY_SMOOTHING);
    if (state.angularVelocity.length() > MAX_ANGULAR_SPEED) state.angularVelocity.setLength(MAX_ANGULAR_SPEED);
  }
  state.lastRaw.copy(raw.quaternion);
  state.lastAt = now;
  state.pose = raw;
  state.stallSince = null;
  state.status = 'tracking';
  return output;
}

/** No credible reading: mark stalled and let the velocity decay. */
export function stallRotation(state: RigidBodyState, now: number) {
  state.stallSince ??= now;
  state.status = 'stalled';
  state.angularVelocity.multiplyScalar(0.85);
}

/** ID of the marker with the largest image area (the face rotation follows), or null if none. Ties keep the earlier marker. */
export function largestFaceId(markers: ReadonlyArray<{ id: number; corners: ReadonlyArray<{ x: number; y: number }> }>): number | null {
  if (!markers.length) return null;
  const area = (corners: ReadonlyArray<{ x: number; y: number }>) =>
    Math.abs(corners.reduce((sum, p, i) => {
      const next = corners[(i + 1) % corners.length];
      return sum + p.x * next.y - next.x * p.y;
    }, 0));
  return markers.reduce((a, b) => (area(a.corners) >= area(b.corners) ? a : b)).id;
}

/** Keep following the previous face while its planar fit stays under this (px). */
export const KEEP_FACE_MAX_ERROR_PX = 4;

/**
 * The face to follow: the previous one while it still fits well, else the
 * best-fitting candidate (candidates sorted by fit error, best first).
 */
export function chooseFace<T extends { pose: { id: number; reprojectionError: number } }>(sortedCandidates: readonly T[], previousId: number | undefined): T | undefined {
  const kept = previousId === undefined ? undefined : sortedCandidates.find((c) => c.pose.id === previousId && c.pose.reprojectionError < KEEP_FACE_MAX_ERROR_PX);
  return kept ?? sortedCandidates[0];
}

/** Instrument held still: keep the rotation state current without motion. */
export function restRigidBody(state: RigidBodyState, now: number) {
  state.lastAt = now;
  state.angularVelocity.set(0, 0, 0);
  state.stallSince = null;
}

/** A stereo ring rotation: fit error and number of faces used. */
export interface StereoRingRotation {
  quaternion: THREE.Quaternion;
  errorPx: number;
  faces: number;
}

/**
 * The rotation reading for this frame: the stereo one when available (it
 * counts as at least two faces and keeps the one-camera translation), else
 * the one-camera solve.
 */
export function combineRotation(mono: PrismPose | null | undefined, stereo: StereoRingRotation | null | undefined): { rigid: PrismPose | null; source: 'stereo' | 'mono' } {
  if (stereo) {
    const rigid = { quaternion: stereo.quaternion, translation: mono?.translation ?? new THREE.Vector3(), error: stereo.errorPx, faces: Math.max(2, stereo.faces) } as PrismPose;
    return { rigid, source: 'stereo' };
  }
  return { rigid: mono ?? null, source: 'mono' };
}

/** Ring side faces per tracker (IDs firstId … firstId+5); the angled faces come after. */
const RING_SIDE_FACE_COUNT = 6;

/** On the 8-face ring, follow the side faces when any are visible (they give the most precise pose). */
export function rotationFaceMarkers<T extends { id: number }>(markers: readonly T[], firstId: number, ring8: boolean): readonly T[] {
  const side = markers.filter((m) => m.id < firstId + RING_SIDE_FACE_COUNT);
  return ring8 && side.length ? side : markers;
}
