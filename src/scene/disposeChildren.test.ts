import * as THREE from 'three';
import { expect, it, vi } from 'vitest';
import { disposeChildren } from './disposeChildren';

it('frees child geometry and unshared materials, then empties the group', () => {
  const group = new THREE.Group();
  const shared = new THREE.MeshBasicMaterial();
  const own = new THREE.LineBasicMaterial();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), shared);
  const line = new THREE.Line(new THREE.BufferGeometry(), own);
  group.add(mesh, line);
  const spies = [vi.spyOn(mesh.geometry, 'dispose'), vi.spyOn(line.geometry, 'dispose'), vi.spyOn(own, 'dispose'), vi.spyOn(shared, 'dispose')];
  disposeChildren(group, new Set([shared]));
  expect(spies.map((spy) => spy.mock.calls.length)).toEqual([1, 1, 1, 0]);
  expect(group.children).toHaveLength(0);
});
