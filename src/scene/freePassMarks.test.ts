import * as THREE from 'three';
import { expect, it, vi } from 'vitest';
import type { FreePassRecord } from '../tissue/FreeNeedlePass';
import { FreePassMarks } from './freePassMarks';

const pass = (entryX: number, exit: boolean, torn = false) =>
  ({ entry: new THREE.Vector3(entryX, 0.4, 0), exit: exit ? new THREE.Vector3(entryX + 0.3, 0.4, 0) : null, torn }) as unknown as FreePassRecord;

it('marks entry and exit points and rebuilds only when the passes change', () => {
  const marks = new FreePassMarks();
  marks.update([pass(0, true), pass(1, false)]);
  expect(marks.root.children).toHaveLength(3);
  const first = marks.root.children[0];
  marks.update([pass(0, true), pass(1, false)]);
  expect(marks.root.children[0]).toBe(first);
  marks.update([pass(0, true, true)]);
  expect(((marks.root.children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial).color.getHex()).toBe(0xe2463c);
});

it('draws skin tears and frees the old tear geometry when rebuilding', () => {
  const marks = new FreePassMarks();
  marks.update([], [{ from: new THREE.Vector3(0, 0.4, 0), to: new THREE.Vector3(0.2, 0.4, 0) }]);
  const rent = marks.root.getObjectByName('skin-rent') as THREE.Mesh;
  expect(rent).toBeDefined();
  const dispose = vi.spyOn(rent.geometry, 'dispose');
  marks.update([pass(0, true)], []);
  expect(dispose).toHaveBeenCalled();
  expect(marks.root.getObjectByName('skin-rent')).toBeUndefined();
});
