/**
 * Skill Analysis (2026-11-27, mockup): practice motion measures from the needle driver's tip in
 * the 3D scene (it follows the camera when tracking is on). Approximate practice measures, not a
 * validated assessment. Each value's definition is next to it.
 */

/** Seconds of history kept for the path and speed charts. */
export const HISTORY_SECONDS = 120;
/** Samples per second recorded (the display runs faster; this keeps the history small). */
export const SAMPLE_HZ = 20;
/** A speed change larger than this between samples counts as abrupt (mm/s). */
export const ABRUPT_SPEED_CHANGE_MM_S = 60;
/** Below this tip speed the hand is resting, not moving (mm/s). */
export const MOVING_SPEED_MM_S = 5;

export interface SkillSample {
  /** Seconds since the session started. */
  t: number;
  /** Tip position seen from above (mm). */
  x: number;
  z: number;
  /** The forceps are holding the skin edge this sample, and whether the hold is safe. */
  holding: boolean;
  safeHold: boolean;
}

export interface SkillReport {
  seconds: number;
  pathLengthCm: number;
  /** Share (0–1) of moving samples without an abrupt speed change; null before any movement. */
  smoothness: number | null;
  /** Mean entry/exit symmetry of completed needle passes (mm); null before any. */
  accuracyMm: number | null;
  /** Share (0–1) of forceps hold time without over-stretching or slipping; null before any hold. */
  jawsControl: number | null;
  /** The tip path seen from above (mm), and the ideal: the shortest route from its start through
   * each needle entry point, in order, to its end (straight start → end before any pass). */
  path: Array<{ x: number; z: number }>;
  ideal: Array<{ x: number; z: number }> | null;
  /** Tip speed over time (s, mm/s). */
  speed: Array<{ t: number; v: number }>;
  /** Driver/forceps tip bumps outside needle handoffs (src/gameplay/tipCollisions.ts), when counted. */
  tipCollisions?: number;
  /** In-tissue needle regrasps, and how many landed on the tip (src/suture/gripPosition.ts), when counted. */
  regrasps?: { total: number; onTip: number };
}

export class SkillRecorder {
  private samples: SkillSample[] = [];
  private totalPathMm = 0;
  private lastAt = -Infinity;

  /** Add a sample; ignored when it comes sooner than 1/SAMPLE_HZ after the last one. */
  add(sample: SkillSample) {
    if (sample.t - this.lastAt < 1 / SAMPLE_HZ - 1e-9) return;
    const previous = this.samples.at(-1);
    if (previous) this.totalPathMm += Math.hypot(sample.x - previous.x, sample.z - previous.z);
    this.samples.push(sample);
    this.lastAt = sample.t;
    while (this.samples.length && sample.t - this.samples[0].t > HISTORY_SECONDS) this.samples.shift();
  }

  clear() {
    this.samples = [];
    this.totalPathMm = 0;
    this.lastAt = -Infinity;
  }

  get pathLengthMm() {
    return this.totalPathMm;
  }

  report(seconds: number, passSymmetriesMm: readonly number[], waypoints: ReadonlyArray<{ x: number; z: number }> = []): SkillReport {
    const samples = this.samples;
    const speed: Array<{ t: number; v: number }> = [];
    for (let i = 1; i < samples.length; i++) {
      const dt = samples[i].t - samples[i - 1].t;
      if (dt > 0) speed.push({ t: samples[i].t, v: Math.hypot(samples[i].x - samples[i - 1].x, samples[i].z - samples[i - 1].z) / dt });
    }
    let moving = 0;
    let smooth = 0;
    for (let i = 1; i < speed.length; i++) {
      if (speed[i].v < MOVING_SPEED_MM_S && speed[i - 1].v < MOVING_SPEED_MM_S) continue;
      moving++;
      if (Math.abs(speed[i].v - speed[i - 1].v) <= ABRUPT_SPEED_CHANGE_MM_S) smooth++;
    }
    const held = samples.filter((s) => s.holding);
    const mean = (values: readonly number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);
    const first = samples[0];
    const last = samples.at(-1);
    return {
      seconds,
      pathLengthCm: this.totalPathMm / 10,
      smoothness: moving ? smooth / moving : null,
      accuracyMm: mean(passSymmetriesMm),
      jawsControl: held.length ? held.filter((s) => s.safeHold).length / held.length : null,
      path: samples.map((s) => ({ x: s.x, z: s.z })),
      ideal: first && last && first !== last ? [{ x: first.x, z: first.z }, ...waypoints.map((w) => ({ x: w.x, z: w.z })), { x: last.x, z: last.z }] : null,
      speed,
    };
  }
}
