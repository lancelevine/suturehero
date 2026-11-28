import { describe, expect, it } from 'vitest';
import { skids } from './needleSkid';

describe('needle skid', () => {
  it('skids only at shallow entry angles', () => {
    expect(skids(10)).toBe(true);
    expect(skids(45)).toBe(false);
    expect(skids(90)).toBe(false);
  });
});
