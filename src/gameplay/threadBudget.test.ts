import { expect, it } from 'vitest';
import { SCENE_MM_PER_UNIT } from '../setup/sceneScale';
import { describeThreadBudget, threadUse } from './threadBudget';

const len = (v: number) => ({ length: () => v });
const pass = (x: number, z: number) => ({ entry: { x: -x, y: 0, z }, exit: { x, y: 0, z }, tract: { start: len(0.3), exitAngle: 2 } });

it('adds each pass arc and the loose span back to the previous pass', () => {
  const use = threadUse([pass(0.2, 0), pass(0.2, 0.3)]);
  expect(use[0]).toBeCloseTo(0.6 * SCENE_MM_PER_UNIT);
  expect(use[1]).toBeCloseTo((0.6 + Math.hypot(0.4, 0.3) * 1.05) * SCENE_MM_PER_UNIT);
  expect(describeThreadBudget([])).toBe('');
  expect(describeThreadBudget([pass(0.2, 0)], 0.7)).toMatch(/running short/);
});
