import { describe, expect, it } from 'vitest';
import { describeRubric, osatsRubric, scale } from './osatsRubric';

const base = { seconds: 100, pathLengthCm: 10, smoothness: 0.9, accuracyMm: 1, jawsControl: 0.95, path: [], ideal: null, speed: [], idleSeconds: 15, needleHandling: { drops: 0, regrabs: 0, loads: [] }, regrasps: { total: 1, onTip: 0 }, tipCollisions: 0 };

describe('OSATS-style rubric', () => {
  it('scales linearly within 1–5', () => {
    expect(scale(1, 0, 1)).toBe(5);
    expect(scale(-1, 0, 1)).toBe(1);
    expect(scale(0.5, 0, 1)).toBe(3);
  });

  it('scores a clean session high and a rough one low', () => {
    expect(osatsRubric(base, 0).map((i) => i.score)).toEqual([5, 5, 5, 5]);
    const rough = osatsRubric({ ...base, smoothness: 0.5, jawsControl: 0.5, idleSeconds: 70, needleHandling: { drops: 3, regrabs: 0, loads: [] }, regrasps: { total: 3, onTip: 2 } }, 3);
    expect(rough.every((i) => (i.score ?? 5) <= 2)).toBe(true);
    expect(describeRubric(osatsRubric(base, 0))).toContain('total 20/20');
    expect(describeRubric(osatsRubric({ ...base, smoothness: null, jawsControl: null, idleSeconds: undefined, needleHandling: undefined, regrasps: undefined }, 0))).toBe('');
  });
});
