import { describe, expect, it } from 'vitest';
import { describeKnotTime, KnotTimer, loadBestKnot, saveBestKnot } from './knotTimer';

describe('knot timer', () => {
  it('times from the start of tying to the finished knot and keeps the best', () => {
    const timer = new KnotTimer();
    timer.update(10, false, false);
    timer.update(12, true, false);
    expect(describeKnotTime(timer, 15, null, true, true)).toBe('Knot timer 3 s');
    expect(timer.update(30.5, true, true)).toBeCloseTo(18.5, 9);
    expect(timer.update(31, true, true)).toBeNull();
    expect(describeKnotTime(timer, 31, 18.5, true, false)).toBe('Knot tied in 18.5 s (square, not seated flat) · best 18.5 s');
    const map = new Map<string, string>();
    const storage = { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v) };
    expect(saveBestKnot(storage, 20)).toBe(true);
    expect(saveBestKnot(storage, 25)).toBe(false);
    expect(loadBestKnot(storage)).toBe(20);
  });
});
