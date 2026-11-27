import * as THREE from 'three';
import { expect, it } from 'vitest';
import { decodeDiagnosticsText, faceOverlapText, filterDiagnosticsText, poseReadoutText, traceQuad } from './trackingReadouts';

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

it('describes the depth filter per instrument', () => {
  const measurements = new Map([['forceps', { rawZ: 301.4, filteredZ: 1.234, angle: 2.25, locked: false, valid: true, source: 'markers' }]]);
  expect(filterDiagnosticsText(measurements)).toBe('needleDriver: waiting | forceps: distance 301 mm · virtual Z 1.23 · Δ rotation 2.3° · tracking · depth from markers | scissors: waiting');
});

it('reports visible faces and overlaps per instrument', () => {
  const text = faceOverlapText({ needleDriver: [0, 1, 2], forceps: [10, 11] }, [1, 2, 10], { faceCount: 8, sideStepRadians: Math.PI / 4 });
  expect(text).toBe('needleDriver: OVERLAP 1+2 · 2/8 visible · 45° side spacing | forceps: face 10 · 1/8 visible · 45° side spacing');
});

it('fills the decoder diagnostics rows', () => {
  const rows = decodeDiagnosticsText({ frames: 12, matched: 2, outlines: 5, cropped: true, regionW: 320, regionH: 240, regionKind: 'predicted', decoder: { candidateCount: null, rawMarkerCount: 3, durationMs: 7.6, pass: 'adaptive', contrast: 'good', note: 'ok' }, flowNote: 'flow ok' });
  expect(rows).toEqual({ frames: '12', candidates: 'Unavailable', outlines: '5', decoded: '2 matched · 3 total', time: '8 ms · ROI 320×240', pass: 'predicted · adaptive', contrast: 'good', note: 'ok · flow ok' });
});
