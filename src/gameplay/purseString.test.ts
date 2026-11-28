import { describe, expect, it } from 'vitest';
import { describePurseString, gradePurseString, RING_CENTRE, RING_RADIUS } from './purseString';

const at = (deg: number) => ({ x: RING_CENTRE.x + RING_RADIUS * Math.cos((deg * Math.PI) / 180), z: RING_CENTRE.z + RING_RADIUS * Math.sin((deg * Math.PI) / 180) });

describe('purse-string', () => {
  it('grades coverage, direction and spacing around the ring', () => {
    expect(gradePurseString([{ entry: { x: 0, z: 0 }, exit: { x: 0.1, z: 0 } }])).toBeNull();
    const around = Array.from({ length: 6 }, (_, i) => ({ entry: at(i * 60), exit: at(i * 60 + 30) }));
    const full = gradePurseString(around)!;
    expect(full.coverageDeg).toBeGreaterThanOrEqual(300);
    expect(full.reversals).toBe(0);
    expect(full.even).toBe(true);
    expect(describePurseString(full)).toContain('ring closed');
    const half = gradePurseString(around.slice(0, 3))!;
    expect(describePurseString(half)).toContain('keep going round');
  });
});
