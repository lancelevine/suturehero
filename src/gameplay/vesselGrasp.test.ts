import { describe, expect, it } from 'vitest';
import { classifyVesselGrasp, describeVesselGrasp, VesselGraspCheck } from './vesselGrasp';

const vessel = { centerY: 1, innerRadius: 0.3, outerRadius: 0.4 };

describe('vessel grasp check', () => {
  it('classifies by where the jaw sits relative to the wall', () => {
    expect(classifyVesselGrasp({ y: 1.1, z: 0 }, vessel)).toBe('counterpressure');
    expect(classifyVesselGrasp({ y: 1.35, z: 0 }, vessel)).toBe('full-wall');
    expect(classifyVesselGrasp({ y: 1, z: 0.44 }, vessel)).toBe('adventitia');
    expect(classifyVesselGrasp({ y: 2, z: 0 }, vessel)).toBe('miss');
  });

  it('counts one grab per close and flags wall pinches', () => {
    const check = new VesselGraspCheck();
    const wall = { y: 1.35, z: 0 };
    check.update(wall, 0.6, vessel);
    expect(check.update(wall, 0.1, vessel)).toBe('full-wall');
    expect(check.update(wall, 0.1, vessel)).toBeNull();
    check.update({ y: 1.44, z: 0 }, 0.6, vessel);
    check.update({ y: 1.44, z: 0 }, 0.1, vessel);
    expect([check.grabs, check.pinches]).toEqual([2, 1]);
    expect(describeVesselGrasp(check)).toContain('1/2');
    check.update({ y: 3, z: 0 }, 0.6, vessel);
    check.update({ y: 3, z: 0 }, 0.1, vessel);
    expect(check.grabs).toBe(2);
  });
});
