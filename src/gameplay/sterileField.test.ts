import { describe, expect, it } from 'vitest';
import { SterileFieldCheck } from './sterileField';

describe('sterile field', () => {
  it('counts each touchdown outside the pad, per instrument', () => {
    const check = new SterileFieldCheck();
    check.update('left', { x: 0, y: 0.15, z: 0 }, 0.15);
    expect(check.touches).toBe(0);
    check.update('left', { x: 3, y: 0.16, z: 0 }, 0.15);
    check.update('left', { x: 3, y: 0.15, z: 0 }, 0.15);
    expect(check.touches).toBe(1);
    check.update('right', { x: 0, y: 0.15, z: 2 }, 0.15);
    check.update('left', { x: 3, y: 0.5, z: 0 }, 0.15);
    check.update('left', { x: 3, y: 0.15, z: 0 }, 0.15);
    expect(check.touches).toBe(3);
  });
});
