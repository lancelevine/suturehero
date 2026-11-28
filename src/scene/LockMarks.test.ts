import { describe, expect, it } from 'vitest';
import { LockMarks } from './LockMarks';

describe('lock marks', () => {
  it('draws one loop per locked exit and rebuilds only on change', () => {
    const marks = new LockMarks();
    marks.update([{ x: 0.2, y: 0.41, z: 0.1 }, { x: -0.2, y: 0.41, z: 0.5 }]);
    expect(marks.root.children).toHaveLength(2);
    const first = marks.root.children[0];
    marks.update([{ x: 0.2, y: 0.41, z: 0.1 }, { x: -0.2, y: 0.41, z: 0.5 }]);
    expect(marks.root.children[0]).toBe(first);
    marks.update([]);
    expect(marks.root.children).toHaveLength(0);
  });
});
