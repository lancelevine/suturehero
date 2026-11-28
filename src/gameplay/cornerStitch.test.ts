import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { describeCornerPass, FLAP_TIP, gradeCornerPass, onFlap } from './cornerStitch';

const dermis = { top: 0.38, bottom: 0.2 };

describe('corner stitch', () => {
  it('knows the flap', () => {
    expect(onFlap({ x: 0.5, z: 0 })).toBe(true);
    expect(onFlap({ x: 0.5, z: 0.4 })).toBe(false);
    expect(onFlap({ x: -0.2, z: 0 })).toBe(false);
  });

  it('accepts a horizontal pass through the tip from the far side only', () => {
    // Horizontal circle in the dermis (y = 0.33), centred on the far side, through the tip.
    const centre = new THREE.Vector3(-0.1, 0.33, 0);
    const tract = { centre, axis: new THREE.Vector3(0, 1, 0), start: new THREE.Vector3(0, 0, 0.16), exitAngle: Math.PI };
    const grade = gradeCornerPass(tract, { x: -0.1, y: 0.41, z: 0.16 }, { x: -0.1, y: 0.41, z: -0.16 }, 0.41, dermis);
    expect(grade.throughTip).toBe(true);
    expect(grade.farSideOnly).toBe(true);
    expect(describeCornerPass(grade)).toContain('good');
  });

  it('flags a simple stitch that punctures the flap', () => {
    const tract = { centre: new THREE.Vector3(0, 0.41, FLAP_TIP.z), axis: new THREE.Vector3(0, 0, -1), start: new THREE.Vector3(0.3, 0, 0), exitAngle: Math.PI };
    const grade = gradeCornerPass(tract, { x: 0.3, y: 0.41, z: 0 }, { x: -0.3, y: 0.41, z: 0 }, 0.41, dermis);
    expect(grade.flapPunctured).toBe(true);
    expect(describeCornerPass(grade)).toContain('do not puncture the flap');
  });
});
