import type * as THREE from 'three';

/**
 * Where along the needle it is gripped (roadmap "Needle regrasp check", 2026-11-27). The needle's
 * points run from the eye (index 0) to the tip (last). Gripping right at the tip dulls or bends it;
 * on exit the needle should be regrasped behind the tip. Approximate, from the scene geometry.
 */

/** A grip within this share of the needle's length from the tip counts as grabbing the tip. */
export const TIP_ZONE = 0.1;

/** 0 at the tip, 1 at the eye, for a grip point in the needle's local frame. */
export function gripFractionFromTip(points: readonly THREE.Vector3[], heldPoint: THREE.Vector3) {
  let nearest = 0;
  let best = Infinity;
  points.forEach((point, index) => {
    const distance = point.distanceToSquared(heldPoint);
    if (distance < best) {
      best = distance;
      nearest = index;
    }
  });
  return (points.length - 1 - nearest) / Math.max(1, points.length - 1);
}

/** Counts regrasps of a needle in the tissue that land on the tip. */
export class RegraspCheck {
  tipGrabs = 0;
  regrasps = 0;
  private lastHeld: THREE.Vector3 | null = null;

  /** Call each frame with the current grip point (needle-local, or null when not held). */
  update(points: readonly THREE.Vector3[], heldPoint: THREE.Vector3 | null, needleInTissue: boolean) {
    const newGrip = heldPoint !== null && heldPoint !== this.lastHeld;
    this.lastHeld = heldPoint;
    if (!newGrip || !needleInTissue) return;
    this.regrasps++;
    if (gripFractionFromTip(points, heldPoint) < TIP_ZONE) this.tipGrabs++;
  }

  reset() {
    this.tipGrabs = 0;
    this.regrasps = 0;
    this.lastHeld = null;
  }
}
