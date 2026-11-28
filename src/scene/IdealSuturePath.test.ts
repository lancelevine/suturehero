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

it('fades with consistent near-perpendicular, square passes', async () => {
  const { guideConsistency } = await import('./IdealSuturePath');
  expect(guideConsistency([])).toBe(0);
  const good = { entryAngleDeg: 88, squareOffDeg: 3 };
  expect(guideConsistency([good, good, { entryAngleDeg: 60, squareOffDeg: 3 }, good, good])).toBeCloseTo(0.8);
  const path = new IdealSuturePath(0.42);
  path.setConsistency(1);
  const core = path.root.children[1] as THREE.Mesh;
  expect((core.material as THREE.Material).opacity).toBeCloseTo(0.95 * 0.2);
});
