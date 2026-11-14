import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { instrumentMetrics, MotionRecorder, summarize, type MotionSample } from './motionMetrics';

/** Samples at 30 Hz: `segments` of [duration s, speed mm/s along x]. */
function track(instrument: string, segments: Array<[number, number]>, start = 0): MotionSample[] {
  const samples: MotionSample[] = [];
  let at = start, x = 0;
  samples.push({ instrument, at, x, y: 0, z: 0 });
  for (const [seconds, speed] of segments) {
    for (let i = 0; i < seconds * 30; i++) {
      at += 1000 / 30;
      x += speed / 30;
      samples.push({ instrument, at, x, y: 0, z: 0 });
    }
  }
  return samples;
}

describe('motion metrics', () => {
  it('measures path, time, idle time and separate movements', () => {
    const m = instrumentMetrics('needleDriver', track('needleDriver', [[1, 0], [1, 50], [1, 0], [0.5, 40], [1, 0]]));
    expect(m.trackedSeconds).toBeCloseTo(4.5, 1);
    expect(m.pathLengthMm).toBeCloseTo(70, 0);
    expect(m.movements).toBe(2);
    expect(m.idleSeconds).toBeGreaterThan(2.8);
    expect(m.idleSeconds).toBeLessThan(3.2);
  });

  it('does not count tracking gaps as time or path', () => {
    const samples = [...track('forceps', [[1, 30]]), ...track('forceps', [[1, 30]], 5000).map((s) => ({ ...s, x: s.x + 500 }))];
    const m = instrumentMetrics('forceps', samples);
    expect(m.trackedSeconds).toBeCloseTo(2, 1);
    expect(m.pathLengthMm).toBeCloseTo(60, 0);
  });

  it('reports how much both hands move at once', () => {
    const summary = summarize([...track('forceps', [[1, 30], [1, 0]]), ...track('needleDriver', [[2, 30]])]);
    expect(summary.instruments).toHaveLength(2);
    expect(summary.bimanualFraction).toBeGreaterThan(0.4);
    expect(summary.bimanualFraction).toBeLessThan(0.6);
    expect(summarize(track('forceps', [[1, 30]])).bimanualFraction).toBeNull();
  });

  it('records only between start and stop and exports the samples', () => {
    const recorder = new MotionRecorder();
    recorder.add('forceps', new Vector3(1, 2, 3), 0);
    recorder.start();
    recorder.add('forceps', new Vector3(1, 2, 3), 10);
    recorder.stop();
    recorder.add('forceps', new Vector3(1, 2, 3), 20);
    const data = recorder.exportData('0.153');
    expect(data.samples).toHaveLength(1);
    expect(data.format).toBe('suturehero-motion-metrics-v1');
  });
});
