import type { MarkerObservation } from './arucoTracking';
import { DistanceHistory } from './distanceHistory';
import { bodyPoseFromMarker, trackerGeometry, type TrackerType } from './prismPose';
import { SizeDepthEstimator, sizeDepthCandidate } from './sizeDepthEstimator';
import { tiltCorrectedSize } from './tiltSizeDepth';

/**
 * Camera-to-tracker distance for one instrument, per frame (moved out of
 * updateLiveTargets in src/tracking.ts on 2026-11-09 without changing
 * behaviour).
 *
 * - The tracker-centre distance comes from the 3D pose of the chosen face
 *   when its fit is good, else from the marker's side length; the recent
 *   median is kept (DistanceHistory).
 * - With one camera, depth uses the tilt-corrected marker size of the best
 *   face (SizeDepthEstimator), or holds the last depth when no face is
 *   measurable.
 */

/** A marker's planar pose as estimateMarkerPose returns it. */
type MarkerPose = Parameters<typeof bodyPoseFromMarker>[0] & { reprojectionError: number; position: { z: number } };

/** Pose-based distance is trusted only with a planar fit better than this (px). */
export const POSE_DEPTH_MAX_ERROR_PX = 2.5;
/** Distances at or below this (mm) are treated as invalid. */
export const MIN_VALID_DISTANCE_MM = 20;
/** Faces smaller than this (px per side) are ignored for distance. */
const MIN_MARKER_SIDE_PX = 2;

export interface DistanceTrack {
  history: DistanceHistory;
  sizeEstimator: SizeDepthEstimator;
  /** Last depth reported (mm), held when no face is measurable. Never cleared, as before. */
  lastDepthMm?: number;
}

/** Per-instrument distance state, with the same resets as the maps it replaced. */
export class DistanceTracks<Name extends string> {
  private tracks = new Map<Name, DistanceTrack>();

  get(name: Name): DistanceTrack {
    let track = this.tracks.get(name);
    if (!track) {
      track = { history: new DistanceHistory(), sizeEstimator: new SizeDepthEstimator() };
      this.tracks.set(name, track);
    }
    return track;
  }

  /** Forget recent distances (depth filters reset, tracker pose reset). */
  resetHistories() {
    for (const track of this.tracks.values()) track.history = new DistanceHistory();
  }

  /** Forget size-depth frames and face choice (tracker pose reset). */
  resetSizeEstimators() {
    for (const track of this.tracks.values()) track.sizeEstimator = new SizeDepthEstimator();
  }
}

export interface DistanceInput {
  /** The face chosen for this instrument, and every visible face, with their planar poses. */
  chosen: { marker: MarkerObservation; pose: MarkerPose };
  candidates: ReadonlyArray<{ marker: MarkerObservation; pose: MarkerPose }>;
  /** Face index of a marker ID within the tracker. */
  faceIndex: (id: number) => number;
  trackerType: TrackerType;
  width: number;
  height: number;
  focalPx: number;
  now: number;
  stationary: boolean;
  /** One camera: depth comes from tilt-corrected marker size. */
  singleCamera: boolean;
  /** Depth calibration binding (camera + tracker setup). */
  binding: string;
  instrument: string;
}

export interface DistanceResult {
  /** Median tracker-centre distance (mm): used for X/Y scaling. */
  measuredDistance: number;
  /** Distance used for depth (mm). */
  depthDistance: number;
  source: string;
  valid: boolean;
}

/** This frame's distances, or null when the chosen face is too small to measure (nothing is recorded then). */
export function measureTrackerDistance(track: DistanceTrack, input: DistanceInput): DistanceResult | null {
  const corners = input.chosen.marker.corners;
  const markerSidePx = corners.reduce((sum, p, i) => sum + Math.hypot(p.x - corners[(i + 1) % 4].x, p.y - corners[(i + 1) % 4].y), 0) / 4;
  if (markerSidePx < MIN_MARKER_SIDE_PX) return null;
  const markerSizeMm = trackerGeometry(input.trackerType).markerSizeMm;
  const sizeDistance = (markerSizeMm * input.focalPx) / markerSidePx;
  // Use the tracker centre, not whichever face is visible; a tilted face looks
  // smaller at the same depth, so trust the 3D pose when its fit is good.
  const { pose } = input.chosen;
  const bodyPose = bodyPoseFromMarker(pose, input.faceIndex(pose.id), input.trackerType);
  const poseDepthValid = Number.isFinite(bodyPose.translation.z) && bodyPose.translation.z > MIN_VALID_DISTANCE_MM && pose.reprojectionError < POSE_DEPTH_MAX_ERROR_PX;
  const estimatedDistance = poseDepthValid ? bodyPose.translation.z : sizeDistance;
  // A poor planar fit does not invalidate the recognised square's size.
  let valid = Number.isFinite(estimatedDistance) && estimatedDistance > MIN_VALID_DISTANCE_MM;
  let source = poseDepthValid ? '3D pose' : 'marker size';
  const measuredDistance = track.history.update(estimatedDistance, input.now, input.stationary);
  let depthDistance = measuredDistance;
  if (input.singleCamera) {
    const focalPerWidth = input.focalPx / input.width;
    const sizeCandidates = input.candidates.flatMap((c) => {
      const body = bodyPoseFromMarker(c.pose, input.faceIndex(c.pose.id), input.trackerType);
      const candidate = sizeDepthCandidate(c.marker.id, tiltCorrectedSize(c.marker, input.width, input.height, input.focalPx), markerSizeMm, c.pose.position.z - body.translation.z, focalPerWidth);
      return candidate ? [candidate] : [];
    });
    const median = track.sizeEstimator.update({ candidates: sizeCandidates, now: input.now, stationary: input.stationary, binding: input.binding, instrument: input.instrument, focalPerWidth });
    valid = !!median;
    if (median) {
      depthDistance = median.distanceMm;
      source = 'tilt-corrected marker size';
    } else {
      depthDistance = track.lastDepthMm ?? measuredDistance;
      source = 'depth held · marker too tilted or small';
    }
  }
  track.lastDepthMm = depthDistance;
  return { measuredDistance, depthDistance, source, valid };
}
