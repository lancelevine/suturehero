import { describe, expect, it } from 'vitest';
import { describeWraps, WrapPlacementCheck } from './wrapPlacement';

describe('wrap placement', () => {
  it('counts wraps, flags far wraps and slips', () => {
    const check = new WrapPlacementCheck();
    check.update(0.5, 10);
    check.update(1.05, 10);
    check.update(-2.1, 40);
    expect([check.wraps, check.farWraps]).toEqual([2, 1]);
    check.update(0.3, 10);
    expect(check.slips).toBe(1);
    expect(describeWraps(check)).toContain('slipped off');
    check.update(1.2, 10);
    check.update(0.1, 10, true);
    expect(check.slips).toBe(1);
    check.reset();
    expect(describeWraps(check)).toBe('');
  });
});
