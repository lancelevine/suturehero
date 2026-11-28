import { describe, expect, it } from 'vitest';
import { examClock, examReadout } from './examMode';

describe('exam mode', () => {
  it('counts down and then shows the result', () => {
    expect(examClock(0).label).toBe('10:00');
    expect(examClock(599.5).label).toBe('0:00');
    expect(examClock(700).over).toBe(true);
    expect(examReadout(30, false, 'x')).toContain('9:30 left');
    expect(examReadout(30, true, 'OSATS-style 12/20')).toContain('12/20');
    expect(examReadout(601, false, '')).toContain('no passes made');
  });
});
