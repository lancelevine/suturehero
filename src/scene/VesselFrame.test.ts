import * as THREE from 'three';
import { expect, it } from 'vitest';
import { VesselFrame } from './VesselFrame';

it('turns its children about the vessel axis, keeping the axis in place', () => {
  const frame = new VesselFrame();
  const mark = new THREE.Object3D();
  frame.root.add(mark);
  frame.setAxisHeight(0.01);
  mark.position.set(0, 0.01 + 0.4 - 0.01, 0); // a point on top of a vessel of radius 0.4 centred at y = 0.01
  frame.root.updateMatrixWorld(true);
  const top = mark.getWorldPosition(new THREE.Vector3());
  expect(top.y).toBeCloseTo(0.41);
  frame.turnBy(Math.PI);
  frame.root.updateMatrixWorld(true);
  expect(mark.getWorldPosition(new THREE.Vector3()).y).toBeCloseTo(0.01 - 0.4);
  frame.turnBy(Math.PI);
  expect(frame.angle).toBeCloseTo(0);
});
