import { describe, expect, it } from 'vitest';
import { describeStrayTouches, StrayTouchCheck } from './strayTouches';

const vessel = { centerY: 0, innerRadius: 0.3, outerRadius: 0.4, length: 2 };

describe('stray needle touches', () => {
  it('counts one touch per contact outside a bite', () => {
    const check = new StrayTouchCheck();
    check.update({ x: 0, y: 1, z: 0 }, false, vessel, 0.1);
    for (let i = 0; i < 8; i++) check.update({ x: 0, y: 0.35, z: 0 }, false, vessel, 0.1);
    expect(check.touches).toBe(1);
    // A contact followed by a bite starting is the bite itself, not a stray touch.
    check.update({ x: 0, y: 1, z: 0 }, false, vessel, 0.1);
    check.update({ x: 0, y: 0.35, z: 0 }, false, vessel, 0.1);
    check.update({ x: 0, y: 0.34, z: 0 }, true, vessel, 0.1);
    for (let i = 0; i < 8; i++) check.update({ x: 0, y: 1, z: 0 }, false, vessel, 0.1);
    expect(check.touches).toBe(1);
    for (let i = 0; i < 8; i++) check.update({ x: 5, y: 0.35, z: 0 }, false, vessel, 0.1);
    expect(check.touches).toBe(1);
    expect(describeStrayTouches(check)).toContain('1 stray needle touch on');
  });
});
