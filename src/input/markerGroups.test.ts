import { expect, it } from 'vitest';
import { MARKER_GROUPS } from './arucoTracking';
import { markerGroupsFor } from './markerGroups';

it('gives each tracker type its marker IDs, with no ID shared between instruments', () => {
  expect(markerGroupsFor('ring8').forceps).toEqual([10, 11, 12, 13, 14, 15, 16, 17]);
  expect(markerGroupsFor('ring6').scissors).toEqual([20, 21, 22, 23, 24, 25]);
  expect(markerGroupsFor('prism')).toBe(MARKER_GROUPS);
  for (const type of ['prism', 'ring6', 'ring8'] as const) {
    const ids = Object.values(markerGroupsFor(type)).flat();
    expect(new Set(ids).size).toBe(ids.length);
  }
});
