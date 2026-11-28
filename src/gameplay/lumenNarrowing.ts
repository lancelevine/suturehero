import { DILATION_GOOD } from './vesselDilation';

/**
 * Lumen narrowing score (roadmap, 2026-11-28): after the last vessel stitch, an estimate of how
 * much the join narrows the lumen against the original vessel. A practice estimate from the
 * sim's own inputs (weights below are not measured): too little dilation, extra stitches beyond
 * the suggested count, and stitches that inverted the edge all narrow the join.
 */
export const BASE_NARROWING = 5;
export const PER_DILATION_SHORTFALL = 60;
export const PER_EXTRA_STITCH = 3;
export const PER_INVERTED_STITCH = 8;
export const NARROWING_OK = 20;

export function lumenNarrowingPercent(input: { dilation: number; stitches: number; suggested: number; inverted: number }) {
  const shortfall = Math.max(0, DILATION_GOOD.min - input.dilation);
  const extra = Math.max(0, input.stitches - input.suggested);
  const raw = BASE_NARROWING + shortfall * PER_DILATION_SHORTFALL + extra * PER_EXTRA_STITCH + input.inverted * PER_INVERTED_STITCH;
  return Math.round(Math.min(90, Math.max(0, raw)));
}

export function describeLumenNarrowing(percent: number) {
  return `Lumen narrowed about ${percent}% at the join (estimate) · ${percent <= NARROWING_OK ? 'patent ✓' : 'too narrow: dilate more, avoid extra or inverted stitches'}`;
}
