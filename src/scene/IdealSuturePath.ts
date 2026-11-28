import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * The ideal suture line (2026-11-27, mockup): a dashed cyan line along the wound on the skin
 * surface, with chevrons pointing along it, showing where the row of stitches should go. Built
 * from flat ribbons (WebGL lines are one pixel wide), unlit and not tone-mapped so it glows on
 * the skin. Visual guide only. All ribbons are merged into one mesh per material (two draw calls);
 * chevrons have no additive glow, since overlapping glow at their tips blew out to white.
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

/** A flat ribbon from `from` to `to` on the skin, as geometry in the path's frame. */
function ribbon(from: THREE.Vector3, to: THREE.Vector3, width: number) {
  const geometry = new THREE.PlaneGeometry(width, from.distanceTo(to));
  // Lie flat (plane faces +Y), then turn the plane's long axis (local Y → world Z) toward `to`.
  const placement = new THREE.Object3D();
  placement.position.copy(from).add(to).multiplyScalar(0.5);
  placement.rotation.order = 'YXZ';
  placement.rotation.x = -Math.PI / 2;
  placement.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
  placement.updateMatrix();
  return geometry.applyMatrix4(placement.matrix);
}

function mergedMesh(geometries: THREE.BufferGeometry[], material: THREE.Material, name: string) {
  const mesh = new THREE.Mesh(mergeGeometries(geometries), material);
  for (const geometry of geometries) geometry.dispose();
  mesh.name = name;
  mesh.renderOrder = 2;
  return mesh;
}

/**
 * Fading guide (roadmap "Needle arc guide", 2026-11-28): share (0–1) of the last few passes that
 * went in near 90° and square to the wound; the guide fades toward MIN_GUIDE_OPACITY as it rises.
 */
export function guideConsistency(passes: ReadonlyArray<{ entryAngleDeg: number; squareOffDeg: number }>, window = 5) {
  const recent = passes.slice(-window);
  if (!recent.length) return 0;
  return recent.filter((p) => Math.abs(p.entryAngleDeg - 90) <= 10 && p.squareOffDeg <= 10).length / window;
}
const MIN_GUIDE_OPACITY = 0.2;

export class IdealSuturePath {
  readonly root = new THREE.Group();
  private readonly baseOpacity = new Map<THREE.Material, number>();

  constructor(surfaceY: number) {
    this.root.name = 'ideal-suture-path';
    const y = surfaceY + SURFACE_LIFT;
    const core = new THREE.MeshBasicMaterial({ color: PATH_COLOR, transparent: true, opacity: 0.95, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
    const glow = new THREE.MeshBasicMaterial({ color: PATH_COLOR, transparent: true, opacity: 0.18, depthWrite: false, toneMapped: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending });
    const coreParts: THREE.BufferGeometry[] = [];
    const glowParts: THREE.BufferGeometry[] = [];
    for (let z = -PATH_HALF_LENGTH; z + DASH <= PATH_HALF_LENGTH; z += DASH + GAP) {
      const from = new THREE.Vector3(0, y, z), to = new THREE.Vector3(0, y, z + DASH);
      glowParts.push(ribbon(from, to, GLOW_WIDTH));
      coreParts.push(ribbon(from, to, WIDTH));
    }
    for (let z = -PATH_HALF_LENGTH + CHEVRON_SPACING / 2; z < PATH_HALF_LENGTH; z += CHEVRON_SPACING) {
      const tip = new THREE.Vector3(0, y + 0.001, z);
      for (const side of [-1, 1]) {
        const end = new THREE.Vector3(side * CHEVRON_ARM, y + 0.001, z - CHEVRON_ARM);
        coreParts.push(ribbon(end, tip, WIDTH));
      }
    }
    this.root.add(mergedMesh(glowParts, glow, 'ideal-path-glow'), mergedMesh(coreParts, core, 'ideal-path-core'));
    this.baseOpacity.set(core, core.opacity).set(glow, glow.opacity);
  }

  /** Follow the current stitch site along the pad (`siteZ`, as the session's course does). */
  /** Fade with the trainee's consistency (0 = full guide, 1 = faint). */
  setConsistency(consistency: number) {
    const scale = 1 - (1 - MIN_GUIDE_OPACITY) * Math.min(1, Math.max(0, consistency));
    for (const [material, base] of this.baseOpacity) material.opacity = base * scale;
  }

  update(visible: boolean, siteZ = 0) {
    this.root.visible = visible;
    this.root.position.z = -siteZ;
  }
}
