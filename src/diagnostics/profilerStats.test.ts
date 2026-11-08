import { describe, expect, it } from 'vitest';
import { breakdown, classifyStage, percentile, RollingSamples, ROLLING_SAMPLES, type StageStats } from './profilerStats';
import { FrameCadence } from './frameCadence';

describe('rolling samples', () => {
  it('reports mean, median, p95, rate and busy time over the last samples only', () => {
    const r = new RollingSamples();
    // 200 samples, 10 ms apart; only the last ROLLING_SAMPLES are kept.
    for (let i = 0; i < 200; i++) r.push(i * 10, i < 80 ? 1000 : i % 10 === 0 ? 9 : 2);
    const s = r.stats(1990)!;
    expect(s.count).toBe(ROLLING_SAMPLES);
    expect(s.maxMs).toBe(9);
    expect(s.medianMs).toBe(2);
    expect(s.p95Ms).toBe(9);
    expect(s.ratePerSec).toBeCloseTo(100, 6);
    // Mean 2.7 ms × 100 runs per second.
    expect(s.meanMs).toBeCloseTo(2.7, 6);
    expect(s.busyMsPerSec).toBeCloseTo(270, 0);
  });

  it('drops stale samples and handles weights', () => {
    const r = new RollingSamples();
    r.push(0, 5);
    expect(r.stats(20_000)).toBeNull();
    const w = new RollingSamples();
    w.push(0, 0, 1);
    w.push(1000, 0, 3);
    expect(w.stats(1000)!.ratePerSec).toBe(3);
  });

  it('uses nearest-rank percentiles', () => {
    expect(percentile([1, 2, 3, 4], 0.5)).toBe(2);
    expect(percentile([1, 2, 3, 4], 0.95)).toBe(4);
    expect(Number.isNaN(percentile([], 0.5))).toBe(true);
  });
});

describe('stage classification', () => {
  it('keeps Camera 1 and Camera 2 apart and marks nesting', () => {
    expect(classifyStage('Camera 1 decode readback')).toMatchObject({ camera: 1, category: 'readback', thread: 'main' });
    expect(classifyStage('Camera 2 decode readback')).toMatchObject({ camera: 2, category: 'readback' });
    expect(classifyStage('Camera 2 decode thresholding')).toMatchObject({ camera: 2, thread: 'worker', nestedIn: 'Camera 2 decode worker' });
    expect(classifyStage('Camera 1 predicted decode worker').nestedIn).toBe('Camera 1 decode worker');
    expect(classifyStage('Camera 1 decode round trip').thread).toBe('latency');
    expect(classifyStage('Stereo pose/synchronization')).toMatchObject({ camera: 'shared', category: 'stereo', nestedIn: 'Pose estimation + filtering' });
    expect(classifyStage('Simulator render submission').category).toBe('render');
    expect(classifyStage('Something new').category).toBe('other');
  });
});

describe('breakdown', () => {
  const stat = (busyMsPerSec: number): StageStats => ({ count: 10, meanMs: 1, medianMs: 1, p95Ms: 1, maxMs: 1, ratePerSec: busyMsPerSec, busyMsPerSec });
  it('does not double count nested rows, totals or latency, and keeps workers apart', () => {
    const b = breakdown(new Map([
      ['Pose estimation + filtering', stat(30)],
      ['Rigid pose solve', stat(20)], // nested in pose estimation
      ['Jaw tracking', stat(90)],
      ['Tracking CPU frame', stat(400)], // loop total
      ['Camera 1 decode round trip', stat(500)], // latency
      ['Camera 1 decode worker', stat(600)],
      ['Camera 1 decode thresholding', stat(200)], // nested in worker
    ]));
    expect(b.main.map((r) => r.name)).toEqual(['Jaw tracking', 'Pose estimation + filtering']);
    expect(b.main[0].percent).toBeCloseTo(75, 6);
    expect(b.workers.map((r) => r.name)).toEqual(['Camera 1 decode worker']);
    expect(b.workers[0].percent).toBeCloseTo(60, 6);
    expect(b.bottleneck?.name).toBe('Camera 1 decode worker');
  });
});

describe('frame cadence', () => {
  it('measures arrival FPS, missed presentations and capture age', () => {
    const c = new FrameCadence();
    let presented = 0;
    for (let i = 0; i < 60; i++) {
      presented += i === 30 ? 3 : 1; // two frames skipped once
      c.frame(i * 33.3, { presentedFrames: presented, captureTime: i * 33.3 - 20, width: 1280, height: 800 });
    }
    const r = c.report(60 * 33.3);
    expect(r.arrivalFps).toBeCloseTo(30, 0);
    expect(r.missedPresentations).toBe(2);
    expect(r.captureToCallback!.medianMs).toBeCloseTo(20, 6);
    expect([r.frameWidth, r.frameHeight]).toEqual([1280, 800]);
  });

  it('ignores capture times it cannot trust', () => {
    const c = new FrameCadence('currentTime polling');
    c.frame(100, { captureTime: 0 });
    c.frame(133, { captureTime: 500 });
    expect(c.report(133).captureToCallback).toBeNull();
  });
});
