import * as THREE from 'three';

/**
 * Turns the microsurgery vessel about its own axis (roadmap: full anastomosis / "Flip the vessel",
 * 2026-11-27). The needle pass always works on the top of the vessel; turning the vessel brings the
 * next stitch site there, as a surgeon turns the double clamp. The vessel is a cylinder, so its
 * collision and load-bearing tests are unchanged by the turn; only what is drawn turns with it.
 */
export class VesselFrame {
  readonly root = new THREE.Group();
  /** Current turn about the vessel axis (radians). */
  angle = 0;

  constructor() {
    this.root.name = 'vessel-frame';
  }

  /** Pivot on the vessel axis at height `centerY`. Children are placed in world coordinates as before. */
  setAxisHeight(centerY: number) {
    this.root.position.y = centerY;
    for (const child of this.root.children) child.position.y = -centerY;
  }

  turnBy(radians: number) {
    this.setAngle(this.angle + radians);
  }

  setAngle(radians: number) {
    const full = Math.PI * 2;
    this.angle = ((radians % full) + full) % full;
    this.root.rotation.x = this.angle;
  }
}
