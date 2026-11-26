import { expect, it } from 'vitest';
import { trackingPageMarkup } from './trackingPageMarkup';

it('fills in the build, revision and checkerboard size, and keeps the ids tracking.ts relies on', () => {
  const html = trackingPageMarkup({ build: 'BUILD-X', revision: 'abc123', squareSizeMm: 16 });
  expect(html).toContain('BUILD-X');
  expect(html).toContain('abc123');
  expect(html).toContain('id="stereo-square-size-mm" type="number" min="1" max="100" step="0.1" value="16"');
  for (const id of ['camera-video', 'camera-overlay', 'start-camera', 'stop-camera', 'tracker-type', 'jaw-sensor-controls', 'marker-readout', 'camera-status']) {
    expect(html, id).toContain(`id="${id}"`);
  }
});
