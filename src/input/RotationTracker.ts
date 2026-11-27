import * as THREE from 'three';
import { trackingPerformance as perf } from '../diagnostics/TrackingPerformance';
import type { MarkerObservation } from './arucoTracking';
import { solvePrismPose, type PrismPose, type TrackerType } from './prismPose';
import type { RingPoseTracker } from './RingPoseTracker';
import {
  acceptRotation,
  combineRotation,
  gateElapsedSeconds,
  largestFaceId,
  predictRotation,
  restRigidBody,
  rotationFaceMarkers,
  rotationVerdict,
  stallRotation,
  startRigidBody,
  updateFaceTransition,
  type FaceTransitionState,
  type RigidBodyState,
  type StereoRingRotation,
} from './rotationTracking';

/** Decoded within this long (ms), a marker counts for rotation; longer with continuous flow rotation. */
const ROTATION_DECODE_MS = 350;
const FLOW_ROTATION_DECODE_MS = 650;
/** A face decoded this recently (ms) counts as fresh for the rotation gate. */
const FRESH_FACE_MS = 110;
/** Flow confirmed a marker this recently (ms). */
const RECENT_FLOW_MS = 100;
/** A newly visible face decoded this recently (ms) may start a face transition. */
const NEW_FACE_FRESH_MS = 180;

/** What the rotation step reads from the tracking page for one instrument. */
export interface RotationContext {
  /** This instrument's marker IDs, first ID first. */
  ids: readonly number[];
  trackerType: TrackerType;
  /** Single-camera mode (ring alignment and the experimental options apply only there). */
  mono: boolean;
  width: number;
  height: number;
  /** Experimental options (tracking page checkboxes). */
  flowRotation: boolean;
  faceTransition: boolean;
  /** Live markers of these IDs decoded within `maxAgeMs`. */
  recentlyDecoded(ids: readonly number[], maxAgeMs: number): MarkerObservation[];
  /** When a marker ID was last decoded (performance.now()), if ever. */
  lastDecodedAt(id: number): number | undefined;
  /** Time since flow last confirmed a marker (ms). */
  markerAge(id: number): number;
  /** This instrument's 8-face ring tracker: created when `create`, else only if it exists. */
  ringTracker(create: boolean): RingPoseTracker | undefined;
  /** The fused two-camera ring rotation, when stereo is active. */
  stereoRotation(): StereoRingRotation | null;
  /** Diagnostics: raw solver orientation and status (src/ui/rotationStageReadout.ts). */
  stageRaw: Map<string, THREE.Quaternion>;
  stageStatus: Map<string, string>;
  /** The "#rotation-solver-status" line. */
  setSolverStatus(text: string): void;
  /** Raw angular change this frame (degrees), for the depth diagnostics line. */
  setAngleDegrees(degrees: number): void;
}

/**
 * Each instrument's rigid-body rotation (moved out of src/tracking.ts, 2026-11-27): solve all
 * visible tracker faces as one rigid object (or take the stereo rotation), gate the change
 * (src/input/rotationTracking.ts), and keep it continuous across face changes. Never alters the
 * instrument's translation.
 */
export class RotationTracker<Name extends string = string> {
  private readonly rigidBodies = new Map<Name, RigidBodyState>();
  private readonly faceTransitions = new Map<Name, FaceTransitionState>();
  private readonly sources = new Map<Name, 'mono' | 'stereo'>();

  reset() {
    this.rigidBodies.clear();
    this.sources.clear();
  }

  /** Whether this instrument already has a rotation state (a still instrument keeps it). */
  has(name: Name) {
    return this.rigidBodies.has(name);
  }

  /**
   * The instrument is being held still: keep accumulating ring alignment (8-face ring, one camera)
   * and rest the rotation state. Returns the ring tracker's status for the status line.
   */
  holdStill(name: Name, now: number, context: RotationContext): string {
    let alignedStatus = '';
    if (context.trackerType === 'ring8' && context.mono) {
      const tracker = context.ringTracker(true)!;
      tracker.solve(context.recentlyDecoded(context.ids, ROTATION_DECODE_MS), context.ids[0], context.width, context.height, now, this.rigidBodies.get(name)?.pose);
      alignedStatus = ' · ' + tracker.status;
    }
    // Recognition and overlap indicators keep updating; an unchanged shared
    // face is evidence that a different face count is not physical movement.
    const state = this.rigidBodies.get(name);
    if (state) restRigidBody(state, now);
    return alignedStatus;
  }

  /** The instrument's orientation after this frame, starting from `previous` (the last accepted one). */
  update(name: Name, now: number, previous: THREE.Quaternion | undefined, context: RotationContext): THREE.Quaternion {
    const { ids, trackerType, mono } = context;
    const continuousFlowRotation = context.flowRotation && mono;
    // Baseline requires a recent decode. Experimental mode additionally uses
    // flow-confirmed corners while their identity remains recently decoded.
    const rotationMarkers = context.recentlyDecoded(ids, continuousFlowRotation ? FLOW_ROTATION_DECODE_MS : ROTATION_DECODE_MS);
    let state = this.rigidBodies.get(name);
    const faceTransitionEnabled = context.faceTransition && mono;
    const currentFace = largestFaceId(rotationFaceMarkers(rotationMarkers, ids[0], trackerType === 'ring8'));
    // Solve all simultaneously visible prism faces as one rigid object.
    // Retain the last accepted pose as a solver seed, but never discard real
    // rotation by resetting the output anchor when the visible face changes.
    const predicted: PrismPose | undefined = state ? predictRotation(state, now) : undefined;
    const ringTracker = context.ringTracker(trackerType === 'ring8');
    const useAlignedRing = trackerType === 'ring8' && mono;
    const monoRigid = perf.measure('Rigid pose solve', () =>
      useAlignedRing
        ? ringTracker!.solve(rotationMarkers, ids[0], context.width, context.height, now, state?.pose, predicted)
        : solvePrismPose(rotationMarkers, ids[0], context.width, context.height, state?.pose, predicted, trackerType),
    );
    const stereoRigid = perf.measure('Stereo pose/synchronization', () => context.stereoRotation());
    // Stereo pose has a distinct camera-calibrated frame. Preserve the mono
    // solver's orientation state separately so switching modes cannot cause
    // an arbitrary camera-frame jump.
    const { rigid, source: rotationSource } = combineRotation(monoRigid, stereoRigid);
    const stereoUsable = rotationSource === 'stereo';
    const lastSource = this.sources.get(name);
    if (rigid && lastSource && lastSource !== rotationSource) {
      this.rigidBodies.delete(name);
      state = undefined;
    }
    if (rigid) this.sources.set(name, rotationSource);
    if (rigid) {
      context.stageRaw.set(name, rigid.quaternion.clone());
      context.stageStatus.set(name, 'solver valid');
    } else {
      const message = useAlignedRing ? ringTracker!.status : 'no raw pose';
      context.stageStatus.set(name, message);
      if (useAlignedRing) context.setSolverStatus(name + ' · ' + message);
    }
    const quaternion = previous?.clone() ?? new THREE.Quaternion();
    if (!rigid) {
      if (state) stallRotation(state, now);
      return quaternion;
    }
    if (!state) {
      this.rigidBodies.set(name, startRigidBody(rigid, quaternion, now));
      if (currentFace !== null) this.faceTransitions.set(name, { faceId: currentFace, candidateId: null, candidateCount: 0 });
      return quaternion;
    }
    const elapsed = gateElapsedSeconds(state, now);
    const angularDifference = rigid.quaternion.angleTo(state.lastRaw);
    context.setAngleDegrees(THREE.MathUtils.radToDeg(angularDifference));
    const decodedWithin = (id: number, ms: number) => performance.now() - (context.lastDecodedAt(id) ?? -Infinity) < ms;
    const freshDecodedFace = rotationMarkers.some((m) => decodedWithin(m.id, FRESH_FACE_MS));
    const flowRotationRecent = continuousFlowRotation && rotationMarkers.some((m) => context.markerAge(m.id) < RECENT_FLOW_MS);
    let transition = this.faceTransitions.get(name);
    if (!transition && currentFace !== null) {
      transition = { faceId: currentFace, candidateId: null, candidateCount: 0 };
      this.faceTransitions.set(name, transition);
    }
    const changedFace = !!transition && currentFace !== null && currentFace !== transition.faceId;
    const newFaceFresh = changedFace && rotationMarkers.some((m) => m.id === currentFace && decodedWithin(m.id, NEW_FACE_FRESH_MS));
    if (transition) updateFaceTransition(transition, currentFace, newFaceFresh);
    const predictedDifference = predicted ? rigid.quaternion.angleTo(predicted.quaternion) : Infinity;
    const verdict = rotationVerdict({
      error: rigid.error,
      faces: rigid.faces,
      stereo: stereoUsable,
      angularDifference,
      predictedDifference,
      elapsedSeconds: elapsed,
      staleMs: now - state.lastAt,
      freshDecodedFace,
      flowRotationRecent,
      faceTransitionEnabled,
      newFaceFresh: !!newFaceFresh,
      candidateCount: transition?.candidateCount ?? 0,
    });
    const credible = verdict !== 'rejected';
    context.setSolverStatus(
      name + ' · ' + rotationSource + ' · raw ' + THREE.MathUtils.radToDeg(angularDifference).toFixed(1) + '° · ' + rigid.faces +
        ' face(s) · error ' + rigid.error.toFixed(1) + 'px · ' + (credible ? verdict : changedFace ? 'face transition pending' : 'angular gate rejected') +
        (useAlignedRing ? ' · ' + ringTracker!.status : ''),
    );
    context.stageStatus.set(name, credible ? 'accepted' : 'rejected (' + rigid.faces + ' faces, ' + rigid.error.toFixed(1) + ' error)');
    if (!credible) {
      stallRotation(state, now);
      return quaternion;
    }
    if (transition && currentFace !== null) {
      transition.faceId = currentFace;
      transition.candidateId = null;
      transition.candidateCount = 0;
    }
    // Track rotation in the prism's *local* coordinate frame. The virtual
    // models have their shafts aligned with local Y, just like the prism.
    // Postmultiplying the body-local delta makes prism roll rotate the
    // instrument about its shaft, regardless of how the prism is tilted.
    // Keep the instrument's existing tip pivot and stereo translation.
    quaternion.copy(acceptRotation(state, rigid, now, elapsed, angularDifference));
    return quaternion;
  }
}
