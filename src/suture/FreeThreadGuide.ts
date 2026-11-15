import * as THREE from 'three';
import { tractPoint, type FreeTract } from '../tissue/FreeNeedlePass';
import type { ThreadStrand } from './ThreadStrand';

/**
 * Thread through free (Sandbox) needle passes (Stage B2, 2026-11-15). Like
 * TissueThreadGuide for the guided pass, but along each needle's own circle
 * from wherever it entered, and through several passes in sequence (a
 * running stitch). Strand points are numbered from the needle eye:
 *
 *   eye → newest exit → its path through the tissue → newest entry
 *       → loose thread → previous exit → path → previous entry → … → tail
 *
 * The first threaded pass's exterior grows and shrinks with the eye's
 * distance, so the thread slides through as it is pulled; the loose thread
 * between older passes gets enough strand for the gap. Passes that no longer
 * fit on the strand are left out (the thread has been pulled out of them).
 */

/** Strand points kept free at the tail end. */
const TAIL_RESERVE = 6;
/** Hysteresis before handing exterior thread back (in strand segments). */
const SHRINK_MARGIN = 1.15;
/** Extra thread allowed for the loose span between two passes. */
const LOOSE_SLACK = 1.05;

/** One pass on the thread: its path, and where the needle eye is along it (≤ 0 not in yet, Infinity through). */
export interface ThreadedPass {
  tract: FreeTract;
  eyeAngle: number;
}

export class FreeThreadGuide {
  private exteriorCount = 1;

  reset() {
    this.exteriorCount = 1;
  }

  /** Pins for this frame; `passes` newest first. */
  anchors(strand: ThreadStrand, eye: THREE.Vector3, passes: readonly ThreadedPass[]): Map<number, THREE.Vector3> {
    const pins = new Map<number, THREE.Vector3>([[0, eye.clone()]]);
    const rest = strand.restLength;
    const last = strand.count - 1 - TAIL_RESERVE;
    let index = 0;
    let from = eye.clone();
    let first = true;
    for (const { tract, eyeAngle } of passes) {
      // A pass the eye has not reached yet carries no thread: the thread runs on to the previous pass.
      if (!(eyeAngle > 0)) continue;
      const radius = tract.start.length();
      const exitAngle = tract.exitAngle;
      const insideEnd = exitAngle === null ? eyeAngle : Math.min(eyeAngle, exitAngle);
      const arcCount = Math.max(1, Math.ceil((insideEnd * radius) / rest));
      let start = index;
      if (exitAngle !== null && eyeAngle > exitAngle) {
        const exit = tractPoint(tract, exitAngle);
        const distance = exit.distanceTo(from);
        let segments: number;
        if (first) {
          const needed = Math.max(1, Math.ceil(distance / rest));
          if (needed > this.exteriorCount) this.exteriorCount = needed;
          else if (distance < (this.exteriorCount - SHRINK_MARGIN) * rest) this.exteriorCount = needed;
          segments = THREE.MathUtils.clamp(this.exteriorCount, 1, Math.max(1, last - index - arcCount));
        } else segments = Math.max(1, Math.ceil((distance * LOOSE_SLACK) / rest));
        if (index + segments + arcCount > last) break;
        start = index + segments;
        pins.set(start, exit);
      } else if (!first || index + arcCount > last) break;
      const steps = Math.max(1, Math.min(arcCount, last - start));
      for (let i = start === 0 ? 1 : 0; i <= steps; i++) pins.set(start + i, tractPoint(tract, insideEnd * (1 - i / steps)));
      index = start + steps;
      from = tractPoint(tract, 0);
      first = false;
    }
    if (first) this.exteriorCount = 1;
    return pins;
  }
}
