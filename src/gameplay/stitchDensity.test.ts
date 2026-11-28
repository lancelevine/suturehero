import { describe, expect, it } from 'vitest';
import { describeStitchDensity, gradeStitchDensity, pullAt, suggestedSpacingMm } from './stitchDensity';

describe('stitch density by tension', () => {
  it('pulls hardest mid-wound and on tighter sites, suggesting closer stitches there', () => {
    expect(pullAt(0, 1)).toBeGreaterThan(pullAt(1, 1));
    expect(suggestedSpacingMm(0, 1.4)).toBeLessThan(suggestedSpacingMm(0, 1));
    expect(suggestedSpacingMm(1.1, 1)).toBeCloseTo(7, 6);
  });

  it('grades gaps against the suggested spacing', () => {
    // 10 mm per unit: gaps of 0.5 units = 5 mm mid-wound (suggested ~4.7 mm): matched.
    expect(gradeStitchDensity([-0.25, 0.25], 1, 10)[0].matched).toBe(true);
    expect(gradeStitchDensity([-0.6, 0.6], 1, 10)[0].tooWide).toBe(true);
    expect(describeStitchDensity([0], 1, 10)).toBe('');
    expect(describeStitchDensity([-0.6, 0.6], 1, 10)).toContain('too wide');
  });
});
