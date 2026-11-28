/**
 * Suture breaking strength (roadmap, 2026-11-28). Each suture size snaps above its own share of
 * the thread model's pull demand (0–1, src/suture/StrandTension.ts): finer sizes snap sooner.
 * The model's pull is relative, not a measured force, so limits are relative too.
 */
export const SUTURE_SIZES = [
  { id: '3-0', label: '3-0', breakDemand: 1.01 },
  { id: '4-0', label: '4-0', breakDemand: 0.85 },
  { id: '5-0', label: '5-0', breakDemand: 0.7 },
  { id: '6-0', label: '6-0', breakDemand: 0.55 },
] as const;
export type SutureSize = (typeof SUTURE_SIZES)[number];
/** 3-0 by default: it does not snap at the model's highest pull, so existing exercises are unchanged. */
export const DEFAULT_SIZE = SUTURE_SIZES[0];
/** The pull must stay above the limit this long (s) to snap, so a single jerk of the model does not. */
export const SNAP_HOLD_SECONDS = 0.15;

export function resolveSize(id: string | null): SutureSize {
  return SUTURE_SIZES.find((s) => s.id === id) ?? DEFAULT_SIZE;
}

/** Watches one strand's pull: peak share of the breaking point, and whether it snapped. */
export class BreakMonitor {
  peakShare = 0;
  private over = 0;

  /** Returns true on the frame the strand snaps. */
  update(demand: number, dt: number, size: SutureSize) {
    const share = demand / size.breakDemand;
    this.peakShare = Math.max(this.peakShare, share);
    this.over = share >= 1 ? this.over + dt : 0;
    if (this.over < SNAP_HOLD_SECONDS) return false;
    this.over = 0;
    return true;
  }

  reset() {
    this.peakShare = 0;
    this.over = 0;
  }
}

export function describePull(peakShare: number, size: SutureSize) {
  return `Pull: peak ${Math.round(Math.min(peakShare, 1) * 100)}% of ${size.label} breaking point`;
}
