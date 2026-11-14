import * as THREE from 'three';
import { JAW_POINT_MM } from '../suture/NeedleGrasp';

/**
 * Measured-tip markers (2026-11-14): with stereo-calibrated tips, a dot at
 * each instrument's measured tip and a smaller white dot at the grasp point
 * (JAW_POINT_MM up the shaft), so it is visible exactly where the app thinks
 * the tips are relative to the needle and tissue.
 */

/** Tip dot radius (real mm); the grasp-point dot is half this. */
export const TIP_MARKER_RADIUS_MM = 1.5;
/** Smallest tip dot radius (scene units), so the dots stay visible at small workspace scales. */
export const MIN_TIP_MARKER_RADIUS = 0.035;

export class TipMarkers {
  readonly root = new THREE.Group();
  private readonly markers = new Map<THREE.Object3D, { tip: THREE.Mesh; jaw: THREE.Mesh }>();

  constructor(tools: ReadonlyArray<{ root: THREE.Object3D; color: number }>) {
    this.root.name = 'measured-tip-markers';
    for (const tool of tools) {
      const tip = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: tool.color, depthTest: false, transparent: true, opacity: 0.9 }));
      const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, transparent: true, opacity: 0.9 }));
      for (const mesh of [tip, jaw]) {
        mesh.renderOrder = 10;
        this.root.add(mesh);
      }
      this.markers.set(tool.root, { tip, jaw });
    }
    this.root.visible = false;
  }

  /**
   * Shows the markers at each tool's tip when `unitsPerMm` is set (measured stereo tips), else hides
   * them. `measured(root)` says whether that tool's tip is currently measured; others get no dots.
   */
  update(unitsPerMm: number | null, visible = true, measured: (toolRoot: THREE.Object3D) => boolean = () => true) {
    this.root.visible = visible && unitsPerMm !== null;
    if (!this.root.visible || unitsPerMm === null) return;
    const radius = Math.max(TIP_MARKER_RADIUS_MM * unitsPerMm, MIN_TIP_MARKER_RADIUS);
    for (const [toolRoot, { tip, jaw }] of this.markers) {
      tip.visible = jaw.visible = measured(toolRoot);
      toolRoot.updateWorldMatrix(true, false);
      const position = toolRoot.getWorldPosition(new THREE.Vector3());
      const shaft = new THREE.Vector3(0, 0, 1).applyQuaternion(toolRoot.getWorldQuaternion(new THREE.Quaternion()));
      tip.position.copy(position);
      tip.scale.setScalar(radius);
      jaw.position.copy(position).addScaledVector(shaft, JAW_POINT_MM * unitsPerMm);
      jaw.scale.setScalar(radius);
    }
  }
}
