/** Rates are reported once per this window (ms). */
export const RATE_WINDOW_MS = 1000;

/**
 * Flow and decode frame counts over a window, for the camera status lines (shared by both
 * cameras, 2026-11-27). Times are performance.now() in ms.
 */
export class FrameRates {
  private flows = 0;
  private decodes = 0;

  constructor(private windowStart: number) {}

  flow() {
    this.flows++;
  }

  decode() {
    this.decodes++;
  }

  /** Counts and the seconds they cover once the window has passed (then restarted); else null. */
  take(now: number) {
    if (now - this.windowStart < RATE_WINDOW_MS) return null;
    const rates = { flows: this.flows, decodes: this.decodes, seconds: (now - this.windowStart) / 1000 };
    this.reset(now);
    return rates;
  }

  reset(now: number) {
    this.flows = 0;
    this.decodes = 0;
    this.windowStart = now;
  }
}

/** Frames per second over RATE_WINDOW_MS windows: `tick` counts a frame and returns the rounded rate when a window ends, else null. */
export class FpsCounter {
  private frames = 0;

  constructor(private windowStart: number) {}

  tick(now: number) {
    this.frames++;
    const elapsed = now - this.windowStart;
    if (elapsed < RATE_WINDOW_MS) return null;
    const fps = Math.round((this.frames * 1000) / elapsed);
    this.frames = 0;
    this.windowStart = now;
    return fps;
  }
}
