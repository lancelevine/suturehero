import { expect, it } from 'vitest';
import { SCENE_MM_PER_UNIT } from '../setup/sceneScale';
import { describePlan } from './planVsActual';

const u = (mm: number) => mm / SCENE_MM_PER_UNIT;

it('matches stitches to planned spots and lists misses, unused and unplanned', () => {
  expect(describePlan([], [0])).toBe('');
  expect(describePlan([u(0), u(10), u(20)], [u(0.5), u(12.4)])).toBe('Plan: 3 spots · 1 hit within 1 mm · off by 2.4 mm · 1 not used');
  expect(describePlan([u(0)], [u(0), u(8)])).toBe('Plan: 1 spot · 1 hit within 1 mm · 1 unplanned');
});
