import { expect, it } from 'vitest';
import { SCENE_MM_PER_UNIT } from '../setup/sceneScale';
import { describeLandmark } from './landmark';

it('grades the first stitch on millimetres off the landmark', () => {
  expect(describeLandmark(null)).toMatch(/^Landmark exercise/);
  expect(describeLandmark(0.5 / SCENE_MM_PER_UNIT)).toBe('Landmark: first stitch 0.5 mm off the line · aligned ✓');
  expect(describeLandmark(-2 / SCENE_MM_PER_UNIT)).toBe('Landmark: first stitch 2.0 mm off the line · aim within 1 mm');
});
