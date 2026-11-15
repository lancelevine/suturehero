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
    // A pass the eye has not reached yet carries no thread: the thread runs on to the previous pass.
    const threaded = passes.filter((p) => p.eyeAngle > 0);
    if (!threaded.length) {
      this.exteriorCount = 1;
      return pins;
    }
    // Each pass's thread inside the tissue, and its exit if the eye is through.
    const layout = threaded.map(({ tract, eyeAngle }) => {
      const exitAngle = tract.exitAngle;
      const insideEnd = exitAngle === null ? eyeAngle : Math.min(eyeAngle, exitAngle);
      const arcCount = Math.max(1, Math.ceil((insideEnd * tract.start.length()) / rest));
      const exit = exitAngle !== null && eyeAngle > exitAngle ? tractPoint(tract, exitAngle) : null;
      return { tract, insideEnd, arcCount, exit, entry: tractPoint(tract, 0) };
    });
    // Older passes get their thread first: their path plus the loose span from the newer pass's entry.
    // Pulling the needle further takes thread from the free tail, never out of earlier passes (2026-11-15:
    // the needle-side thread used the whole strand first, so the thread jumped to the latest pass).
    const olderCost = (k: number) => {
      const loose = layout[k].exit ? Math.max(1, Math.ceil((layout[k - 1].entry.distanceTo(layout[k].exit!) * LOOSE_SLACK) / rest)) : 0;
      return loose + layout[k].arcCount;
    };
    let keep = layout.length;
    const firstMinimum = layout[0].arcCount + (layout[0].exit ? 1 : 0);
    let olderTotal = 0;
    for (let k = 1; k < layout.length; k++) olderTotal += olderCost(k);
    while (keep > 1 && firstMinimum + olderTotal > last) {
      keep--;
      olderTotal -= olderCost(keep);
    }
    // Lay the thread out from the eye: the newest pass first (sliding exterior), then each kept older pass.
    let index = 0;
    for (let k = 0; k < keep; k++) {
      const pass = layout[k];
      let start = index;
      if (pass.exit) {
        let segments: number;
        if (k === 0) {
          const distance = pass.exit.distanceTo(eye);
          const needed = Math.max(1, Math.ceil(distance / rest));
          if (needed > this.exteriorCount) this.exteriorCount = needed;
          else if (distance < (this.exteriorCount - SHRINK_MARGIN) * rest) this.exteriorCount = needed;
          // Only the thread left after the earlier passes: beyond it the thread is taut.
          segments = THREE.MathUtils.clamp(this.exteriorCount, 1, Math.max(1, last - pass.arcCount - olderTotal));
        } else segments = olderCost(k) - pass.arcCount;
        start = index + segments;
        if (start + pass.arcCount > last) break;
        pins.set(start, pass.exit);
      } else if (k > 0) break;
      const steps = Math.max(1, Math.min(pass.arcCount, last - start));
      for (let i = start === 0 ? 1 : 0; i <= steps; i++) pins.set(start + i, tractPoint(pass.tract, pass.insideEnd * (1 - i / steps)));
      index = start + steps;
    }
    return pins;
  }
}
