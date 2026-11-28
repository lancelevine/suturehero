import { describe, expect, it } from 'vitest';
import { challengeUrl, dailyChallenge, describeDaily, loadBest, saveBest, utcDay } from './dailyChallenge';

describe('daily challenge', () => {
  it('is the same for a given day and varies across days', () => {
    expect(dailyChallenge('2026-11-28')).toEqual(dailyChallenge('2026-11-28'));
    const days = Array.from({ length: 30 }, (_, i) => dailyChallenge(utcDay(new Date(Date.UTC(2026, 10, i + 1)))));
    expect(new Set(days.map((d) => d.siteId + d.stitches)).size).toBeGreaterThan(3);
    for (const d of days) expect(d.stitches).toBeGreaterThanOrEqual(3);
    expect(challengeUrl(days[0], 'https://x/app/')).toContain('exercise=daily');
  });

  it('keeps the best time per day', () => {
    const map = new Map<string, string>();
    const storage = { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v) };
    expect(saveBest(storage, 'd', 90)).toBe(true);
    expect(saveBest(storage, 'd', 120)).toBe(false);
    expect(loadBest(storage, 'd')).toBe(90);
    expect(describeDaily(dailyChallenge('d'), 1, 90, null)).toContain('best today 90 s');
  });
});
