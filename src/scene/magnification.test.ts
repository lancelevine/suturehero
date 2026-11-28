import { describe, expect, it } from 'vitest';
import { MAGNIFICATION_STEPS, nextMagnification } from './magnification';

describe('magnification steps', () => {
  it('cycles naked eye → loupe → microscope → naked eye', () => {
    expect(MAGNIFICATION_STEPS.map((s) => s.zoom)).toEqual([1, 2.5, 4]);
    expect(nextMagnification(0)).toBe(1);
    expect(nextMagnification(2)).toBe(0);
  });
});
