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

/** With no flow result, markers decoded within this long (ms) are kept rather than dropped. */
export const DECODED_HOLD_MS = 300;

/** Record each flow-tracked marker's corners and mean corner speed (px/ms; Infinity when first seen). */
export function recordFlowMotion(flowMotion: Map<number, FlowMotion & { corners: Corners['corners'] }>, found: ReadonlyArray<Corners & { id: number }>, stamp: number) {
  for (const marker of found) {
    const previous = flowMotion.get(marker.id);
    const displacement = previous ? meanCornerDistance(marker.corners, previous.corners) : 0;
    const speed = previous ? displacement / Math.max(1, stamp - previous.at) : Infinity;
    flowMotion.set(marker.id, { corners: marker.corners.map((p) => ({ ...p })), at: stamp, speed });
  }
}

/**
 * Flow found nothing this frame: keep only markers decoded within DECODED_HOLD_MS (a freshly
 * decoded still marker must not vanish because one flow frame missed it), and confirm exactly
 * those as of `stamp`.
 */
export function holdDecodedMarkers<M extends { id: number }>(observations: readonly M[], lastDecoded: ReadonlyMap<number, number>, lastConfirmed: Map<number, number>, stamp: number): M[] {
  const held = observations.filter((m) => stamp - (lastDecoded.get(m.id) ?? -Infinity) < DECODED_HOLD_MS);
  for (const id of [...lastConfirmed.keys()]) if (!held.some((m) => m.id === id)) lastConfirmed.delete(id);
  for (const marker of held) lastConfirmed.set(marker.id, stamp);
  return held;
}

/** Decoded markers whose IDs are not among the live (flow-tracked) ones. */
export function missingMarkers<M extends { id: number }>(found: readonly M[], active: ReadonlyArray<{ id: number }>): M[] {
  return found.filter((marker) => !active.some((live) => live.id === marker.id));
}

/** `observations` with each ID in `replacements` swapped for its replacement (drift-corrected corners). */
export function replaceMarkers<M extends { id: number }>(observations: readonly M[], replacements: readonly M[]): M[] {
  const ids = new Set(replacements.map((marker) => marker.id));
  return [...observations.filter((marker) => !ids.has(marker.id)), ...replacements];
}

/** Mark these markers as confirmed at `stamp`. */
export function confirmMarkers(lastConfirmed: Map<number, number>, markers: ReadonlyArray<{ id: number }>, stamp: number) {
  for (const marker of markers) lastConfirmed.set(marker.id, stamp);
}
