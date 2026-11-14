import { Vector3 } from 'three';

/**
 * Tip accuracy check (2026-11-14): the user touches the two real tips
 * together at ACCURACY_TOUCHES spots around the workspace and presses
 * "Record touch" each time. Each touch stores the distance between the two
 * virtual (measured) tips and where it was. The result is how far apart the
 * app thinks touching tips are: mean, worst, and where the worst was.
 */

export const ACCURACY_TOUCHES = 6;
export const TIP_ACCURACY_STORAGE_KEY = 'suturehero.tipAccuracy.v1';

export interface AccuracyTouch {
  /** Distance between the two measured tips (mm). */
  distanceMm: number;
  /** Midpoint of the two tips, camera-1 mm. */
  at: [number, number, number];
}

export interface AccuracyResult {
  touches: AccuracyTouch[];
  meanMm: number;
  worstMm: number;
  /** Index of the worst touch. */
  worstIndex: number;
  /** ISO time of the check. */
  checkedAt: string;
}

export function summarizeAccuracy(touches: readonly AccuracyTouch[], checkedAt: string): AccuracyResult | null {
  if (!touches.length) return null;
  const distances = touches.map((t) => t.distanceMm);
  const worstMm = Math.max(...distances);
  return {
    touches: [...touches],
    meanMm: distances.reduce((sum, d) => sum + d, 0) / distances.length,
    worstMm,
    worstIndex: distances.indexOf(worstMm),
    checkedAt,
  };
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export class TipAccuracyCheck {
  private touches: AccuracyTouch[] = [];

  constructor(private readonly storage: StorageLike | null) {}

  /** Records one touch from the two current tips (camera-1 mm); saves the result after ACCURACY_TOUCHES. */
  record(forcepsTip: Vector3, needleDriverTip: Vector3): number {
    const middle = forcepsTip.clone().add(needleDriverTip).multiplyScalar(0.5);
    this.touches.push({ distanceMm: forcepsTip.distanceTo(needleDriverTip), at: middle.toArray() as [number, number, number] });
    if (this.touches.length >= ACCURACY_TOUCHES) {
      const result = summarizeAccuracy(this.touches, new Date().toISOString());
      this.touches = [];
      try {
        this.storage?.setItem(TIP_ACCURACY_STORAGE_KEY, JSON.stringify(result));
      } catch {
        // Blocked storage: the result is not kept.
      }
      return ACCURACY_TOUCHES;
    }
    return this.touches.length;
  }

  /** Touches recorded towards the current check. */
  pending(): readonly AccuracyTouch[] {
    return this.touches;
  }

  cancel() {
    this.touches = [];
  }

  /** The last completed check, or null. */
  lastResult(): AccuracyResult | null {
    try {
      const value = JSON.parse(this.storage?.getItem(TIP_ACCURACY_STORAGE_KEY) ?? 'null');
      return value && Array.isArray(value.touches) && Number.isFinite(value.meanMm) ? (value as AccuracyResult) : null;
    } catch {
      return null;
    }
  }
}

const browserStorage = (): StorageLike | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
};

export const tipAccuracyCheck = new TipAccuracyCheck(browserStorage());
