import * as THREE from 'three';
import { LONG_EDGE_RATIO } from '../gameplay/unequalEdges';

/** Guide dots for the unequal-edges exercise: every STEP along the short (left) edge, every STEP × ratio along the long (right) edge. */
const STEP = 0.2;
const COUNT = 6;
const EDGE_OFFSET = 0.09;

export class UnequalEdgeMarks {
  readonly root = new THREE.Group();

  constructor(surfaceY: number) {
    this.root.name = 'unequal-edges';
    const geometry = new THREE.CircleGeometry(0.018, 12).rotateX(-Math.PI / 2);
    const shortMaterial = new THREE.MeshBasicMaterial({ color: 0x3fd8ff, toneMapped: false });
    const longMaterial = new THREE.MeshBasicMaterial({ color: 0xffc14d, toneMapped: false });
    for (let i = -COUNT / 2; i <= COUNT / 2; i++) {
      const short = new THREE.Mesh(geometry, shortMaterial);
      short.position.set(-EDGE_OFFSET, surfaceY + 0.012, i * STEP);
      const long = new THREE.Mesh(geometry, longMaterial);
      long.position.set(EDGE_OFFSET, surfaceY + 0.012, i * STEP * LONG_EDGE_RATIO);
      this.root.add(short, long);
    }
    this.root.visible = false;
  }

  update(visible: boolean, siteZ: number) {
    this.root.visible = visible;
    this.root.position.z = -siteZ;
  }
}
