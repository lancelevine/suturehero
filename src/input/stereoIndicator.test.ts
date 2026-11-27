import { expect, it } from 'vitest';
import { STEREO_DOT_COLORS, stereoBlockedReason, stereoIndicator } from './stereoIndicator';

const base = { configured: true, fallback: [] as Array<[string, string]>, fresh: [] as string[], mismatch: null as string | null, monoStreaming: false };

it('reports active, waiting, fallback, mismatch, mono and off', () => {
  expect(stereoIndicator({ ...base, fresh: ['needleDriver'] })).toEqual({ color: STEREO_DOT_COLORS.good, label: 'Stereo triangulation: ACTIVE · needleDriver', state: 'active' });
  expect(stereoIndicator(base)).toEqual({ color: STEREO_DOT_COLORS.warning, label: 'Stereo triangulation: waiting for valid markers', state: 'waiting' });
  expect(stereoIndicator({ ...base, fresh: ['forceps'], fallback: [['needleDriver', 'camera2']] })).toEqual({ color: STEREO_DOT_COLORS.warning, label: 'Stereo fallback: needleDriver · Camera 2 · approximate depth', state: 'fallback' });
  expect(stereoIndicator({ ...base, fresh: ['forceps'], mismatch: 'resolution' })).toEqual({ color: STEREO_DOT_COLORS.warning, label: 'Stereo triangulation: calibration mismatch · resolution', state: 'mismatch' });
  expect(stereoIndicator({ ...base, configured: false, monoStreaming: true })).toEqual({ color: STEREO_DOT_COLORS.off, label: 'Stereo triangulation: off', state: 'mono' });
  expect(stereoIndicator({ ...base, configured: false })).toMatchObject({ state: 'off' });
});

it('explains why triangulation cannot run yet, checking the calibration last', () => {
  const ready = { calibrated: true, stereoMode: true, simulated: false, mismatch: () => null };
  expect(stereoBlockedReason({ ...ready, calibrated: false, mismatch: () => { throw new Error('not checked'); } })).toBe('Import a solved calibration JSON first.');
  expect(stereoBlockedReason({ ...ready, stereoMode: false })).toBe('Select 2 cameras in Tracking mode.');
  expect(stereoBlockedReason({ ...ready, simulated: true })).toBe('Disable simulated input for live triangulation.');
  expect(stereoBlockedReason({ ...ready, mismatch: () => 'camera 2 is 640×480' })).toBe('Stereo inactive: camera 2 is 640×480');
  expect(stereoBlockedReason(ready)).toBeNull();
});
