import * as THREE from 'three';
import { expect, it } from 'vitest';
import { JAW_POINT_MM } from '../suture/NeedleGrasp';
import { TipMarkers } from './tipMarkers';

it('places a dot at the tip and at the grasp point up the shaft, only with measured tips', () => {
  const tool = new THREE.Group();
  tool.position.set(1, 2, 3);
  tool.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
  const markers = new TipMarkers([{ root: tool, color: 0xff0000 }]);
  markers.update(null);
  expect(markers.root.visible).toBe(false);
  markers.update(0.02);
  expect(markers.root.visible).toBe(true);
  const [tip, jaw] = markers.root.children;
  expect(tip.position.distanceTo(tool.position)).toBeLessThan(1e-9);
  const shaft = new THREE.Vector3(0, 0, 1).applyQuaternion(tool.quaternion);
  expect(jaw.position.distanceTo(tool.position.clone().addScaledVector(shaft, JAW_POINT_MM * 0.02))).toBeLessThan(1e-9);
  markers.update(0.02, true, () => false);
  expect(tip.visible).toBe(false);
  markers.update(0.02, false);
  expect(markers.root.visible).toBe(false);
});
