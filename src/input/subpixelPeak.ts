/**
 * Sub-pixel position of a peak from three samples (left, centre, right) one
 * pixel apart, by fitting a parabola. Returns the offset from the centre
 * sample, in pixels, within ±MAX_SUBPIXEL_OFFSET; 0 when the samples do not
 * form a peak.
 *
 * Used to refine ArUco corners: before 2026-11-09 the refinement stopped at
 * the best whole pixel, so a 33 px marker read as 33×34 px at some sizes and
 * the tilt correction turned that rounding into a ~3% size (depth) error.
 */
export const MAX_SUBPIXEL_OFFSET = 0.5;

export function quadraticPeakOffset(left: number, centre: number, right: number): number {
  if (![left, centre, right].every(Number.isFinite)) return 0;
  const curvature = left - 2 * centre + right;
  if (curvature >= 0) return 0;
  const offset = (0.5 * (left - right)) / curvature;
  return Math.max(-MAX_SUBPIXEL_OFFSET, Math.min(MAX_SUBPIXEL_OFFSET, offset));
}
