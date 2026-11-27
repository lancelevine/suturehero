import { expect, it } from 'vitest';
import { describeWarmups, loadWarmups, localDay, saveWarmup, warmupStreak } from './warmupLog';

const memory = () => {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
};

it('logs warm-ups and counts the daily streak', () => {
  const storage = memory();
  for (const day of ['2026-11-24', '2026-11-25', '2026-11-26']) saveWarmup(storage, { day, passes: 4, meanBiteMm: 5 });
  const log = loadWarmups(storage);
  expect(log).toHaveLength(3);
  const today = new Date(2026, 10, 27);
  expect(localDay(today)).toBe('2026-11-27');
  expect(warmupStreak(log, today)).toBe(3);
  expect(describeWarmups(log, today)).toBe('Warm-up not done today · 3-day streak · last: 4 passes, mean bite 5.0 mm');
  const after = saveWarmup(storage, { day: '2026-11-27', passes: 1, meanBiteMm: null });
  expect(warmupStreak(after, today)).toBe(4);
  expect(describeWarmups(after, today)).toBe('Warm-up done today · 4-day streak · last: 1 pass');
  expect(warmupStreak(after, new Date(2026, 10, 30))).toBe(0);
});

it('survives missing or broken storage', () => {
  expect(loadWarmups(null)).toEqual([]);
  const broken = { getItem: () => '{bad', setItem: () => { throw new Error('blocked'); } };
  expect(loadWarmups(broken)).toEqual([]);
  expect(saveWarmup(broken, { day: '2026-11-27', passes: 0, meanBiteMm: null })).toHaveLength(1);
});
