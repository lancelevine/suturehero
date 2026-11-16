/**
 * Timed instrument choreography for the demo (2026-11-15): a list of segments,
 * each moving the instruments over a duration. Poses are set directly each
 * frame and the simulation runs its normal physics on them, so the knot forms
 * from real thread contact rather than a drawn shape.
 */

export interface Segment {
  /** Caption shown while this segment runs (kept until the next caption); a function is read after `start`. */
  caption?: string | (() => string);
  /** Duration (s). */
  seconds: number;
  /** Called once when the segment starts (record start poses here). */
  start?: () => void;
  /** Called each frame with progress 0–1 (eased by the segment if it wants). */
  apply?: (progress: number) => void;
  /** Ends the segment early once true (checked after each frame). */
  done?: () => boolean;
}

export class Choreography {
  private index = -1;
  private elapsed = 0;
  caption = '';

  constructor(private readonly segments: readonly Segment[]) {}

  get finished() {
    return this.index >= this.segments.length;
  }

  /** Advances by `dt` seconds; returns false when finished. */
  step(dt: number): boolean {
    if (this.index < 0) this.begin(0);
    let remaining = Math.max(0, dt);
    while (!this.finished) {
      const segment = this.segments[this.index];
      const left = segment.seconds - this.elapsed;
      if (remaining < left) {
        this.elapsed += remaining;
        segment.apply?.(segment.seconds > 0 ? this.elapsed / segment.seconds : 1);
        if (segment.done?.()) this.begin(this.index + 1);
        return true;
      }
      remaining -= left;
      segment.apply?.(1);
      this.begin(this.index + 1);
      // One segment boundary per frame keeps each segment's first frame visible.
      if (!this.finished) return true;
    }
    return false;
  }

  private begin(index: number) {
    this.index = index;
    this.elapsed = 0;
    const segment = this.segments[index];
    if (!segment) return;
    segment.start?.();
    const caption = typeof segment.caption === 'function' ? segment.caption() : segment.caption;
    if (caption) this.caption = caption;
  }
}

/** Smooth start and stop, like a hand. */
export const ease = (t: number) => t * t * (3 - 2 * t);

/** Minimum-jerk reach profile used by measured human point-to-point motion. */
export const humanEase = (t: number) => {
  const x = Math.max(0, Math.min(1, t));
  return x * x * x * (10 + x * (-15 + 6 * x));
};

/**
 * Monotonic progress with a restrained cadence change. It avoids the exact
 * constant-speed circles that make a scripted wrap look motor-driven.
 */
export const humanCadence = (t: number) => {
  const x = Math.max(0, Math.min(1, t));
  return x - Math.sin(2 * Math.PI * x) * 0.045 / (2 * Math.PI);
};
