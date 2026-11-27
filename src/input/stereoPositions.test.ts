import { Quaternion, Vector3 } from 'three';
import { expect, it } from 'vitest';
import { StereoPositions } from './stereoPositions';

it('filters one pose per frame pair and forgets on clear', () => {
  const positions = new StereoPositions<string>();
  positions.accept('forceps', new Vector3(1, 2, 3), new Quaternion(), 100);
  const first = positions.get('forceps')!;
  expect(first.lastSample).toBe(100);
  expect(first.position.toArray()).toEqual([1, 2, 3]);
  positions.accept('forceps', new Vector3(9, 9, 9), new Quaternion(), 100);
  expect(positions.get('forceps')!.position.toArray()).toEqual([1, 2, 3]);
  positions.accept('forceps', new Vector3(1.001, 2, 3), new Quaternion(), 133);
  expect(positions.get('forceps')).toBe(first);
  expect(first.lastSample).toBe(133);
  positions.clear();
  expect(positions.get('forceps')).toBeUndefined();
});
