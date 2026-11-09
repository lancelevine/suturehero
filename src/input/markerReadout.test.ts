import { expect, it } from 'vitest';
import { MARKER_READOUT_DECODED_MS, markerReadoutText } from './markerReadout';

it('lists recently decoded markers in order and drops flow-only outlines', () => {
  const decoded = new Map([[5, 1000], [3, 900], [2, 1000 - MARKER_READOUT_DECODED_MS - 1]]);
  expect(markerReadoutText([5, 3, 2, 7], decoded, 1000)).toBe('3, 5');
});

it('says when nothing is visible', () => {
  expect(markerReadoutText([], new Map(), 0)).toBe('None visible');
  expect(markerReadoutText([4], new Map(), 0)).toBe('None visible');
});
