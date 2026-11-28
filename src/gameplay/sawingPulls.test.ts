import { describe, expect, it } from 'vitest';
import { SawingPullCheck } from './sawingPulls';

describe('sawing pull check', () => {
  it('counts one per sustained over-tension episode, ignoring spikes and unthreaded pulls', () => {
    const check = new SawingPullCheck();
    check.update(2, true, 0.05);
    check.update(1, true, 0.05);
    expect(check.count).toBe(0);
    for (let i = 0; i < 10; i++) check.update(2, true, 0.05);
    expect(check.count).toBe(1);
    check.update(1, true, 0.05);
    for (let i = 0; i < 4; i++) check.update(2, true, 0.05);
    expect(check.count).toBe(2);
    for (let i = 0; i < 4; i++) check.update(2, false, 0.05);
    expect(check.count).toBe(2);
  });
});
