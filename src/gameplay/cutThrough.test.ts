import { describe, expect, it } from 'vitest';
import { cutThroughTension, STANDARD_CUT_TENSION } from './cutThrough';
import { PracticeSession } from './PracticeSession';

describe('cut-through tension by skin toughness', () => {
  it('keeps standard skin unchanged and lowers it for fragile skin', () => {
    expect(cutThroughTension(1)).toBeCloseTo(STANDARD_CUT_TENSION, 9);
    expect(STANDARD_CUT_TENSION).toBe(PracticeSession.CUT_TENSION);
    expect(cutThroughTension(0.5)).toBeCloseTo(1.175, 9);
    expect(cutThroughTension(1.3)).toBeGreaterThan(STANDARD_CUT_TENSION);
  });
});
