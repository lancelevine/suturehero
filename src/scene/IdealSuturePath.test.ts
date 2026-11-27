import * as THREE from 'three';
import { expect, it } from 'vitest';
import { IdealSuturePath, PATH_HALF_LENGTH } from './IdealSuturePath';

it('lays dashes and chevrons flat on the skin along the wound', () => {
  const path = new IdealSuturePath(0.42);
  // Two merged meshes (glow, core): two draw calls however many dashes and chevrons.
  expect(path.root.children.map((c) => c.name)).toEqual(['ideal-path-glow', 'ideal-path-core']);
  const box = new THREE.Box3().setFromObject(path.root);
  expect(box.min.y).toBeGreaterThan(0.42);
  expect(box.max.y - box.min.y).toBeLessThan(0.01);
  expect(box.max.z).toBeLessThanOrEqual(PATH_HALF_LENGTH + 1e-6);
  path.update(false, 0.3);
  expect([path.root.visible, path.root.position.z]).toEqual([false, -0.3]);
});
