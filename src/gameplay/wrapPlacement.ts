/** Wrap placement in the instrument tie (roadmap). Each full turn of thread wound onto the needle
 * driver is a wrap; it should be made close to the wound (so the short tail can be reached) and
 * stay on the driver until the tail is grasped. A drop of half a turn or more after a wrap counts
 * as a wrap slipping off. Approximate: from the knot model's winding and the driver tip position. */

/** Wraps made further than this from the stitch (mm) are flagged as too far out. */
export const MAX_WRAP_DISTANCE_MM = 25;
/** A loss of winding this large (turns) after a wrap counts as a slip-off. */
export const SLIP_TURNS = 0.5;

export class WrapPlacementCheck {
  wraps = 0;
  farWraps = 0;
  slips = 0;
  private peak = 0;
  /** Call every frame with the signed winding (turns), the driver tip's distance from the stitch (mm)
   * and whether the driver has the short tail. */
  update(winding: number, driverDistanceMm: number, holdingShortTail = false) {
    const turns = Math.abs(winding);
    while (turns >= this.wraps + 1) {
      this.wraps++;
      if (driverDistanceMm > MAX_WRAP_DISTANCE_MM) this.farWraps++;
    }
    if (turns > this.peak) this.peak = turns;
    // Once the driver holds the short tail, the wraps come off on purpose as the throw is pulled through.
    if (holdingShortTail) { this.peak = turns; return; }
    if (this.peak >= 1 && this.peak - turns >= SLIP_TURNS && turns < 1) {
      this.slips++;
      this.peak = turns;
    }
  }
  /** Wraps released on purpose (throw finished): start counting the next throw's wraps afresh. */
  nextThrow() { this.peak = 0; this.wraps = 0; }
  reset() { this.wraps = 0; this.farWraps = 0; this.slips = 0; this.peak = 0; }
}

export function describeWraps(check: WrapPlacementCheck) {
  if (!check.wraps && !check.farWraps && !check.slips) return '';
  const notes = [`Wraps on driver: ${check.wraps}`];
  if (check.farWraps) notes.push(`${check.farWraps} made far from the wound (wrap close to the stitch)`);
  if (check.slips) notes.push(`${check.slips} slipped off (keep the driver still until it grasps the short tail)`);
  return notes.join(' · ');
}
