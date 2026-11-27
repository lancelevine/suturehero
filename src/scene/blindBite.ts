import * as THREE from 'three';

/**
 * Blind bite flag (roadmap, 2026-11-27): when a needle pass comes out of the skin, check whether
 * the exit point was hidden from the view camera behind an instrument. Uses the 3D scene only,
 * not the trainee's real line of sight; approximate.
 */

/** Hits this close to the exit point (scene units) are the needle/skin itself, not a blocker. */
const EXIT_CLEARANCE = 0.03;

const raycaster = new THREE.Raycaster();
const direction = new THREE.Vector3();

/** Whether any of `blockers` lies between the camera and `exit`. */
export function exitHidden(camera: THREE.Camera, exit: THREE.Vector3, blockers: readonly THREE.Object3D[]) {
  const origin = camera.getWorldPosition(new THREE.Vector3());
  const distance = origin.distanceTo(exit);
  direction.copy(exit).sub(origin).normalize();
  raycaster.set(origin, direction);
  raycaster.far = Math.max(0, distance - EXIT_CLEARANCE);
  return raycaster.intersectObjects(blockers as THREE.Object3D[], true).length > 0;
}

/** Counts completed passes and those whose exit was hidden when it happened. */
export class BlindBiteCheck {
  exits = 0;
  hidden = 0;
  private seen = 0;

  /** Call each frame with the completed passes' exit points (in order). */
  update(exits: readonly (THREE.Vector3 | null)[], camera: THREE.Camera, blockers: readonly THREE.Object3D[]) {
    if (exits.length < this.seen) this.seen = 0;
    for (; this.seen < exits.length; this.seen++) {
      const exit = exits[this.seen];
      if (!exit) continue;
      this.exits++;
      if (exitHidden(camera, exit, blockers)) this.hidden++;
    }
  }

  reset() {
    this.exits = 0;
    this.hidden = 0;
    this.seen = 0;
  }
}
