import { describe, expect, it } from 'vitest';
import { breakingForce, NeedleBreakCheck } from './needleBreak';

describe('needle break', () => {
  it('breaks after sustained forcing in tissue, not from brief forcing', () => {
    const check = new NeedleBreakCheck();
    for (let i = 0; i < 10; i++) expect(check.update(true, i % 2 === 0, 0.2)).toBe(false);
    let broke = false;
    for (let i = 0; i < 12 && !broke; i++) broke = check.update(true, true, 0.2);
    expect(broke).toBe(true);
    expect(check.breaks).toBe(1);
    check.update(false, true, 5);
    expect(check.forcingSeconds).toBe(0);
  });

  it('counts only forcing well beyond normal handling', () => {
    const limits = { degrees: 35, units: 0.25 };
    expect(breakingForce({ degrees: 20, units: 0.1 }, limits)).toBe(false);
    expect(breakingForce({ degrees: 31, units: 0.1 }, limits)).toBe(true);
    expect(breakingForce({ degrees: 20, units: 0.2 }, limits)).toBe(false);
  });
});
