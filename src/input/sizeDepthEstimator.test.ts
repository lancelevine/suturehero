import { describe, expect, it } from 'vitest';
import { SizeDepthEstimator, type SizeDepthCandidate, type SizeDepthUpdate } from './sizeDepthEstimator';

const face = (id: number, proxy: number, cosine = 1): SizeDepthCandidate => ({ id, proxy, cosine, normalizedSide: 1 / proxy });
const step = (estimator: SizeDepthEstimator, candidates: SizeDepthCandidate[], now: number, change: Partial<SizeDepthUpdate> = {}) =>
  estimator.update({ candidates, now, stationary: false, binding: 'cam', instrument: 'forceps', focalPerWidth: 2, ...change });

describe('size depth estimator', () => {
  it('returns the median of recent frames, in millimetres', () => {
    const estimator = new SizeDepthEstimator();
    let result = null;
    for (const [i, proxy] of [100, 300, 110, 105, 120].entries()) result = step(estimator, [face(1, proxy)], i * 30);
    expect(result!.proxy).toBe(110);
    expect(result!.distanceMm).toBe(220);
  });

  it('stays on the current face unless another is clearly more face-on', () => {
    const estimator = new SizeDepthEstimator();
    step(estimator, [face(1, 100, 0.9)], 0);
    expect(step(estimator, [face(1, 100, 0.85), face(2, 200, 0.95)], 30)!.proxy).toBe(100);
    for (let t = 60; t < 400; t += 30) step(estimator, [face(1, 100, 0.7), face(2, 200, 0.95)], t);
    expect(estimator.frames().at(-1)!.proxy).toBe(200);
  });

  it('repeats the last proxy at rest within the same binding only', () => {
    const estimator = new SizeDepthEstimator();
    step(estimator, [face(1, 100)], 0);
    step(estimator, [face(1, 150)], 30, { stationary: true });
    expect(estimator.frames().at(-1)!.proxy).toBe(100);
    step(estimator, [face(1, 150)], 60, { stationary: true, binding: 'other' });
    expect(estimator.frames().at(-1)!.proxy).toBe(150);
  });

  it('keeps at most 8 frames from the last 500 ms, one per timestamp, and returns null without a usable face', () => {
    const estimator = new SizeDepthEstimator();
    for (let t = 0; t < 12; t++) step(estimator, [face(1, 100 + t)], t * 10);
    expect(estimator.frames()).toHaveLength(8);
    step(estimator, [face(1, 999)], 110);
    expect(estimator.frames().at(-1)!.proxy).toBe(111);
    step(estimator, [face(1, 50)], 2000);
    expect(estimator.frames()).toHaveLength(1);
    expect(step(estimator, [face(1, -1)], 2030)).toBeNull();
    expect(step(estimator, [], 2060)).toBeNull();
  });
});
