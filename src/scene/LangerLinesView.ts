import * as THREE from 'three';

/** Faint skin tension lines (environments/langerLines.ts) across the practice pad at the site's angle
 * to the wound. */
const LINE_COUNT = 9;
const SPACING = 0.32;
const LENGTH = 3.2;

export class LangerLinesView {
  readonly root = new THREE.Group();
  constructor(surfaceY: number, angleDeg: number | null) {
    this.root.name = 'langer-lines';
    this.root.visible = angleDeg !== null;
    if (angleDeg === null) return;
    const material = new THREE.MeshBasicMaterial({ color: 0x7a4a3a, transparent: true, opacity: 0.18, depthWrite: false });
    const angle = (angleDeg * Math.PI) / 180;
    for (let i = 0; i < LINE_COUNT; i++) {
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.012, LENGTH).rotateX(-Math.PI / 2), material);
      const offset = (i - (LINE_COUNT - 1) / 2) * SPACING;
      // Lines run at `angle` from the wound direction (z), spread across the pad.
      strip.rotation.y = angle;
      strip.position.set(offset * Math.cos(angle), surfaceY + 0.002, -offset * Math.sin(angle));
      strip.name = 'langer-line';
      this.root.add(strip);
    }
  }
}
