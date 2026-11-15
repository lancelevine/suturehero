import * as THREE from 'three';

/**
 * Sandbox (2026-11-15): while the needle is in the skin it can only move
 * along its curve, but the camera-tracked instrument holding it follows the
 * real hand, so it drifted off the needle. For display, the holder is drawn
 * gripping the needle; its real (camera) pose is saved and put back before
 * the next simulation step, so the hand still drives the needle and the
 * forcing check still sees where the hand really is.
 */
/** Glide back to the hand after the needle leaves the skin: time constant (s); settled within about 0.25 s. */
export const GLIDE_TAU_S = 0.08;
/** The glide ends when the drawn pose is this close to the real one (scene units, radians). */
const GLIDE_DONE_UNITS = 0.003;
const GLIDE_DONE_RADIANS = 0.01;

export class HeldInstrumentDisplay {
  private tool: THREE.Object3D | null = null;
  private readonly position = new THREE.Vector3();
  private readonly quaternion = new THREE.Quaternion();
  /** Where the tool was last drawn on the needle, while it glides back to the hand. */
  private drawn: { tool: THREE.Object3D; position: THREE.Vector3; quaternion: THREE.Quaternion } | null = null;

  /** Saves `tool`'s real pose, then lets `place` move it onto the needle for this frame's drawing. */
  lockToNeedle(tool: THREE.Object3D, place: () => void) {
    this.tool = tool;
    this.position.copy(tool.position);
    this.quaternion.copy(tool.quaternion);
    place();
    this.drawn = { tool, position: tool.position.clone(), quaternion: tool.quaternion.clone() };
  }

  /**
   * When not locked: draws the tool gliding from where it was on the needle
   * back to its real pose (restored before the next step like a lock).
   */
  glideBack(dt: number) {
    const drawn = this.drawn;
    if (!drawn) return;
    const tool = drawn.tool;
    this.tool = tool;
    this.position.copy(tool.position);
    this.quaternion.copy(tool.quaternion);
    const blend = 1 - Math.exp(-Math.max(0, dt) / GLIDE_TAU_S);
    drawn.position.lerp(tool.position, blend);
    drawn.quaternion.slerp(tool.quaternion, blend);
    if (drawn.position.distanceTo(tool.position) < GLIDE_DONE_UNITS && drawn.quaternion.angleTo(tool.quaternion) < GLIDE_DONE_RADIANS) {
      this.drawn = null;
      return;
    }
    tool.position.copy(drawn.position);
    tool.quaternion.copy(drawn.quaternion);
    tool.updateWorldMatrix(true, false);
  }

  /** Puts the saved real pose back (call before the simulation step). */
  restore() {
    if (!this.tool) return;
    this.tool.position.copy(this.position);
    this.tool.quaternion.copy(this.quaternion);
    this.tool.updateWorldMatrix(true, false);
    this.tool = null;
  }
}
