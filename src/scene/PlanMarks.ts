import * as THREE from 'three';
import { disposeChildren } from './disposeChildren';

/** Planned stitch spots (roadmap "Plan vs actual"): a ring across the wound line at each planned z. */
const PLAN_COLOR = 0xb68cff;

export class PlanMarks {
  readonly root = new THREE.Group();
  private readonly geometry = new THREE.RingGeometry(0.05, 0.065, 32).rotateX(-Math.PI / 2);
  private readonly material = new THREE.MeshBasicMaterial({ color: PLAN_COLOR, toneMapped: false, side: THREE.DoubleSide });
  private key = '';

  constructor(private readonly surfaceY: number) {
    this.root.name = 'plan-marks';
  }

  update(plannedZ: readonly number[], siteZ: number, visible: boolean) {
    this.root.visible = visible;
    this.root.position.z = -siteZ;
    const key = plannedZ.join(',');
    if (key === this.key) return;
    this.key = key;
    disposeChildren(this.root, new Set([this.material]), new Set([this.geometry]));
    for (const z of plannedZ) {
      const ring = new THREE.Mesh(this.geometry, this.material);
      ring.position.set(0, this.surfaceY + 0.014, z);
      ring.name = 'plan-mark';
      this.root.add(ring);
    }
  }
}
