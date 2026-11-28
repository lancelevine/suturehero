import { expect, it } from 'vitest';
import { SCENE_MM_PER_UNIT } from '../setup/sceneScale';
import { describeEndurance } from './endurance';

const pass = (offMm: number) => ({ entryEdge: 0.2, exitEdge: 0.2 + offMm / SCENE_MM_PER_UNIT });

it('compares the first and last five passes', () => {
  expect(describeEndurance([pass(0.5)])).toMatch(/drift shows after 10/);
  const run = [...Array(5)].map(() => pass(0.5)).concat([...Array(5)].map(() => pass(1.5)));
  expect(describeEndurance(run)).toBe('Endurance: 10/20 passes · symmetry 0.5 → 1.5 mm (getting worse)');
});
