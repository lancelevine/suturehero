import { expect, it } from 'vitest';
import { MARKER_GROUPS } from './arucoTracking';
import { markerGroupsFor, trackerDescriptionText } from './markerGroups';

it('gives each tracker type its marker IDs, with no ID shared between instruments', () => {
  expect(markerGroupsFor('ring8').forceps).toEqual([10, 11, 12, 13, 14, 15, 16, 17]);
  expect(markerGroupsFor('ring6').scissors).toEqual([20, 21, 22, 23, 24, 25]);
  expect(markerGroupsFor('prism')).toBe(MARKER_GROUPS);
  for (const type of ['prism', 'ring6', 'ring8'] as const) {
    const ids = Object.values(markerGroupsFor(type)).flat();
    expect(new Set(ids).size).toBe(ids.length);
  }
});

it('describes the selected tracker', () => {
  const text = trackerDescriptionText('ring8', { faceCount: 8, sideStepRadians: Math.PI / 4, markerSizeMm: 12 }, markerGroupsFor('ring8'));
  expect(text.status).toBe('8-face ring · 45° side spacing for all instruments · Needle driver IDs 0–7 · Forceps IDs 10–17 · Scissors IDs 20–27');
  expect(text.description).toMatch(/^DICT_4X4_50 · 12 mm marker squares\. .*45° side spacing plus two inclined end faces;/);
  expect(trackerDescriptionText('prism', { faceCount: 3, sideStepRadians: (2 * Math.PI) / 3, markerSizeMm: 12 }, markerGroupsFor('prism')).status).toMatch(/^3-face prism · 120°/);
});
