import * as THREE from 'three';

/**
 * Sandbox (2026-11-15): while the needle is in the skin it can only move
 * along its curve, but the camera-tracked instrument holding it follows the
 * real hand, so it drifted off the needle. For display, the holder is drawn
 * gripping the needle; its real (camera) pose is saved and put back before
 * the next simulation step, so the hand still drives the needle and the
 * forcing check still sees where the hand really is.
 */
export class HeldInstrumentDisplay {
  private tool: THREE.Object3D | null = null;
  private readonly position = new THREE.Vector3();
  private readonly quaternion = new THREE.Quaternion();

  /** Saves `tool`'s real pose, then lets `place` move it onto the needle for this frame's drawing. */
  lockToNeedle(tool: THREE.Object3D, place: () => void) {
    this.tool = tool;
    this.position.copy(tool.position);
    this.quaternion.copy(tool.quaternion);
    place();
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
