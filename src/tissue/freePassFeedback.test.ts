import * as THREE from 'three';
import { expect, it } from 'vitest';
import { describeFreePass } from './freePassFeedback';

const tract = { centre: new THREE.Vector3(), axis: new THREE.Vector3(0, 0, 1), start: new THREE.Vector3(-0.3, 0, 0), exitAngle: null };

it('describes a free pass in millimetres', () => {
  expect(describeFreePass({ entry: new THREE.Vector3(-0.26, 0.41, 0), exit: new THREE.Vector3(0.25, 0.41, 0), depth: 0.15, deepestLayer: 'dermis', crossesWound: true, tract }))
    .toBe('entry 7.0 mm from the edge · exit 6.8 mm · 4.0 mm deep (dermis) · crosses the wound');
  expect(describeFreePass({ entry: new THREE.Vector3(0.1, 0.41, 0), exit: null, depth: 0.02, deepestLayer: 'epidermis', crossesWound: false, tract }))
    .toBe('entry 2.7 mm from the edge · 0.5 mm deep (epidermis)');
});
