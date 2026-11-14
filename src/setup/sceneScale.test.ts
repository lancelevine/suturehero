import { expect, it } from 'vitest';
import { formatMm, SCENE_MM_PER_UNIT } from './sceneScale';
import { NEEDLES } from './PracticeSetup';

it('formats scene distances in real mm, matching the modelled needle sizes', () => {
  expect(formatMm(0.1)).toBe('2.7 mm');
  expect(formatMm(1, 0)).toBe('27 mm');
  // PS-2 is a 19 mm, 3/8-circle needle: its modelled arc length at this scale should be close to 19 mm.
  const ps2 = NEEDLES.find((n) => n.id === 'ps2')!;
  expect(Math.abs(ps2.radius * ps2.arc * SCENE_MM_PER_UNIT - 19)).toBeLessThan(1);
});
