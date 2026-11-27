import * as THREE from 'three';
import { expect, it } from 'vitest';
import { RotationStageReadout } from './rotationStageReadout';

it('reports each stage relative to its first sample', () => {
  const readout = new RotationStageReadout();
  const mesh = new THREE.Object3D();
  expect(readout.text([['forceps', mesh]], () => undefined)).toBe('Relative XYZ Euler (pitch/yaw axes depend on model frame)');
  readout.raw.set('forceps', new THREE.Quaternion());
  readout.status.set('forceps', 'accepted');
  readout.text([['forceps', mesh]], () => undefined);
  readout.raw.set('forceps', new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI / 6)));
  expect(readout.text([['forceps', mesh]], () => undefined).split('\n')).toEqual([
    'Relative XYZ Euler (pitch/yaw axes depend on model frame)',
    'forceps · accepted',
    ' raw         0 /    0 /   30',
    ' accepted —',
    ' rendered    0 /    0 /    0',
  ]);
});
