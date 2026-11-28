/** Counts "sawing" pulls: episodes where the thread is pulled taut through a pass hard enough to
 * cut through tissue if held (roadmap: "Thread management scoring"). Uses the same geometric
 * tension as the cut-through rule, so it is approximate, not a force. */
export const SAWING_TENSION = 1.35;
/** Tension must stay above the limit this long (s) to count, so single-frame spikes are ignored. */
export const SAWING_MIN_SECONDS = 0.1;

export class SawingPullCheck {
  count = 0;
  private above = 0;
  private counted = false;
  update(tension: number, threaded: boolean, dt: number) {
    if (!threaded || tension <= SAWING_TENSION) {
      this.above = 0;
      this.counted = false;
      return;
    }
    this.above += dt;
    if (!this.counted && this.above >= SAWING_MIN_SECONDS) {
      this.count++;
      this.counted = true;
    }
  }
  reset() { this.count = 0; this.above = 0; this.counted = false; }
}
