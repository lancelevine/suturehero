import { expect, it } from 'vitest';
import { getOrCreate } from './getOrCreate';

it('creates a value once and then returns the stored one', () => {
  const map = new Map<string, number[]>();
  const first = getOrCreate(map, 'a', () => []);
  first.push(1);
  expect(getOrCreate(map, 'a', () => [])).toBe(first);
  expect(map.get('a')).toEqual([1]);
});
