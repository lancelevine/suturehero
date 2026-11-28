import { describe, expect, it } from 'vitest';
import { classifyPull, describePulls } from './pullDirection';

describe('pull direction when tying', () => {
  it('classifies the line between the instrument tips', () => {
    expect(classifyPull({ x: -1, y: 0.5, z: 0 }, { x: 1, y: 0.6, z: 0.2 })).toBe('across');
    expect(classifyPull({ x: 0, y: 0.5, z: -1 }, { x: 0.2, y: 0.5, z: 1 })).toBe('along the wound');
    expect(classifyPull({ x: -0.2, y: 0.5, z: 0 }, { x: 0.2, y: 2, z: 0 })).toBe('upward');
    expect(describePulls([])).toBe('');
    expect(describePulls(['across', 'upward'])).toContain('1/2');
  });
});
