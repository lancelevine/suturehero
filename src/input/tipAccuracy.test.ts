import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { ACCURACY_TOUCHES, summarizeAccuracy, TipAccuracyCheck } from './tipAccuracy';

const memory = () => {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
};

describe('tip accuracy check', () => {
  it('summarizes mean and worst touch', () => {
    const result = summarizeAccuracy([{ distanceMm: 1, at: [0, 0, 0] }, { distanceMm: 4, at: [50, 0, 0] }, { distanceMm: 1, at: [0, 0, 50] }], 'now')!;
    expect(result.meanMm).toBeCloseTo(2, 9);
    expect(result.worstMm).toBe(4);
    expect(result.worstIndex).toBe(1);
    expect(summarizeAccuracy([], 'now')).toBeNull();
  });

  it('records touches and saves the result after the last one', () => {
    const check = new TipAccuracyCheck(memory());
    for (let i = 1; i < ACCURACY_TOUCHES; i++) expect(check.record(new Vector3(i, 0, 0), new Vector3(i, 2, 0))).toBe(i);
    expect(check.lastResult()).toBeNull();
    expect(check.record(new Vector3(0, 0, 0), new Vector3(0, 0, 3))).toBe(ACCURACY_TOUCHES);
    const result = check.lastResult()!;
    expect(result.touches).toHaveLength(ACCURACY_TOUCHES);
    expect(result.worstMm).toBe(3);
    expect(result.touches[0].at).toEqual([1, 1, 0]);
    expect(check.pending()).toHaveLength(0);
  });
});
