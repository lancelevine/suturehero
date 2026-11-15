import * as THREE from 'three';
import { expect, it } from 'vitest';
import { describeEntryAngle, describeFreePass } from './freePassFeedback';

const tract = { centre: new THREE.Vector3(), axis: new THREE.Vector3(0, 0, 1), start: new THREE.Vector3(-0.3, 0, 0), exitAngle: null };

it('describes a free pass in millimetres, from the wound edge', () => {
  expect(describeFreePass({ entry: new THREE.Vector3(-0.26, 0.41, 0), exit: new THREE.Vector3(0.25, 0.41, 0), entryEdge: 0.26, exitEdge: 0.25, entryAngleDeg: 82, depth: 0.15, deepestLayer: 'dermis', crossesWound: true, tract }))
    .toBe('entry 7.0 mm from the edge · exit 6.8 mm · 4.0 mm deep (dermis) · crosses the wound · entered at 82° (near perpendicular) · tip: evert the edge with the forceps before entering');
  expect(describeFreePass({ entry: new THREE.Vector3(0.1, 0.41, 0), exit: null, entryEdge: 0.1, exitEdge: null, entryAngleDeg: 45, depth: 0.02, deepestLayer: 'epidermis', crossesWound: false, tract }))
    .toBe('entry 2.7 mm from the edge · 0.5 mm deep (epidermis) · entered at 45° · aim nearer 90° (pronate the wrist to bring the tip down) · tip: evert the edge with the forceps before entering');
});

it('flags shallow entry angles', () => {
  expect(describeEntryAngle(75)).toMatch(/near perpendicular/);
  expect(describeEntryAngle(50)).toMatch(/aim nearer 90/);
});

it('credits an everted entry', () => {
  expect(describeFreePass({ entry: new THREE.Vector3(0.1, 0.45, 0), exit: null, entryEdge: 0.1, exitEdge: null, entryAngleDeg: 85, entryLift: 0.04, depth: 0.1, deepestLayer: 'dermis', crossesWound: false, tract }))
    .toMatch(/edge everted with the forceps \(good\)$/);
});
