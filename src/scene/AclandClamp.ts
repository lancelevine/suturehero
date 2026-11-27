import * as THREE from 'three';
import type { MicroTargetProfile } from '../environments/MicroTargets';
import { disposeChildren } from './disposeChildren';

/** Green double Acland clamp on the microsurgery vessel (roadmap, 2026-11-27): one clamp across each end, joined by a bar. */
const CLAMP_COLOR = 0x2e9d55;
/** Distance from each vessel's cut end to its clamp (scene units). */
const CLAMP_INSET = 0.55;
const CLAMP_THICKNESS = 0.09;
const BAR_RADIUS = 0.04;

export class AclandClamp {
  readonly root = new THREE.Group();
  private key = '';
  private readonly material = new THREE.MeshStandardMaterial({ color: CLAMP_COLOR, roughness: 0.35, metalness: 0.2 });

  constructor() {
    this.root.name = 'acland-clamp';
  }

  /** Place the clamp for this vessel profile (its gap follows the clamp setting); hidden when not visible. */
  update(profile: MicroTargetProfile, visible: boolean) {
    this.root.visible = visible;
    const key = `${profile.id}:${profile.gap}`;
    if (!visible || key === this.key) return;
    this.key = key;
    disposeChildren(this.root, new Set([this.material]));
    const size = profile.outerRadius * 1.7;
    const x = profile.gap / 2 + CLAMP_INSET;
    for (const side of [-1, 1]) {
      const head = new THREE.Mesh(new THREE.BoxGeometry(CLAMP_THICKNESS, size, size), this.material);
      head.position.set(side * x, profile.centerY, 0);
      head.castShadow = true;
      head.name = 'clamp-head';
      this.root.add(head);
    }
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(BAR_RADIUS, BAR_RADIUS, 2 * x, 12).rotateZ(Math.PI / 2), this.material);
    bar.position.set(0, profile.centerY - size / 2, -size / 2);
    bar.castShadow = true;
    bar.name = 'clamp-bar';
    this.root.add(bar);
  }
}
