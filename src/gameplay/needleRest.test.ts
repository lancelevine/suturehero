import * as THREE from 'three';
import { expect, it } from 'vitest';
import { REST_CLEARANCE, settleNeedle, surfaceBelow } from './needleRest';

const arc = Array.from({ length: 9 }, (_, i) => new THREE.Vector3(Math.cos((i / 8) * Math.PI) * 0.3, 0, Math.sin((i / 8) * Math.PI) * 0.3));

it('drops a released needle onto the pad and stops there, keeping its orientation', () => {
  const root = new THREE.Object3D();
  root.position.set(-0.3, 0.9, 0);
  root.rotation.set(0.2, 0.4, 0.1);
  const before = root.quaternion.clone();
  for (let i = 0; i < 100; i++) settleNeedle(root, arc, 1 / 60);
  root.updateWorldMatrix(true, false);
  const lowest = Math.min(...arc.map((p) => p.clone().applyMatrix4(root.matrixWorld).y));
  expect(lowest).toBeCloseTo(surfaceBelow(-0.3, 0) + REST_CLEARANCE, 6);
  expect(root.quaternion.angleTo(before)).toBe(0);
  expect(settleNeedle(root, arc, 1 / 60)).toBe(0);
});

it('rests on the base outside the pad, and never lifts a needle that is lower', () => {
  expect(surfaceBelow(2, 0)).toBeLessThan(surfaceBelow(0, 0));
  const root = new THREE.Object3D();
  root.position.set(0, 0.2, 0);
  expect(settleNeedle(root, arc, 1)).toBe(0);
  expect(root.position.y).toBe(0.2);
});
