import { expect, it } from 'vitest';
import { loadBests, recordBest } from './personalBest';

const memory = () => {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
};

it('keeps the fastest completion per challenge', () => {
  const storage = memory();
  expect(recordBest(storage, 'sandbox', 300)).toBe(true);
  expect(recordBest(storage, 'sandbox', 320)).toBe(false);
  expect(recordBest(storage, 'sandbox', 250)).toBe(true);
  expect(loadBests(storage)).toEqual({ sandbox: 250 });
  expect(loadBests(null)).toEqual({});
});
