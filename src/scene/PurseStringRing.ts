import * as THREE from 'three';
import { RING_CENTRE, RING_RADIUS } from '../gameplay/purseString';

/** The round defect for the purse-string exercise (gameplay/purseString.ts): a marked ring on the
 * skin with a darker disc inside it. Marked, not cut. */
export class PurseStringRing {
  readonly root = new THREE.Group();
  constructor(surfaceY: number) {
    this.root.name = 'purse-string-ring';
    const ring = new THREE.Mesh(new THREE.RingGeometry(RING_RADIUS - 0.01, RING_RADIUS + 0.01, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x6a2fa8 }));
    const defect = new THREE.Mesh(new THREE.CircleGeometry(RING_RADIUS * 0.8, 40).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xb24a44, roughness: 0.3 }));
    ring.position.set(RING_CENTRE.x, surfaceY + 0.004, RING_CENTRE.z);
    defect.position.set(RING_CENTRE.x, surfaceY + 0.003, RING_CENTRE.z);
    this.root.add(defect, ring);
    this.root.visible = false;
  }
}
