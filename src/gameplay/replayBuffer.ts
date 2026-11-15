/**
 * Replay (2026-11-15): a rolling buffer of recent frames, to play the last
 * stitch back in slow motion. Generic over the frame contents.
 */

/** Seconds of history kept. */
export const REPLAY_SECONDS = 12;
/** Playback speed (half real time). */
export const REPLAY_SPEED = 0.5;

export class ReplayBuffer<T> {
  private frames: { t: number; frame: T }[] = [];

  constructor(private readonly seconds = REPLAY_SECONDS) {}

  /** Adds a frame at time `t` (s) and drops frames older than the window. */
  push(t: number, frame: T) {
    const last = this.frames[this.frames.length - 1];
    if (last && t < last.t) this.frames = [];
    this.frames.push({ t, frame });
    const oldest = t - this.seconds;
    let drop = 0;
    while (drop < this.frames.length - 1 && this.frames[drop].t < oldest) drop++;
    if (drop) this.frames.splice(0, drop);
  }

  get length() {
    return this.frames.length;
  }

  /** Duration covered (s). */
  get duration() {
    return this.frames.length > 1 ? this.frames[this.frames.length - 1].t - this.frames[0].t : 0;
  }

  /** The latest frame at or before `offset` seconds from the start. */
  at(offset: number): T | null {
    if (!this.frames.length) return null;
    const t = this.frames[0].t + offset;
    let lo = 0, hi = this.frames.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.frames[mid].t <= t) lo = mid;
      else hi = mid - 1;
    }
    return this.frames[lo].frame;
  }

  /** All frames, oldest first (for drawing paths). */
  all(): T[] {
    return this.frames.map((f) => f.frame);
  }

  clear() {
    this.frames = [];
  }
}

/** Plays a buffer back: call `advance(dt)` each display frame; null when done. */
export class ReplayPlayer<T> {
  private offset = 0;
  private finished = false;

  constructor(private readonly buffer: ReplayBuffer<T>, private readonly speed = REPLAY_SPEED) {}

  get progress() {
    return this.buffer.duration ? Math.min(1, this.offset / this.buffer.duration) : 1;
  }

  advance(dt: number): T | null {
    if (this.finished) return null;
    const end = this.buffer.duration;
    // The last frame is always shown once (time sums are not exact).
    if (this.offset >= end - 1e-9) this.finished = true;
    const frame = this.buffer.at(Math.min(this.offset + 1e-9, end));
    this.offset += Math.max(0, dt) * this.speed;
    return frame;
  }
}
