import * as THREE from 'three';
import { expect, it } from 'vitest';
import { moveSimulatedInstruments, simulatedReadout } from './simulatedInstruments';

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
