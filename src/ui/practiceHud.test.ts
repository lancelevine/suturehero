import { expect, it } from 'vitest';
import { formatClock, hudState } from './practiceHud';

it('formats the timer', () => {
  expect(formatClock(86.9)).toBe('1:26');
  expect(formatClock(-3)).toBe('0:00');
});

it('shows precision, tension and progress for the Sandbox challenge', () => {
  const state = hudState({ seconds: 86, precisionMm: 0.6, tension: 0.42, stitches: 2, course: false });
  expect(state.timer).toBe('1:26');
  expect(state.precision).toMatchObject({ value: '0.6 mm', good: true });
  expect(state.tension).toEqual({ value: '42%', fraction: 0.42 });
  expect(state.progress).toEqual({ value: '2/6', goal: 6, done: 2 });
  expect(state.challenge.lines.map((l) => [l.text, l.met])).toEqual([['Place 6 sutures', null], ['Within 10:00', null], ['Within ±1.0 mm', true]]);
});

it('marks a met and a missed challenge, and shows dashes with nothing measured', () => {
  const done = hudState({ seconds: 300, precisionMm: 1.4, tension: null, stitches: 3, course: true });
  expect(done.challenge.lines.map((l) => l.met)).toEqual([true, true, false]);
  expect(done.precision.good).toBe(false);
  const empty = hudState({ seconds: 700, precisionMm: null, tension: null, stitches: 0, course: false });
  expect([empty.precision.value, empty.tension.value]).toEqual(['–', '–']);
  expect(empty.challenge.lines[1].met).toBe(false);
});
