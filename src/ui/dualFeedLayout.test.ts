import { describe, expect, it } from 'vitest';
import { dualFeedLayout, FEED_GAP_PX } from './dualFeedLayout';

const RATIO = 1280 / 800;
describe('two camera views layout', () => {
  it('puts the views side by side in a wide area', () => {
    const layout = dualFeedLayout(1000, 400, RATIO, RATIO);
    expect(layout.arrangement).toBe('side-by-side');
    expect(layout.feedWidth).toBeCloseTo((1000 - FEED_GAP_PX) / 2, 5);
  });
  it('stacks the views in a tall area', () => {
    const layout = dualFeedLayout(450, 600, RATIO, RATIO);
    expect(layout.arrangement).toBe('stacked');
    expect(layout.feedWidth).toBe(450);
  });
  it('limits each layout by the other dimension so both views stay fully visible', () => {
    const wide = dualFeedLayout(1600, 300, RATIO, RATIO);
    expect(wide.feedWidth / RATIO).toBeLessThanOrEqual(300);
    const tall = dualFeedLayout(630, 500, RATIO, RATIO);
    expect(2 * (tall.feedWidth / RATIO) + FEED_GAP_PX).toBeLessThanOrEqual(500 + 1e-9);
  });
  it('handles an empty area', () => {
    expect(dualFeedLayout(0, 0, RATIO, RATIO).feedWidth).toBe(0);
  });
});
