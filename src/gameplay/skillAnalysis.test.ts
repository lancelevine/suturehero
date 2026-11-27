import { expect, it } from 'vitest';
import { HISTORY_SECONDS, SkillRecorder } from './skillAnalysis';

const sample = (t: number, x: number, holding = false, safeHold = true) => ({ t, x, z: 0, holding, safeHold });

it('measures path length, smoothness, accuracy and jaws control', () => {
  const recorder = new SkillRecorder();
  // Steady 100 mm/s for 1 s, then a sudden stop.
  for (let i = 0; i <= 20; i++) recorder.add(sample(i * 0.05, i * 5, i > 10, i !== 15));
  recorder.add(sample(1.05, 100));
  recorder.add(sample(1.06, 999));
  const report = recorder.report(42, [0.5, 1.5]);
  expect(report.pathLengthCm).toBeCloseTo(10);
  expect(report.smoothness).toBeCloseTo(19 / 20);
  expect(report.accuracyMm).toBeCloseTo(1);
  expect(report.jawsControl).toBeCloseTo(9 / 10);
  expect(report.ideal).toEqual([{ x: 0, z: 0 }, { x: 100, z: 0 }]);
  expect(report.speed[0].v).toBeCloseTo(100);
});

it('reports nothing measured yet, and keeps only recent history', () => {
  const recorder = new SkillRecorder();
  expect(recorder.report(0, [])).toMatchObject({ smoothness: null, accuracyMm: null, jawsControl: null, ideal: null, pathLengthCm: 0 });
  recorder.add(sample(0, 0));
  recorder.add(sample(HISTORY_SECONDS + 1, 10));
  expect(recorder.report(0, []).path).toHaveLength(1);
  expect(recorder.pathLengthMm).toBe(10);
});
