/**
 * Suture cutting check (roadmap, 2026-11-28): grade the tail left after a cut. Too short and the
 * knot may unravel (the engine already refuses cuts that would nick the knot); too long and it
 * catches and is hard to remove. Teaching range for skin tails, approximate.
 */
export const TAIL_MM = { min: 3, max: 10 } as const;
/** Strand points the knot engines keep clear past the knot before allowing a cut. */
export const KNOT_CLEARANCE_POINTS = 3;

export function tailLengthMm(cutCoordinate: number, minimumCut: number, restLength: number, mmPerUnit: number) {
  const knotEnd = minimumCut - KNOT_CLEARANCE_POINTS;
  return Math.max(0, cutCoordinate - knotEnd) * restLength * mmPerUnit;
}

export function describeTail(mm: number) {
  if (mm < TAIL_MM.min) return `tail ${mm.toFixed(0)} mm · short: may unravel`;
  if (mm > TAIL_MM.max) return `tail ${mm.toFixed(0)} mm · long: trim to ${TAIL_MM.min}–${TAIL_MM.max} mm`;
  return `tail ${mm.toFixed(0)} mm ✓`;
}
