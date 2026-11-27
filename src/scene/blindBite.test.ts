import * as THREE from 'three';
import { expect, it } from 'vitest';
import { BlindBiteCheck, exitHidden } from './blindBite';

const camera = new THREE.PerspectiveCamera();
camera.position.set(0, 5, 0);
camera.updateMatrixWorld();
const blocker = new THREE.Mesh(new THREE.BoxGeometry(1, 0.2, 1));
blocker.position.set(0, 2, 0);
blocker.updateMatrixWorld();

it('finds an instrument between the camera and the exit', () => {
  expect(exitHidden(camera, new THREE.Vector3(0, 0, 0), [blocker])).toBe(true);
  expect(exitHidden(camera, new THREE.Vector3(3, 0, 0), [blocker])).toBe(false);
});

it('checks each new exit once', () => {
  const check = new BlindBiteCheck();
  check.update([new THREE.Vector3(0, 0, 0)], camera, [blocker]);
  check.update([new THREE.Vector3(0, 0, 0), new THREE.Vector3(3, 0, 0)], camera, [blocker]);
  expect([check.exits, check.hidden]).toEqual([2, 1]);
});
