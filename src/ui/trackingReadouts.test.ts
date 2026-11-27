import * as THREE from 'three';
import { expect, it } from 'vitest';
import { poseReadoutText, traceQuad } from './trackingReadouts';

const target = (lastSeen: number) => ({ lastSeen, pose: { id: 7, position: new THREE.Vector3(1.234, -2, 300.06), quaternion: new THREE.Quaternion(), reprojectionError: 0.84 } });

it('describes a fresh pose, a recently lost one, and none', () => {
  expect(poseReadoutText(target(1000), 1050, 500)).toBe('ID 7 · X 1.2, Y -2.0, Z 300.1 mm · RPY 0°/0°/0° · error 0.8 px (uncalibrated)');
  expect(poseReadoutText(target(1000), 1200, 500)).toMatch(/^Last seen · ID 7/);
  expect(poseReadoutText(target(1000), 1600, 500)).toBe('Not visible');
  expect(poseReadoutText(undefined, 0, 500)).toBe('Not visible');
});

it('traces a closed quad through four corners', () => {
  const calls: string[] = [];
  const context = { beginPath: () => calls.push('begin'), moveTo: (x: number, y: number) => calls.push(`m${x},${y}`), lineTo: (x: number, y: number) => calls.push(`l${x},${y}`), closePath: () => calls.push('close') };
  traceQuad(context, [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }]);
  expect(calls).toEqual(['begin', 'm0,0', 'l1,0', 'l1,1', 'l0,1', 'close']);
});
