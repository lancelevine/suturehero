import { describe, expect, it } from 'vitest';
import { describeStitchOrder, reviewStitchOrder } from './stitchOrder';

describe('stitch order coaching', () => {
  it('accepts middle first, then halving the largest gaps', () => {
    const review = reviewStitchOrder([0, -0.55, 0.55, -0.8, 0.3]);
    expect(review).toEqual({ followed: 5, total: 5, firstMiss: null });
    expect(describeStitchOrder(review)).toBe('Stitch order: middle first, then halving · 5/5');
  });

  it('flags starting at one end and working along', () => {
    const review = reviewStitchOrder([-0.9, -0.6, -0.3]);
    expect(review.firstMiss).toBe(1);
    expect(describeStitchOrder(review)).toMatch(/start in the middle of the wound$/);
  });

  it('flags a stitch placed in a smaller gap while a larger one is open', () => {
    const review = reviewStitchOrder([0, -0.55, -0.8]);
    expect(review).toEqual({ followed: 2, total: 3, firstMiss: 3 });
    expect(describeStitchOrder(review)).toMatch(/largest gap$/);
  });

  it('explains the method before any stitch', () => {
    expect(describeStitchOrder(reviewStitchOrder([]))).toMatch(/first stitch in the middle/);
  });
});
