import { describe, expect, it } from 'vitest';
import { RotationScore } from './rotationScore';

describe('rotate, do not push', () => {
  it('scores the share of in-tissue time without forcing', () => {
    const score = new RotationScore();
    expect(score.rotatingShare).toBeNull();
    score.update(false, true, 1);
    score.update(true, false, 3);
    score.update(true, true, 1);
    expect(score.rotatingShare).toBeCloseTo(0.75, 6);
  });
});
