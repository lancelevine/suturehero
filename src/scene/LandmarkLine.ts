import * as THREE from 'three';
import { LANDMARK_Z } from '../gameplay/landmark';

/** A landmark line (like the vermilion border) across the skin pad at z = LANDMARK_Z, following the course site. */
const LINE_COLOR = 0xb2384a;
const LINE_WIDTH = 0.035;
const HALF_LENGTH = 1.6;

export class LandmarkLine {
  readonly root = new THREE.Group();

  constructor(surfaceY: number) {
    this.root.name = 'landmark-line';
    const band = new THREE.Mesh(
      new THREE.PlaneGeometry(HALF_LENGTH * 2, LINE_WIDTH).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: LINE_COLOR, transparent: true, opacity: 0.85, depthWrite: false }),
    );
    band.position.set(0, surfaceY + 0.012, LANDMARK_Z);
    band.renderOrder = 2;
    this.root.add(band);
    this.root.visible = false;
  }

  update(visible: boolean, siteZ: number) {
    this.root.visible = visible;
    this.root.position.z = -siteZ;
  }
}
