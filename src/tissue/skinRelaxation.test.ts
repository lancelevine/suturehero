import { describe, expect, it } from 'vitest';
import { RELAXED_FLOOR, relaxation, StitchAges } from './skinRelaxation';

describe('skin relaxation', () => {
  it('starts at full tension and relaxes toward the floor', () => {
    expect(relaxation(0)).toBe(1);
    expect(relaxation(60)).toBeLessThan(0.85);
    expect(relaxation(1e6)).toBeCloseTo(RELAXED_FLOOR, 6);
  });
  it('ages each stitch from when it first appears', () => {
    const ages = new StitchAges();
    expect(ages.factors([0.1], 0)).toEqual([1]);
    const [old, fresh] = ages.factors([0.1, 0.4], 120);
    expect(old).toBeLessThan(0.8);
    expect(fresh).toBe(1);
    expect(ages.factors([0.4], 130)[0]).toBeLessThan(1);
  });
});
