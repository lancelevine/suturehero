import { describe, expect, it } from 'vitest';
import { describeCrimps, ThreadCrimpCheck } from './threadCrimp';

describe('thread crimp', () => {
  it('counts each crimping grip per instrument', () => {
    const check = new ThreadCrimpCheck();
    check.update('left', true, 0.15);
    expect(check.crimps).toBe(0);
    check.update('left', true, 0.02);
    check.update('left', true, 0.01);
    check.update('right', true, 0.0);
    expect(check.crimps).toBe(2);
    check.update('left', false, 0.0);
    check.update('left', true, 0.0);
    expect(describeCrimps(check)).toContain('3 crimping grips');
  });
});
