/**
 * Per-instrument memory of stereo rig fits (moved out of src/tracking.ts, 2026-11-27): the result
 * for the current frame pair (so it is solved once), and the last accepted pose, which seeds the
 * next fit while it is recent so the fit stays continuous through rejected frames. A different
 * calibration starts afresh.
 */

/** A remembered stereo pose guides the next fit only while this recent (ms). */
export const STEREO_CONTINUITY_MS = 500;

interface Entry<Pose, Calibration> {
  key: string;
  calibration: Calibration;
  pose: Pose | null;
  lastGood?: Pose;
  lastGoodAt?: number;
}

export class StereoPoseMemory<Name, Pose, Calibration> {
  private readonly entries = new Map<Name, Entry<Pose, Calibration>>();

  /** The fit already made for this frame pair (`key`), or undefined when none was made yet. */
  cached(name: Name, key: string, calibration: Calibration): Pose | null | undefined {
    const entry = this.entries.get(name);
    return entry?.key === key && entry.calibration === calibration ? entry.pose : undefined;
  }

  /** Starting guess for a new fit at `pairAt`: the last fit, else the last accepted pose while recent. */
  seed(name: Name, pairAt: number): Pose | undefined {
    const entry = this.entries.get(name);
    if (entry?.pose) return entry.pose;
    return entry?.lastGood && pairAt - (entry.lastGoodAt ?? -Infinity) < STEREO_CONTINUITY_MS ? entry.lastGood : undefined;
  }

  remember(name: Name, key: string, calibration: Calibration, pose: Pose | null, pairAt: number) {
    const previous = this.entries.get(name);
    const keep = previous?.calibration === calibration;
    this.entries.set(name, {
      key,
      calibration,
      pose,
      lastGood: pose ?? (keep ? previous?.lastGood : undefined),
      lastGoodAt: pose ? pairAt : keep ? previous?.lastGoodAt : undefined,
    });
  }
}
