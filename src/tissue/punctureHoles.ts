import type * as THREE from 'three';

/** Needle holes that last (roadmap). Every entry and exit leaves a puncture, even after the pass is
 * undone. Holes clustered around a stitch weaken the tissue there, so the thread cuts through with
 * less pull. Practice model: radius and weakening per hole are illustrative, not measured. */

/** Holes within this distance (scene units, about 3 mm) of a stitch's entry or exit weaken it. */
export const HOLE_RADIUS = 0.12;
/** Each extra nearby hole lowers the cut-through tension by this fraction. */
export const WEAKENING_PER_HOLE = 0.08;
/** The cut-through tension never drops below this share of the intact value. */
export const MIN_STRENGTH = 0.7;

/** Nearby holes around `points`, not counting the points themselves. */
export function holesNear(points: readonly THREE.Vector3[], holes: readonly THREE.Vector3[]) {
  return holes.filter((hole) => points.some((p) => { const d = hole.distanceTo(p); return d > 1e-6 && d < HOLE_RADIUS; })).length;
}

/** Share of the intact cut-through tension left at a stitch with `nearby` extra holes. */
export function holeStrength(nearby: number) {
  return Math.max(MIN_STRENGTH, 1 - WEAKENING_PER_HOLE * nearby);
}
