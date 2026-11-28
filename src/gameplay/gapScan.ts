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

/** An open span within this distance of a wound end (scene units) counts as reaching that end. */
const END_TOUCH = SCAN_STEP * 1.5;

/** Wound-end check (roadmap: "Closing the wound ends"): is either apex left open, and by how much
 * (scene units along the wound)? Uses the gap scan, so it is the same approximate model. */
export function woundEndOpenings(open: readonly OpenSpan[], ends: { min: number; max: number } = WOUND_ENDS) {
  const start = open.find((span) => span.from <= ends.min + END_TOUCH);
  const finish = open.find((span) => span.to >= ends.max - END_TOUCH);
  return { start: start ? start.to - ends.min : 0, finish: finish ? ends.max - finish.from : 0 };
}

export function describeWoundEnds(open: readonly OpenSpan[], formatLength: (units: number) => string, ends: { min: number; max: number } = WOUND_ENDS): string {
  const { start, finish } = woundEndOpenings(open, ends);
  if (!start && !finish) return 'Wound ends: both closed';
  const parts = [start ? `near end open ${formatLength(start)}` : '', finish ? `far end open ${formatLength(finish)}` : ''].filter(Boolean);
  return `Wound ends: ${parts.join(', ')} · place the end stitch at or just past the apex, at full depth`;
}
