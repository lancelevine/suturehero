import { describe, expect, it } from 'vitest';
import { assessEdges, assessKnot } from './stitchOutcome';

const t = (wraps: number, direction: number, postHeld = false) => ({ wraps, direction, postHeld });

describe('knot security', () => {
  it('grades a seated surgeon’s knot with alternating throws as secure', () => {
    expect(assessKnot([t(2, 1), t(1, -1), t(1, 1)], 3).security).toBe('secure');
  });
  it('flags granny throws, unseated throws and too few throws', () => {
    const granny = assessKnot([t(1, 1), t(1, -1), t(1, -1)], 3);
    expect(granny.security).toBe('may slip');
    expect(granny.notes.join()).toMatch(/granny/);
    expect(assessKnot([t(2, 1), t(1, -1), t(1, 1)], 1).notes.join()).toMatch(/not seated/);
    expect(assessKnot([t(2, 1), t(1, -1)], 2).security).toBe('may slip');
    expect(assessKnot([t(1, 1), t(1, 1)], 2).security).toBe('insecure');
  });
  it('accepts a deliberate sliding start with the post held', () => {
    const sliding = assessKnot([t(1, 1), t(1, 1, true), t(1, -1), t(1, 1)], 4);
    expect(sliding.security).toBe('secure');
    expect(sliding.notes[0]).toMatch(/sliding start/);
  });
});

describe('edge approximation', () => {
  it('reports meeting, everted, level edges as good, and names problems', () => {
    expect(assessEdges(0.97, 0.01, 0).good).toBe(true);
    expect(assessEdges(0.3, 0.01, 0).notes[0]).toMatch(/gap/);
    expect(assessEdges(0.97, -0.01, 0).notes[1]).toMatch(/inverted/);
    expect(assessEdges(0.97, 0.01, 0.02).notes[2]).toMatch(/Left edge higher/);
  });
});
