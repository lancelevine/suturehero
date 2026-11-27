import { expect, it } from 'vitest';
import { catchesBackWall } from './backWallCatch';

it('flags a needle arc that reaches the back wall through the lumen', () => {
  const vessel = { centerY: 0.01, innerRadius: 0.32 };
  expect(catchesBackWall({ centreY: 0.55, radius: 0.3 }, vessel)).toBe(false);
  expect(catchesBackWall({ centreY: 0.2, radius: 0.6 }, vessel)).toBe(true);
});
