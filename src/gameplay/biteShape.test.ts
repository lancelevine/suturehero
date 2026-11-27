import { expect, it } from 'vitest';
import { biteShape, describeBiteShapes } from './biteShape';

it('classifies bites by depth against half their surface width', () => {
  expect([biteShape(6, 8), biteShape(4, 8), biteShape(2, 8)]).toEqual(['flask', 'straight', 'V-shaped']);
  expect(describeBiteShapes(['flask', 'V-shaped'])).toBe('Bite shape: 1 flask · 0 straight · 1 V-shaped · go deeper than half the bite width for a flask shape that everts the edges');
  expect(describeBiteShapes(['flask'])).toMatch(/flask bites evert the edges$/);
});
