import { describe, expect, it } from 'vitest';
import { UnevenPullCheck } from './unevenPull';

describe('uneven pull on a square knot', () => {
  it('warns after a sustained one-sided pull with both ends held', () => {
    const check = new UnevenPullCheck();
    for (let i = 0; i < 10; i++) check.update(0.5, 0.05, true, 0.1);
    expect([check.warning, check.episodes]).toEqual([true, 1]);
    check.update(0.4, 0.4, true, 0.1);
    expect(check.warning).toBe(false);
    for (let i = 0; i < 10; i++) check.update(0.5, 0.05, false, 0.1);
    expect(check.episodes).toBe(1);
  });
});
