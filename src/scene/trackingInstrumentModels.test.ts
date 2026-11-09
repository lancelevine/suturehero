import * as THREE from 'three';
import { expect, it } from 'vitest';
import { createTrackedInstrument, createTrackedScissors, setScissorsOpening } from './trackingInstrumentModels';

it('adds tracked instruments to the scene at the pad height', () => {
  const scene = new THREE.Scene();
  const driver = createTrackedInstrument(scene, 'right', 0xe3b47e);
  const scissors = createTrackedScissors(scene);
  expect(scene.children).toContain(driver.group);
  expect(scene.children).toContain(scissors);
  expect(driver.group.position.y).toBeCloseTo(0.25);
  expect(driver.group.children).toContain(driver.model.root);
});

it('opens the scissors blades symmetrically', () => {
  const scissors = createTrackedScissors(new THREE.Scene());
  const model = scissors.children[0] as THREE.Group;
  setScissorsOpening(scissors, 1);
  expect(model.children[1].rotation.y).toBeCloseTo(-0.33);
  expect(model.children[4].rotation.y).toBeCloseTo(0.33);
  setScissorsOpening(scissors, 0);
  expect(model.children[4].rotation.y).toBeCloseTo(0.03);
});
