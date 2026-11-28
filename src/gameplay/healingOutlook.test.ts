import { describe, expect, it } from 'vitest';
import { describeHealingOutlook, healingOutlook } from './healingOutlook';

describe('healing outlook', () => {
  it('describes a fine line for good closures and lists issues otherwise', () => {
    expect(healingOutlook({ reviews: [], spacingMm: [] })).toBeNull();
    expect(healingOutlook({ reviews: [['Edges meet', 'Edges everted (good)', 'Edges level']], spacingMm: [] })?.outlook).toBe('a fine, flat line');
    const rough = healingOutlook({ reviews: [['Small gap between the edges', 'Edges inverted · x', 'Left edge higher · y']], spacingMm: [4, 8] })!;
    expect(rough.outlook).toBe('a more visible scar');
    expect(rough.issues).toHaveLength(4);
    expect(describeHealingOutlook({ reviews: [['Edges meet']], spacingMm: [] })).toContain('not clinical');
  });
});
