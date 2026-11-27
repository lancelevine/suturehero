import * as THREE from 'three';

/**
 * Remove every child of `group` and free the GPU geometry of each mesh/line under it
 * (2026-11-27; `group.clear()` alone leaks them). Materials are freed too unless listed in
 * `keepMaterials`, and geometry unless listed in `keepGeometries` (shared ones the owner reuses).
 */
export function disposeChildren(group: THREE.Object3D, keepMaterials: ReadonlySet<THREE.Material> = new Set(), keepGeometries: ReadonlySet<THREE.BufferGeometry> = new Set()) {
  group.traverse((object) => {
    if (object === group || !(object instanceof THREE.Mesh || object instanceof THREE.Line)) return;
    if (!keepGeometries.has(object.geometry)) object.geometry.dispose();
    const materials: THREE.Material[] = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) if (!keepMaterials.has(material)) material.dispose();
  });
  group.clear();
}
