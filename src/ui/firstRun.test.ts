import { expect, it } from 'vitest';
import { finishFirstRun, FIRST_RUN_STEPS, shouldShowFirstRun } from './firstRun';

const memory = () => {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
};

it('shows the walkthrough once, never to automated browsers', () => {
  const storage = memory();
  expect(FIRST_RUN_STEPS).toHaveLength(4);
  expect(shouldShowFirstRun(storage, true)).toBe(false);
  expect(shouldShowFirstRun(storage, false)).toBe(true);
  finishFirstRun(storage);
  expect(shouldShowFirstRun(storage, false)).toBe(false);
});
