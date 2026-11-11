import { describe, expect, it } from 'vitest';
import { sameImageMarkers } from './sameImage';

const m = (id: number) => ({ id });
describe('same-image ring and prism markers', () => {
  it('keeps only markers from the newest ring image', () => {
    const times = new Map([[0, 100], [1, 100], [2, 40], [9, 100], [30, 40]]);
    const result = sameImageMarkers([m(0), m(1), m(2)], [m(9), m(30)], (id) => times.get(id));
    expect(result!.ring.map((x) => x.id)).toEqual([0, 1]);
    expect(result!.faces.map((x) => x.id)).toEqual([9]);
  });
  it('returns null when the prism face comes from an older image than the ring', () => {
    const times = new Map([[0, 100], [9, 47]]);
    expect(sameImageMarkers([m(0)], [m(9)], (id) => times.get(id))).toBeNull();
  });
  it('does not filter markers without image times', () => {
    expect(sameImageMarkers([m(0)], [m(9)], () => undefined)).toEqual({ ring: [m(0)], faces: [m(9)] });
    expect(sameImageMarkers([m(0)], [], () => undefined)).toBeNull();
  });
});
