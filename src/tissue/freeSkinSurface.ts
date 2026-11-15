/**
 * The skin surface the Sandbox needle meets (2026-11-15): the live tissue, not
 * a flat plane. No skin in the open wound gap; the cut edges roll over
 * slightly; everted (forceps-lifted) edges and skin pulled up by nearby
 * stitches raise the surface. Approximate, for practice feedback only.
 */

/** How far the cut edge rolls down (scene units, ≈ 0.3 mm) and over what width (≈ 0.8 mm). */
export const EDGE_ROLL_DEPTH = 0.012;
export const EDGE_ROLL_WIDTH = 0.03;

export interface SkinShapeSource {
  /** Half the wound gap at z (the cut edges are at x = ±halfGap). */
  halfGapAt(z: number): number;
  /** The tissue surface height at (x, z) including eversion and stitch lift. */
  shapedTopAt(x: number, z: number): number;
}

/** Surface height at (x, z), or null in the wound gap. */
export function shapedSkinSurface(x: number, z: number, source: SkinShapeSource): number | null {
  const halfGap = Math.max(0, source.halfGapAt(z));
  const fromEdge = Math.abs(x) - halfGap;
  if (fromEdge < 0) return null;
  return source.shapedTopAt(x, z) - EDGE_ROLL_DEPTH * Math.exp(-fromEdge / EDGE_ROLL_WIDTH);
}
