/**
 * Vessel dilation step (roadmap, 2026-11-28): gently dilate each vessel end before suturing. Too
 * little leaves the lumen narrow at the join; too much tears the intima and raises clot risk.
 * Dilation is the lumen's stretch as a share of its rest diameter. Practice model only.
 */
export const DILATION_STEP = 0.05;
export const DILATION_GOOD = { min: 1.1, max: 1.3 } as const;
export const INTIMA_TEAR = 1.35;
export const DILATION_MAX = 1.5;

export type DilationState = 'not dilated' | 'under-dilated' | 'dilated' | 'over-dilated' | 'intima torn';

export function dilationState(dilation: number, torn: boolean): DilationState {
  if (torn) return 'intima torn';
  if (dilation <= 1.001) return 'not dilated';
  if (dilation < DILATION_GOOD.min) return 'under-dilated';
  if (dilation <= DILATION_GOOD.max) return 'dilated';
  return 'over-dilated';
}

/** Dilate one step; past INTIMA_TEAR the intima tears (and stays torn until the target is reset). */
export function dilateStep(dilation: number, torn: boolean) {
  const next = Math.min(DILATION_MAX, dilation + DILATION_STEP);
  return { dilation: next, torn: torn || next > INTIMA_TEAR };
}

export function describeDilation(dilation: number, torn: boolean) {
  const pct = Math.round(dilation * 100);
  switch (dilationState(dilation, torn)) {
    case 'not dilated':
      return 'Dilate the vessel ends before suturing (Dilate button)';
    case 'under-dilated':
      return `Dilated ${pct}% · a little more opens the lumen (aim ${DILATION_GOOD.min * 100}–${DILATION_GOOD.max * 100}%)`;
    case 'dilated':
      return `Dilated ${pct}% ✓ · lumen open`;
    case 'over-dilated':
      return `Dilated ${pct}% · stop: more will tear the intima`;
    default:
      return `Intima torn (${pct}%) · clot risk · switch target to start again`;
  }
}
