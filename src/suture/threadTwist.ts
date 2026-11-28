import * as THREE from 'three';

/** Thread twist (roadmap). Rotating the needle driver to follow the needle's curve twists the
 * attached thread. Accumulates the driver's roll about its own long axis while it holds the needle
 * (turns, signed); letting the needle hang free lets the twist out. The thread is not drawn curling. */
export const UNTWIST_TURNS_PER_SECOND = 0.5;
/** Twist beyond this many turns tends to curl the slack into loops. */
export const CURL_TURNS = 3;

const AXIS = new THREE.Vector3(0, 0, 1);

export class ThreadTwist {
  turns = 0;
  private last: THREE.Quaternion | null = null;
  private readonly delta = new THREE.Quaternion();

  /** `holding`: the driver holds the needle; `dt` seconds since the last call. */
  update(driver: THREE.Quaternion, holding: boolean, dt: number) {
    if (holding && this.last) {
      this.delta.copy(this.last).invert().multiply(driver).normalize();
      // Signed roll about the driver's own long axis (local z).
      const roll = 2 * Math.atan2(this.delta.x * AXIS.x + this.delta.y * AXIS.y + this.delta.z * AXIS.z, this.delta.w);
      const wrapped = Math.atan2(Math.sin(roll), Math.cos(roll));
      this.turns += wrapped / (Math.PI * 2);
    } else if (!holding) {
      const relax = Math.min(Math.abs(this.turns), UNTWIST_TURNS_PER_SECOND * dt);
      this.turns -= Math.sign(this.turns) * relax;
    }
    this.last = holding ? driver.clone() : null;
  }

  reset() { this.turns = 0; this.last = null; }
}

export function describeTwist(twist: ThreadTwist) {
  const turns = Math.abs(twist.turns);
  if (turns < 1) return '';
  return turns >= CURL_TURNS ? `Thread twisted ${turns.toFixed(1)} turns · it will curl into loops · let the needle hang to untwist` : `Thread twist ${turns.toFixed(1)} turns`;
}
