import * as THREE from 'three';
import { expect, it } from 'vitest';
import { moveSimulatedInstruments, resetSimulatedInstruments, simulatedReadout } from './simulatedInstruments';

it('moves each instrument with its keys, faster with Shift, and keeps it in the practice area', () => {
  const driver = new THREE.Object3D(), forceps = new THREE.Object3D(), scissors = new THREE.Object3D();
  moveSimulatedInstruments(new Set(['arrowright', 'w', 'shift']), 0.5, { driver, forceps, scissors });
  expect(driver.position.toArray()).toEqual([1, 0, 0]);
  expect(forceps.position.toArray()).toEqual([0, 0, -1]);
  expect(scissors.position.toArray()).toEqual([0, 0, 0]);
  moveSimulatedInstruments(new Set(['arrowright', 'k']), 5, { driver, forceps, scissors });
  expect(driver.position.x).toBe(2);
  expect(scissors.position.z).toBe(2);
  expect(simulatedReadout(driver.position)).toBe('Simulated · (2.00, 0.00)');
});

it('resets the instruments to their start', () => {
  const driver = new THREE.Object3D(), forceps = new THREE.Object3D(), scissors = new THREE.Object3D();
  driver.position.set(5, 5, 5);
  driver.rotation.set(1, 0, 0);
  resetSimulatedInstruments({ driver, forceps, scissors });
  expect(driver.position.toArray()).toEqual([0, 0.25, -0.65]);
  expect(scissors.position.toArray()).toEqual([0, 0.25, 1.05]);
  expect(driver.quaternion.toArray()).toEqual([0, 0, 0, 1]);
});
