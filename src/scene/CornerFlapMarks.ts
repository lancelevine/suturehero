import * as THREE from 'three';
import { FLAP_HALF_WIDTH, FLAP_LENGTH, FLAP_TIP } from '../gameplay/cornerStitch';

/** Marker-pen outline of the V-shaped flap for the corner stitch exercise (gameplay/cornerStitch.ts),
 * drawn on the right side of the pad with its tip at the wound edge. */
export class CornerFlapMarks {
  readonly root = new THREE.Group();
  constructor(surfaceY: number) {
    this.root.name = 'corner-flap-marks';
    const y = surfaceY + 0.004;
    const points = [
      new THREE.Vector3(FLAP_TIP.x + FLAP_LENGTH, y, FLAP_TIP.z + FLAP_HALF_WIDTH),
      new THREE.Vector3(FLAP_TIP.x, y, FLAP_TIP.z),
      new THREE.Vector3(FLAP_TIP.x + FLAP_LENGTH, y, FLAP_TIP.z - FLAP_HALF_WIDTH),
    ];
    // WebGL lines are one pixel wide: draw each arm of the V as a thin flat strip instead.
    const material = new THREE.MeshBasicMaterial({ color: 0x6a2fa8 });
    for (const end of [points[0], points[2]]) {
      const length = end.distanceTo(points[1]);
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(length, 0.018).rotateX(-Math.PI / 2), material);
      strip.position.copy(end).add(points[1]).multiplyScalar(0.5);
      strip.rotation.y = -Math.atan2(end.z - points[1].z, end.x - points[1].x);
      strip.name = 'corner-flap-outline';
      this.root.add(strip);
    }
    const tip = new THREE.Mesh(new THREE.CircleGeometry(0.025, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x5b2a86 }));
    tip.position.set(FLAP_TIP.x, y, FLAP_TIP.z);
    tip.name = 'corner-flap-tip';
    this.root.add(tip);
    this.root.visible = false;
  }
}
