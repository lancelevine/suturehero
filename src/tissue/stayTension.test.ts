import { describe, expect, it } from 'vitest';
import { describeStayTension, stayShape } from './stayTension';

describe('stay tension', () => {
  it('flattens the lumen when slack and opens it when taut', () => {
    expect(stayShape(0)).toEqual({ height: 0.8, width: 1 });
    expect(stayShape(1).height).toBe(1);
    expect(stayShape(1).width).toBe(1);
    expect(describeStayTension(0.1)).toContain('back wall');
    expect(describeStayTension(0.9)).toBe('');
    expect(describeStayTension(0.5)).toBe('');
  });
});
