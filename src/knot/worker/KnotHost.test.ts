import { describe, expect, it } from 'vitest';
import { MAX_TIME_STEPS } from '../../gameplay/FreeKnotPractice';
import { slicesFor } from './KnotHost';

describe('worker time slicing', () => {
  it('never hands the model more time in one call than it can simulate', () => {
    const perCallLimit = MAX_TIME_STEPS / 120;
    for (const dt of [1 / 60, 0.05, 0.15, 0.4, 1]) expect(dt / slicesFor(dt)).toBeLessThanOrEqual(perCallLimit + 1e-9);
    expect(slicesFor(1 / 60)).toBe(1);
  });
});
