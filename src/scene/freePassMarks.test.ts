import * as THREE from 'three';
import { expect, it, vi } from 'vitest';
import type { FreePassRecord } from '../tissue/FreeNeedlePass';
import { FreePassMarks } from './freePassMarks';

const pass = (entryX: number, exit: boolean, torn = false, entryEdge = 0.15, exitEdge = 0.15) =>
  ({ entry: new THREE.Vector3(entryX, 0.4, 0), exit: exit ? new THREE.Vector3(entryX + 0.3, 0.4, 0) : null, torn, entryEdge, exitEdge: exit ? exitEdge : null }) as unknown as FreePassRecord;

it('marks entry and exit points and rebuilds only when the passes change', () => {
  const marks = new FreePassMarks();
  marks.update([pass(0, true), pass(1, false)]);
  // Entry + exit marks (each with a blood bead), the stitch line and bite ruler for the completed pass, and the in-progress entry.
  expect(marks.root.children).toHaveLength(8);
  expect(marks.root.children.filter((c) => c.name === 'puncture-blood')).toHaveLength(3);
  const first = marks.root.children[0];
  marks.update([pass(0, true), pass(1, false)]);
  expect(marks.root.children[0]).toBe(first);
  marks.update([pass(0, true, true)]);
  const entryMark = marks.root.children.find((c) => c.name !== 'puncture-blood') as THREE.Mesh;
  expect((entryMark.material as THREE.MeshBasicMaterial).color.getHex()).toBe(0xe2463c);
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

it('draws each completed stitch across the wound, amber when it is off square', () => {
  const marks = new FreePassMarks();
  const slanted = { ...pass(0, true), exit: new THREE.Vector3(0.3, 0.4, 0.2) } as FreePassRecord;
  marks.update([pass(0, true), slanted]);
  expect(marks.root.children.map((c) => c.name).filter((n) => n.startsWith('stitch-line'))).toEqual(['stitch-line-square', 'stitch-line-slanted']);
});

it('rings bites far from the median bite', () => {
  const marks = new FreePassMarks();
  marks.update([pass(0, true), pass(1, true), pass(2, true, false, 0.15, 0.4)]);
  expect(marks.root.children.filter((c) => c.name === 'bite-outlier')).toHaveLength(1);
});

it('draws a bite ruler with a tick per millimetre out from the wound centre', () => {
  const marks = new FreePassMarks();
  // Entry at x = -0.15 and exit at x = 0.15: about 4 mm each side at 27 mm per unit.
  marks.update([{ ...pass(-0.15, true), exit: new THREE.Vector3(0.15, 0.4, 0) } as FreePassRecord]);
  const ruler = marks.root.getObjectByName('bite-ruler') as THREE.Mesh;
  expect(ruler.geometry.getIndex()!.count / 6).toBe(8);
});
