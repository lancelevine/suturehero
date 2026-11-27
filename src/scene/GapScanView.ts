import * as THREE from 'three';
import type { OpenSpan } from '../gameplay/gapScan';
import { disposeChildren } from './disposeChildren';

/** Open stretches of the wound after a closure (src/gameplay/gapScan.ts), drawn as red bars on the skin. */
const OPEN_COLOR = 0xff5a4f;
const BAR_WIDTH = 0.03;
const SURFACE_LIFT = 0.016;

export class GapScanView {
  readonly root = new THREE.Group();
  private key = '';
  private readonly material = new THREE.MeshBasicMaterial({ color: OPEN_COLOR, transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide });

  constructor(private readonly surfaceY: number) {
    this.root.name = 'gap-scan';
    this.root.renderOrder = 3;
  }

  /** Show `spans` (wound z, scene units) following the course's current site like the other stitch views. */
  update(spans: readonly OpenSpan[], siteZ: number) {
    this.root.position.z = -siteZ;
    const key = spans.map((s) => `${s.from.toFixed(3)}:${s.to.toFixed(3)}`).join(';');
    if (key === this.key) return;
    this.key = key;
    disposeChildren(this.root, new Set([this.material]));
    for (const span of spans) {
      const length = Math.max(span.to - span.from, BAR_WIDTH);
      const bar = new THREE.Mesh(new THREE.PlaneGeometry(BAR_WIDTH, length).rotateX(-Math.PI / 2), this.material);
      bar.position.set(0, this.surfaceY + SURFACE_LIFT, (span.from + span.to) / 2);
      bar.name = 'gap-scan-open';
      this.root.add(bar);
    }
  }
}
