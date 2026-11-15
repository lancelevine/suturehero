import * as THREE from 'three';
import { tractPoint, type FreeTract } from '../tissue/FreeNeedlePass';
import type { ThreadStrand } from './ThreadStrand';

/**
 * Thread through a free (Sandbox) needle pass (Stage B2, 2026-11-15). Like
 * TissueThreadGuide for the guided pass, but along the needle's own circle
 * from wherever it entered: pins strand points (index from the needle eye)
 * along the path inside the tissue, and, once the eye is out, at the exit
 * with enough thread between eye and exit for the distance, so the thread
 * slides through as it is pulled.
 */

/** Strand points kept free at the tail end. */
const TAIL_RESERVE = 6;
/** Hysteresis before handing exterior thread back (in strand segments). */
const SHRINK_MARGIN = 1.15;

export class FreeThreadGuide {
  private exteriorCount = 1;

  reset() {
    this.exteriorCount = 1;
  }

  /**
   * Pins for this frame. `eyeAngle` is where the needle eye is along the
   * tract (≤ 0: not yet in; Infinity: the needle is through), null for no pass.
   */
  anchors(strand: ThreadStrand, eye: THREE.Vector3, tract: FreeTract | null, eyeAngle: number | null): Map<number, THREE.Vector3> {
    const pins = new Map<number, THREE.Vector3>([[0, eye.clone()]]);
    if (!tract || eyeAngle === null || eyeAngle <= 0) {
      this.exteriorCount = 1;
      return pins;
    }
    const rest = strand.restLength;
    const radius = tract.start.length();
    const exitAngle = tract.exitAngle;
    const insideEnd = exitAngle === null ? eyeAngle : Math.min(eyeAngle, exitAngle);
    const arcCount = Math.max(1, Math.ceil((insideEnd * radius) / rest));
    let offset = 0;
    if (exitAngle !== null && eyeAngle > exitAngle) {
      const exit = tractPoint(tract, exitAngle);
      const distance = exit.distanceTo(eye);
      const needed = Math.max(1, Math.ceil(distance / rest));
      if (needed > this.exteriorCount) this.exteriorCount = needed;
      else if (distance < (this.exteriorCount - SHRINK_MARGIN) * rest) this.exteriorCount = needed;
      offset = THREE.MathUtils.clamp(this.exteriorCount, 1, strand.count - arcCount - TAIL_RESERVE);
      pins.set(offset, exit);
    }
    const steps = Math.max(1, Math.min(arcCount, strand.count - offset - TAIL_RESERVE));
    for (let i = offset === 0 ? 1 : 0; i <= steps; i++) pins.set(offset + i, tractPoint(tract, insideEnd * (1 - i / steps)));
    return pins;
  }
}
