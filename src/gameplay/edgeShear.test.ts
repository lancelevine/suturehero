import { describe, expect, it } from 'vitest';
import { describeEdgeShear, edgeShiftMm } from './edgeShear';

describe('edges that slide sideways', () => {
  it('shifts the wound line toward the wider bite', () => {
    expect(edgeShiftMm(4, 2)).toBe(1);
    expect(describeEdgeShear([])).toBe('');
    expect(describeEdgeShear([{ entryEdgeMm: 3, exitEdgeMm: 3.2 }])).toContain('stays centred');
    expect(describeEdgeShear([{ entryEdgeMm: 3, exitEdgeMm: 3 }, { entryEdgeMm: 2, exitEdgeMm: 4 }])).toContain('pass 2 pulls the line 1.0 mm toward the exit side');
    expect(describeEdgeShear([{ entryEdgeMm: 2, exitEdgeMm: null }])).toBe('');
  });
});
