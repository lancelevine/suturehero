import * as THREE from 'three';
import { expect, it } from 'vitest';
import { gripFractionFromTip, RegraspCheck } from './gripPosition';

const points = Array.from({ length: 11 }, (_, i) => new THREE.Vector3(i / 10, 0, 0));

it('measures the grip from the tip (last point) to the eye', () => {
  expect(gripFractionFromTip(points, new THREE.Vector3(1, 0, 0))).toBe(0);
  expect(gripFractionFromTip(points, new THREE.Vector3(0, 0.01, 0))).toBe(1);
  expect(gripFractionFromTip(points, new THREE.Vector3(0.5, 0, 0))).toBeCloseTo(0.5);
});

it('counts in-tissue regrasps on the tip once per grip', () => {
  const check = new RegraspCheck();
  const tip = new THREE.Vector3(0.98, 0, 0);
  const body = new THREE.Vector3(0.6, 0, 0);
  check.update(points, tip, false);
  check.update(points, body, true);
  check.update(points, body, true);
  check.update(points, tip, true);
  expect([check.regrasps, check.tipGrabs]).toEqual([2, 1]);
});
