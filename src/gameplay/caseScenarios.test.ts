import { describe, expect, it } from 'vitest';
import { BODY_SITES } from '../environments/bodySites';
import { caseById, caseUrl, CASE_SCENARIOS, describeCase, nextCase } from './caseScenarios';

describe('case scenarios', () => {
  it('uses real body sites and picks a different case each time', () => {
    for (const c of CASE_SCENARIOS) expect(BODY_SITES.some((s) => s.id === c.site)).toBe(true);
    expect(nextCase('kitchen-knife', () => 0).id).not.toBe('kitchen-knife');
    expect(caseById('scalp-bleed')?.site).toBe('scalp');
    expect(caseUrl(CASE_SCENARIOS[0], 'https://x/app/?environment=skin')).toContain('case=kitchen-knife');
    expect(describeCase(CASE_SCENARIOS[0], 9)).toContain('(4/4 stitches)');
  });
});
