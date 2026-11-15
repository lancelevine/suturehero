import * as THREE from 'three';

/**
 * Grasping the suture with either instrument in the Sandbox, outside knot
 * tying (2026-11-15). Closing a jaw near the thread grips the nearest
 * thread point; that point then follows the jaw tip until the jaw opens.
 * Thread inside the tissue (pinned by the pass) cannot be gripped.
 */

/** A closing jaw grips thread within this distance of its tip (scene units, ≈ 1.9 mm). */
export const THREAD_GRASP_REACH = 0.07;
/** Jaw openness at or below which it counts as closed / at or above which it lets go. */
const CLOSED = 0.2;
const RELEASED = 0.45;

export interface JawState {
  id: string;
  openness: number;
  /** Jaw tip (world). */
  tip: THREE.Vector3;
  /** This instrument holds something else (the needle, the skin) and cannot grip thread. */
  busy: boolean;
}

export class ThreadGrasp {
  /** Thread point index held by each instrument id. */
  readonly grips = new Map<string, number>();
  private previousOpenness = new Map<string, number>();

  /**
   * One frame. `points` are the thread points (world, eye first); `fixed` are
   * indices the thread guide pins (inside the tissue, the eye) and cannot be gripped.
   */
  update(jaws: readonly JawState[], points: readonly THREE.Vector3[], fixed: ReadonlySet<number>) {
    for (const jaw of jaws) {
      const before = this.previousOpenness.get(jaw.id) ?? 1;
      this.previousOpenness.set(jaw.id, jaw.openness);
      if (this.grips.has(jaw.id)) {
        if (jaw.openness >= RELEASED || jaw.busy) this.grips.delete(jaw.id);
        continue;
      }
      if (jaw.busy || !(jaw.openness <= CLOSED && before > CLOSED)) continue;
      let best = -1;
      let bestDistance = THREAD_GRASP_REACH;
      for (let i = 1; i < points.length; i++) {
        if (fixed.has(i) || [...this.grips.values()].includes(i)) continue;
        const d = points[i].distanceTo(jaw.tip);
        if (d < bestDistance) {
          bestDistance = d;
          best = i;
        }
      }
      if (best >= 0) this.grips.set(jaw.id, best);
    }
  }

  /** Pins for the strand: each held point at its jaw tip. */
  pins(jaws: readonly JawState[]): Map<number, THREE.Vector3> {
    const pins = new Map<number, THREE.Vector3>();
    for (const jaw of jaws) {
      const index = this.grips.get(jaw.id);
      if (index !== undefined) pins.set(index, jaw.tip.clone());
    }
    return pins;
  }

  holds(id: string) {
    return this.grips.has(id);
  }

  reset() {
    this.grips.clear();
    this.previousOpenness.clear();
  }
}
