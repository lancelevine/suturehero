import { expect, it } from 'vitest';
import { csvField, knotSummary, SessionClock, sessionsCsv, stitchesCsv } from './sessionRecord';
import type { SandboxSummary } from './sandboxSummary';

it('quotes CSV fields only when needed and rounds numbers', () => {
  expect(csvField('plain')).toBe('plain');
  expect(csvField('a, b')).toBe('"a, b"');
  expect(csvField('say "hi"')).toBe('"say ""hi"""');
  expect(csvField('line\nbreak')).toBe('"line\nbreak"');
  expect(csvField(3.14159)).toBe('3.14');
  expect(csvField(null)).toBe('');
  expect(csvField(Number.NaN)).toBe('');
});

it('summarises the recognised knot, or nothing before a throw', () => {
  expect(knotSummary(undefined, 'claude')).toBeNull();
  expect(knotSummary({ technique: 'auto', locked: false, throws: [] }, 'claude')).toBeNull();
  expect(knotSummary({ technique: 'surgeon', locked: true, throws: [{ wraps: 2, direction: 1 }, { wraps: 1, direction: -1 }] }, 'claude', 'secure')).toEqual({
    technique: 'surgeon', throws: [{ wraps: 2, direction: 1 }, { wraps: 1, direction: -1 }], locked: true, security: 'secure', engine: 'claude',
  });
});

it('times each stitch from the previous one and from the session start', () => {
  let now = Date.UTC(2026, 10, 23, 9, 0, 0);
  const clock = new SessionClock(() => now);
  now += 90_000;
  const first = clock.stitchDone(null);
  now += 60_000;
  const second = clock.stitchDone(null);
  expect([first.secondsForStitch, first.secondsFromStart]).toEqual([90, 90]);
  expect([second.secondsForStitch, second.secondsFromStart]).toEqual([60, 150]);
  expect(second.completedAt).toBe('2026-11-23T09:02:30.000Z');
  clock.restart();
  now += 10_000;
  expect(clock.secondsSoFar).toBe(10);
});

it('writes one CSV row per stitch with the knot and timing', () => {
  const csv = stitchesCsv([
    { number: 1, review: ['Bite 5.0 mm', 'Knot: secure'], meta: { completedAt: '2026-11-23T09:01:30.000Z', secondsFromStart: 90, secondsForStitch: 90, knot: { technique: 'surgeon', throws: [{ wraps: 2, direction: 1 }, { wraps: 1, direction: -1 }], locked: true, security: 'secure', engine: 'claude' } } },
    { number: 2, review: ['Guided, no free knot'] },
  ], 'Resident, A', 'BUILD 0.217');
  const [header, first, second] = csv.trim().split('\r\n');
  expect(header.split(',')[0]).toBe('trainee');
  expect(first).toBe('"Resident, A",BUILD 0.217,1,2026-11-23T09:01:30.000Z,90,90,surgeon,2+ 1-,yes,secure,claude,Bite 5.0 mm | Knot: secure');
  expect(second).toBe('"Resident, A",BUILD 0.217,2,,,,,,,,,"Guided, no free knot"');
});

it('writes one CSV row per saved session', () => {
  const summary: SandboxSummary = { at: '2026-11-23T09:05:00.000Z', passes: 3, tears: 1, cutThroughs: 0, meanBiteMm: 5.25, worstAsymmetryMm: 1.5, meanDepthMm: 3, meanEntryAngleDeg: 82, crossingShare: 1, stitches: 2, secureKnots: 2, spacingMm: [6.04] };
  const rows = sessionsCsv([{ ...summary, trainee: 'R1', durationSeconds: 300 }, summary]).trim().split('\r\n');
  expect(rows).toHaveLength(3);
  expect(rows[1]).toBe('2026-11-23T09:05:00.000Z,R1,300,3,1,0,5.25,1.5,3,82,1,2,2,6.0');
  expect(rows[2].split(',').slice(1, 3)).toEqual(['', '']);
});
