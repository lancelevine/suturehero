import { expect, it } from 'vitest';
import { fitPath, skillRows, speedLine } from './SkillAnalysisPanel';

it('lists the five stats with green for good values', () => {
  const rows = skillRows({ seconds: 86, pathLengthCm: 42.34, smoothness: 0.91, accuracyMm: 0.8, jawsControl: 0.5, path: [], ideal: null, speed: [] });
  expect(rows.map((r) => [r.label, r.value, r.good])).toEqual([
    ['Time', '1:26', false], ['Path length', '42.3 cm', false], ['Smoothness', '91%', true], ['Accuracy', '0.8 mm', true], ['Jaws control', '50%', false],
  ]);
});

it('fits a path and its ideal line into the chart at one scale', () => {
  const fitted = fitPath([{ x: 0, z: 0 }, { x: 10, z: 0 }], [{ x: 0, z: 0 }, { x: 10, z: 0 }], 120, 60);
  expect(fitted.path).toBe('10.0,30.0 110.0,30.0');
  expect(fitted.ideal).toBe(fitted.path);
  expect(fitPath([])).toEqual({ path: '', ideal: '' });
});

it('draws speed against time, highest speed at the top', () => {
  expect(speedLine([{ t: 0, v: 0 }, { t: 1, v: 10 }], 100, 40)).toBe('0.0,36.0 100.0,4.0');
  expect(speedLine([{ t: 0, v: 1 }])).toBe('');
});

it('adds tip collisions when counted', () => {
  const rows = skillRows({ seconds: 1, pathLengthCm: 0, smoothness: null, accuracyMm: null, jawsControl: null, path: [], ideal: null, speed: [], tipCollisions: 0 });
  expect(rows.at(-1)).toMatchObject({ label: 'Tip collisions', value: '0', good: true });
});

it('shows regrasps on the tip when counted', () => {
  const rows = skillRows({ seconds: 1, pathLengthCm: 0, smoothness: null, accuracyMm: null, jawsControl: null, path: [], ideal: null, speed: [], regrasps: { total: 3, onTip: 1 } });
  expect(rows.at(-1)).toMatchObject({ label: 'Regrasp on tip', value: '1/3', good: false });
});
