import { describe, expect, it } from 'vitest';
import { CrushScore } from './crushScore';

describe('forceps crush score', () => {
  it('counts hold time with the jaws squeezed shut', () => {
    const score = new CrushScore();
    expect(score.crushShare).toBeNull();
    score.update(false, 0, 5);
    score.update(true, 0.15, 3);
    score.update(true, 0.02, 1);
    expect(score.crushShare).toBeCloseTo(0.25, 6);
  });
});
