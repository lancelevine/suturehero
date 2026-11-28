import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { holeStrength, holesNear } from './punctureHoles';

describe('needle holes that last', () => {
  it('counts nearby holes (not the stitch\'s own) and weakens the tissue with a floor', () => {
    const entry = new THREE.Vector3(0.2, 0.4, 0), exit = new THREE.Vector3(-0.2, 0.4, 0);
    const holes = [entry.clone(), exit.clone(), new THREE.Vector3(0.25, 0.4, 0.03), new THREE.Vector3(-0.2, 0.4, 0.5)];
    expect(holesNear([entry, exit], holes)).toBe(1);
    expect(holeStrength(0)).toBe(1);
    expect(holeStrength(1)).toBeCloseTo(0.92, 6);
    expect(holeStrength(20)).toBe(0.7);
  });
});
