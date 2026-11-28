import { describe, expect, it } from 'vitest';
import { DEFAULT_TARGETS } from './sandboxSummary';
import { siteTunedTargets } from './siteTargets';

describe('site-tuned targets', () => {
  it('scales default bite targets by site and keeps custom ones', () => {
    expect(siteTunedTargets(DEFAULT_TARGETS, 'face')).toMatchObject({ biteMinMm: 2.5, biteMaxMm: 5 });
    expect(siteTunedTargets(DEFAULT_TARGETS, 'back')).toMatchObject({ biteMinMm: 5.5, biteMaxMm: 11 });
    expect(siteTunedTargets(DEFAULT_TARGETS, undefined)).toBe(DEFAULT_TARGETS);
    const custom = { ...DEFAULT_TARGETS, biteMinMm: 3 };
    expect(siteTunedTargets(custom, 'face')).toBe(custom);
  });
});
