import { describe, expect, it } from 'vitest';
import { describeFirstPass, firstPassRate } from './firstPassRate';

describe('first-pass rate', () => {
  it('is kept bites over all attempts', () => {
    expect(firstPassRate(0, 0, 0)).toBeNull();
    expect(firstPassRate(3, 1, 0)).toBe(0.75);
    expect(describeFirstPass(3, 0, 1)).toBe('First-pass rate 75% · 1 bite backed out or redone');
    expect(describeFirstPass(2, 0, 0)).toBe('First-pass rate 100%');
  });
});
