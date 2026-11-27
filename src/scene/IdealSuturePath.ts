import * as THREE from 'three';

/**
 * The ideal suture line (2026-11-27, mockup): a dashed cyan line along the wound on the skin
 * surface, with chevrons pointing along it, showing where the row of stitches should go. Built
 * from flat ribbons (WebGL lines are one pixel wide), unlit and not tone-mapped so it glows on
 * the skin. Visual guide only.
 */
export const PATH_COLOR = 0x3fd8ff;
/** Half the length of the drawn line along the wound (scene units). */
export const PATH_HALF_LENGTH = 1.45;
/** Spacing between chevrons (scene units). */
export const CHEVRON_SPACING = 0.5;
const DASH = 0.08;
const GAP = 0.055;
const WIDTH = 0.026;
const GLOW_WIDTH = 0.08;
/** Lift above the skin so the line is not hidden in it (scene units). */
const SURFACE_LIFT = 0.014;
const CHEVRON_ARM = 0.11;

function ribbon(from: THREE.Vector3, to: THREE.Vector3, width: number, material: THREE.Material) {
  const length = from.distanceTo(to);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, length), material);
  mesh.position.copy(from).add(to).multiplyScalar(0.5);
  // Lie flat (plane faces +Y), then turn the plane's long axis (local Y → world Z) toward `to`.
  mesh.rotation.order = 'YXZ';
  mesh.rotation.x = -Math.PI / 2;
  mesh.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
  mesh.renderOrder = 2;
  return mesh;
}

export class IdealSuturePath {
  readonly root = new THREE.Group();

  constructor(surfaceY: number) {
    this.root.name = 'ideal-suture-path';
    const y = surfaceY + SURFACE_LIFT;
    const core = new THREE.MeshBasicMaterial({ color: PATH_COLOR, transparent: true, opacity: 0.95, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
    const glow = new THREE.MeshBasicMaterial({ color: PATH_COLOR, transparent: true, opacity: 0.18, depthWrite: false, toneMapped: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
    for (let z = -PATH_HALF_LENGTH; z + DASH <= PATH_HALF_LENGTH; z += DASH + GAP) {
      const from = new THREE.Vector3(0, y, z), to = new THREE.Vector3(0, y, z + DASH);
      this.root.add(ribbon(from, to, GLOW_WIDTH, glow), ribbon(from, to, WIDTH, core));
    }
    for (let z = -PATH_HALF_LENGTH + CHEVRON_SPACING / 2; z < PATH_HALF_LENGTH; z += CHEVRON_SPACING) {
      const tip = new THREE.Vector3(0, y + 0.001, z);
      for (const side of [-1, 1]) {
        const end = new THREE.Vector3(side * CHEVRON_ARM, y + 0.001, z - CHEVRON_ARM);
        this.root.add(ribbon(end, tip, GLOW_WIDTH, glow), ribbon(end, tip, WIDTH, core));
      }
    }
  }

  /** Follow the current stitch site along the pad (`siteZ`, as the session's course does). */
  update(visible: boolean, siteZ = 0) {
    this.root.visible = visible;
    this.root.position.z = -siteZ;
  }
}
