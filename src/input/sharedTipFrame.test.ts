import { Euler, Quaternion, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { alignShaft } from './sharedTipFrame';
import { trackedInstrumentRotation } from './trackingFrame';

it('turns the model shaft to point from the tip toward the ring', () => {
  const start = new Quaternion().setFromEuler(new Euler(0.4, -0.7, 0.2));
  const direction = new Vector3(0.3, 0.8, -0.5).normalize();
  const aligned = alignShaft(start, direction);
  const shaft = new Vector3(0, 0, 1).applyQuaternion(trackedInstrumentRotation(aligned));
  expect(shaft.angleTo(direction)).toBeLessThan(1e-6);
  expect(alignShaft(start, new Vector3()).angleTo(start)).toBeLessThan(1e-9);
});
