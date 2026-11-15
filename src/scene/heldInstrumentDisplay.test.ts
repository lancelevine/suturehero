import * as THREE from 'three';
import { expect, it } from 'vitest';
import { GLIDE_TAU_S, HeldInstrumentDisplay } from './heldInstrumentDisplay';

it('draws the holder on the needle for one frame and restores its real pose before the next step', () => {
  const display = new HeldInstrumentDisplay();
  const tool = new THREE.Object3D();
  tool.position.set(1, 2, 3);
  tool.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.5);
  const real = { p: tool.position.clone(), q: tool.quaternion.clone() };
  display.lockToNeedle(tool, () => { tool.position.set(0, 0, 0); tool.quaternion.identity(); });
  expect(tool.position.length()).toBe(0);
  display.restore();
  expect(tool.position.distanceTo(real.p)).toBe(0);
  expect(tool.quaternion.angleTo(real.q)).toBeLessThan(1e-6);
  display.restore();
  expect(tool.position.distanceTo(real.p)).toBe(0);
});

it('glides the drawn tool from the needle back to the hand, without changing its real pose', () => {
  const display = new HeldInstrumentDisplay();
  const tool = new THREE.Object3D();
  tool.position.set(1, 0, 0);
  display.lockToNeedle(tool, () => tool.position.set(0, 0, 0));
  display.restore();
  // Needle out: the hand is at x = 1, the drawn tool was at 0.
  display.glideBack(GLIDE_TAU_S);
  expect(tool.position.x).toBeGreaterThan(0.5);
  expect(tool.position.x).toBeLessThan(0.75);
  display.restore();
  expect(tool.position.x).toBe(1);
  for (let i = 0; i < 30; i++) { display.glideBack(1 / 60); display.restore(); }
  display.glideBack(1 / 60);
  expect(tool.position.x).toBe(1);
});
