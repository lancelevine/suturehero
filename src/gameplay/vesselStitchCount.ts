/**
 * Stitch count for the vessel (roadmap, Lance 2026-11-28): suggested count scales with the
 * circumference, about 8 for a 1 mm artery; spacing evenness also matters. Stitch positions are
 * the vessel's turn angle when each stitch was saved (the stitch is always made on top).
 */
export const STITCHES_PER_MM_DIAMETER = 8;
/** Gaps between neighbouring stitches may differ by this share of the even gap. */
export const EVEN_SPACING_TOLERANCE = 0.25;

export function suggestedStitchCount(diameterMm: number) {
  return Math.max(4, Math.round(STITCHES_PER_MM_DIAMETER * diameterMm));
}

/** Angular gaps around the vessel between the saved stitches (radians, in order around). */
export function stitchGaps(angles: readonly number[]) {
  const full = Math.PI * 2;
  const sorted = angles.map((a) => ((a % full) + full) % full).sort((a, b) => a - b);
  return sorted.map((a, i) => (i + 1 < sorted.length ? sorted[i + 1] - a : sorted[0] + full - a));
}

export function describeVesselCount(angles: readonly number[], diameterMm: number) {
  const suggested = suggestedStitchCount(diameterMm);
  const head = `Stitches ${angles.length}/${suggested} (suggested for a ${diameterMm.toFixed(1)} mm vessel)`;
  if (angles.length < 2) return head;
  const even = (Math.PI * 2) / angles.length;
  const gaps = stitchGaps(angles);
  const spread = (Math.max(...gaps) - Math.min(...gaps)) / even;
  const spacing = spread <= EVEN_SPACING_TOLERANCE ? 'evenly spaced' : `uneven spacing (widest gap ${Math.round((Math.max(...gaps) * 180) / Math.PI)}°)`;
  const count = angles.length > suggested ? ' · more than suggested: may narrow the lumen' : '';
  return `${head} · ${spacing}${count}`;
}
