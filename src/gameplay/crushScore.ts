/** Tissue handling score (roadmap): forceps crush damage. Holding the skin edge is fine; squeezing
 * the jaws almost fully shut on it crushes the tissue. Time held below the crush openness counts.
 * Uses the forceps openness (from the Bluetooth Hall-sensor jaws when connected); approximate. */

/** Jaw openness (0 = fully shut, 1 = open) at or below which a hold counts as crushing. */
export const CRUSH_OPENNESS = 0.05;

export class CrushScore {
  holdSeconds = 0;
  crushSeconds = 0;
  update(holdingTissue: boolean, openness: number, dt: number) {
    if (!holdingTissue || dt <= 0) return;
    this.holdSeconds += dt;
    if (openness <= CRUSH_OPENNESS) this.crushSeconds += dt;
  }
  /** Share of hold time spent crushing (null before any hold). */
  get crushShare(): number | null { return this.holdSeconds > 0 ? this.crushSeconds / this.holdSeconds : null; }
  reset() { this.holdSeconds = 0; this.crushSeconds = 0; }
}
