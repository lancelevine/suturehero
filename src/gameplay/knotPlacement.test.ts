import { expect, it } from 'vitest';
import { SCENE_MM_PER_UNIT } from '../setup/sceneScale';
import { describeKnotPlacement, knotPoint, knotSide } from './knotPlacement';

it('finds the knot where the strands cross and grades its side', () => {
  const long = [{ x: -1, y: 0, z: 0 }, { x: 0.2, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }];
  const short = [{ x: 0.2, y: 0.02, z: 1 }, { x: 0.2, y: 0.02, z: 0 }];
  expect(knotPoint(long, short)).toEqual({ x: 0.2, y: 0.01, z: 0 });
  expect(knotSide(0.5 / SCENE_MM_PER_UNIT)).toBe('on the incision');
  expect(knotSide(-3 / SCENE_MM_PER_UNIT)).toBe('left');
  expect(describeKnotPlacement(['left', 'left'])).toBe('Knots: 2/2 off the incision · all on the left');
  expect(describeKnotPlacement(['left', 'right', 'on the incision'])).toBe('Knots: 2/3 off the incision · 1 on the wound line · 1 left, 1 right · keep them on one side');
});
