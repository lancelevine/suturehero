/** Square knots that turn into slip knots (roadmap). Snugging a square knot by pulling one strand
 * much harder than the other turns it into a sliding half hitch that slips. Warns while one held
 * strand carries most of the pull and the other is nearly slack, and counts such episodes.
 * Uses the knot model's relative strand demand (geometric, not a measured force). */
export const HARD_DEMAND = 0.35;
export const SLACK_DEMAND = 0.1;
/** The imbalance must last this long (s) to count. */
export const UNEVEN_SECONDS = 0.5;
export const UNEVEN_WARNING = 'Pulling one strand much harder · a square knot can turn into a slip knot · pull both ends evenly';

export class UnevenPullCheck {
  seconds = 0;
  episodes = 0;
  warning = false;
  update(longDemand: number, shortDemand: number, bothHeld: boolean, dt: number) {
    const uneven = bothHeld && Math.max(longDemand, shortDemand) >= HARD_DEMAND && Math.min(longDemand, shortDemand) <= SLACK_DEMAND;
    if (!uneven) { this.seconds = 0; this.warning = false; return; }
    this.seconds += dt;
    if (this.seconds >= UNEVEN_SECONDS && !this.warning) { this.warning = true; this.episodes++; }
  }
  reset() { this.seconds = 0; this.episodes = 0; this.warning = false; }
}
