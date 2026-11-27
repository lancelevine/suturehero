import { expect, it } from 'vitest';
import { microProfile } from '../environments/MicroTargets';
import { StaySutureMarks, stayAngles } from './StaySutureMarks';

it('marks two or three stays on each vessel end', () => {
  expect(stayAngles('none')).toEqual([]);
  expect(stayAngles('120')).toHaveLength(3);
  const marks = new StaySutureMarks();
  marks.update(microProfile('artery'), '180', true);
  expect(marks.root.children).toHaveLength(4);
  marks.update(microProfile('artery'), '120', true);
  expect(marks.root.children).toHaveLength(6);
  // The first stay sits at the top of the vessel.
  const top = marks.root.children[0].position;
  expect(top.y).toBeGreaterThan(microProfile('artery').centerY);
});
