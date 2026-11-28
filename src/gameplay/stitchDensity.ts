import { WOUND_ENDS } from './stitchOrder';

/** Stitch density by tension (roadmap). Edge pull is highest in the middle of a straight wound
 * and rises with the body site's tension; closer spacing is suggested where the pull is higher.
 * Practice model: the pull profile and base spacing are illustrative, not measured. */

/** Suggested spacing (mm) where the relative pull is 1 (wound ends at standard tension). */
export const BASE_SPACING_MM = 7;
/** Extra pull at the middle of the wound compared with its ends. */
export const MIDDLE_EXTRA_PULL = 0.5;
/** A gap within this fraction of its suggested spacing counts as matched. */
export const SPACING_TOLERANCE = 0.35;

export function pullAt(z: number, siteTension: number) {
  const half = (WOUND_ENDS.max - WOUND_ENDS.min) / 2;
  const centre = (WOUND_ENDS.max + WOUND_ENDS.min) / 2;
  const along = Math.min(1, Math.abs(z - centre) / half);
  return siteTension * (1 + MIDDLE_EXTRA_PULL * (1 - along * along));
}

export function suggestedSpacingMm(z: number, siteTension: number) {
  return BASE_SPACING_MM / pullAt(z, siteTension);
}

/** Grades each gap between neighbouring stitches (positions in scene units) against the spacing
 * suggested at its midpoint. */
export function gradeStitchDensity(stitchZ: readonly number[], siteTension: number, mmPerUnit: number) {
  const sorted = [...stitchZ].sort((a, b) => a - b);
  return sorted.slice(1).map((z, i) => {
    const mid = (z + sorted[i]) / 2;
    const actualMm = (z - sorted[i]) * mmPerUnit;
    const suggestedMm = suggestedSpacingMm(mid, siteTension);
    const ratio = actualMm / suggestedMm;
    return { actualMm, suggestedMm, matched: Math.abs(ratio - 1) <= SPACING_TOLERANCE, tooWide: ratio > 1 + SPACING_TOLERANCE };
  });
}

export function describeStitchDensity(stitchZ: readonly number[], siteTension: number, mmPerUnit: number) {
  const gaps = gradeStitchDensity(stitchZ, siteTension, mmPerUnit);
  if (!gaps.length) return '';
  const matched = gaps.filter((g) => g.matched).length;
  const wide = gaps.filter((g) => g.tooWide).length;
  const middle = suggestedSpacingMm(0, siteTension).toFixed(1);
  return `Density for tension: ${matched}/${gaps.length} gaps matched (suggested ~${middle} mm mid-wound, wider toward the ends)${wide ? ` · ${wide} too wide where the pull is high` : ''}`;
}
