import { fieldShift, type TissueSite } from '../tissue/StitchField';
import { WOUND_ENDS } from './stitchOrder';

/**
 * Gap scan for skin (roadmap, 2026-11-27): after a closure, sweep the wound and find stretches
 * where the edges are not touching, using the same retained-stitch field as the closure review
 * (src/tissue/StitchField.ts). Scene units along z; approximate practice model.
 */

/** A remaining gap wider than this counts as open (scene units; the closure review's "visible opening"). */
export const OPEN_GAP = 0.045;
/** Sampling step along the wound (scene units). */
const SCAN_STEP = 0.02;

export interface OpenSpan {
  from: number;
  to: number;
  /** Widest gap in the span (scene units). */
  widest: number;
}

export function gapScan(sites: readonly TissueSite[], ends: { min: number; max: number } = WOUND_ENDS): OpenSpan[] {
  if (!sites.length) return [];
  const initialGap = sites.reduce((sum, s) => sum + s.initialGap, 0) / sites.length;
  const spans: OpenSpan[] = [];
  let open: OpenSpan | null = null;
  for (let z = ends.min; z <= ends.max + 1e-9; z += SCAN_STEP) {
    const gap = initialGap - 2 * fieldShift(initialGap / 2, z, sites);
    if (gap > OPEN_GAP) {
      if (!open) {
        open = { from: z, to: z, widest: gap };
        spans.push(open);
      }
      open.to = z;
      open.widest = Math.max(open.widest, gap);
    } else open = null;
  }
  return spans;
}
