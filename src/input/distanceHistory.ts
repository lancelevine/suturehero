/**
 * Recent tracker distances for one instrument (moved out of
 * src/tracking.ts on 2026-11-09 without changing behaviour).
 *
 * Keeps the last DISTANCE_HISTORY_SAMPLES distances (one per frame time),
 * repeats the newest one while the instrument is at rest so changes in which
 * faces are visible cannot create depth movement, and returns their median.
 */
export const DISTANCE_HISTORY_SAMPLES = 5;

export class DistanceHistory {
  private samples: number[] = [];
  private lastStamp: number | undefined;

  /** Records this frame's distance (mm) and returns the median of the recent ones. */
  update(estimatedMm: number, now: number, stationary: boolean): number {
    const raw = stationary ? (this.samples.at(-1) ?? estimatedMm) : estimatedMm;
    if (this.lastStamp !== now) {
      this.samples.push(raw);
      if (this.samples.length > DISTANCE_HISTORY_SAMPLES) this.samples.shift();
      this.lastStamp = now;
    }
    const sorted = [...this.samples].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  }
}
