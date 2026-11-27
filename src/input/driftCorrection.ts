/**
 * Decoder drift correction for optical-flow tracking (moved out of src/tracking.ts, 2026-11-27).
 * Flow follows a marker from frame to frame and slowly drifts; a fresh decode of the same marker
 * resets its corners, but only while the marker is nearly still, so a moving track is never
 * pulled back to where it was when the (older) decoded image was taken.
 */
export interface Corners {
  readonly corners: ReadonlyArray<{ readonly x: number; readonly y: number }>;
}

export interface FlowMotion {
  /** When flow last saw the marker (performance.now()). */
  at: number;
  /** Mean corner speed (px/ms). */
  speed: number;
}

/** Decoded image older than this (ms) never corrects flow. */
export const CORRECTION_MAX_IMAGE_AGE_MS = 180;
/** Flow must have seen the marker within this (ms). */
export const CORRECTION_MAX_FLOW_AGE_MS = 120;
/** "Nearly still": mean corner speed below this (px/ms). */
export const CORRECTION_MAX_SPEED = 0.035;
/** Corrections smaller than this (px) are noise; larger than the max are a different detection. */
export const CORRECTION_MIN_ERROR_PX = 1.5;
export const CORRECTION_MAX_ERROR_PX = 45;

/** Mean distance between corresponding corners of two quadrilaterals (px). */
export function meanCornerDistance(a: Corners['corners'], b: Corners['corners']) {
  return a.reduce((sum, p, i) => sum + Math.hypot(p.x - b[i].x, p.y - b[i].y), 0) / 4;
}

/** Copies of the decoded markers that should replace their flow-tracked corners now. */
export function driftCorrections<M extends Corners & { id: number }>(found: readonly M[], active: ReadonlyArray<Corners & { id: number }>, flowMotion: ReadonlyMap<number, FlowMotion>, decodeStamp: number, capturedAt: number) {
  if (decodeStamp - capturedAt >= CORRECTION_MAX_IMAGE_AGE_MS) return [];
  return found
    .filter((marker) => {
      const flow = active.find((m) => m.id === marker.id);
      const motion = flowMotion.get(marker.id);
      if (!flow || !motion || decodeStamp - motion.at > CORRECTION_MAX_FLOW_AGE_MS || motion.speed > CORRECTION_MAX_SPEED) return false;
      const error = meanCornerDistance(marker.corners, flow.corners);
      return error > CORRECTION_MIN_ERROR_PX && error < CORRECTION_MAX_ERROR_PX;
    })
    .map((marker) => ({ id: marker.id, corners: marker.corners.map((p) => ({ ...p })) }));
}
