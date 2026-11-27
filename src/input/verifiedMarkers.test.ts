import { expect, it } from 'vitest';
import { markerArea, selectVerifiedMarkers } from './verifiedMarkers';

const square = (id: number, size: number) => ({ id, corners: [{ x: 0, y: 0 }, { x: size, y: 0 }, { x: size, y: size }, { x: 0, y: size }] });

it('measures a marker quadrilateral', () => {
  expect(markerArea(square(1, 10).corners)).toBe(100);
});

it('keeps freshly decoded markers, best first, up to the faces a tracker can show', () => {
  const groups = { needleDriver: [0, 1, 2, 3], forceps: [10, 11] };
  const live = [square(0, 10), square(1, 40), square(2, 20), square(3, 30), square(10, 5), square(11, 50)];
  const decoded = new Map([[0, 1000], [1, 1000], [2, 1000], [3, 700], [10, 1000], [11, 1000]]);
  // Marker 3 was decoded 300 ms ago: too old. The prism shows at most two faces per instrument.
  expect(selectVerifiedMarkers(live, groups, 'prism', decoded, 1000, 220).map((m) => m.id)).toEqual([1, 2, 11, 10]);
  expect(selectVerifiedMarkers(live, groups, 'ring8', decoded, 1000, 220).map((m) => m.id)).toEqual([1, 2, 0, 11, 10]);
});
