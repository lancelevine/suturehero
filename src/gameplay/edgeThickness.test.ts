import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { describeThicknessPass, predictedStepOff, sideDepths, THIN_SIDE_DROP } from './edgeThickness';

describe('edges of different thickness', () => {
  it('measures each side of a symmetric pass and predicts the step-off', () => {
    // A half circle centred on the wound, radius 0.2, from x = +0.2 down to x = -0.2.
    const tract = { centre: new THREE.Vector3(0, 0.41, 0), axis: new THREE.Vector3(0, 0, -1), start: new THREE.Vector3(0.2, 0, 0), exitAngle: Math.PI };
    const flat = sideDepths(tract, () => 0.41);
    expect(flat.thin).toBeCloseTo(0.2, 2);
    expect(flat.thick).toBeCloseTo(0.2, 2);
    expect(predictedStepOff(flat)).toBeCloseTo(THIN_SIDE_DROP, 2);
    expect(predictedStepOff({ thin: 0.24, thick: 0.2 })).toBeCloseTo(0, 9);
    expect(describeThicknessPass({ thin: 0.24, thick: 0.2 }, 25)).toContain('level');
    expect(describeThicknessPass({ thin: 0.2, thick: 0.2 }, 25)).toContain('deeper on the thin (left) side');
  });
});
