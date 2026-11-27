import { expect, it } from 'vitest';
import { STEREO_DOT_COLORS, stereoBlockedReason, stereoIndicator, stereoInstrumentReport } from './stereoIndicator';

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

it('reports each instrument for the triangulation status and the camera-moved monitor', () => {
  const pair = { first: [{ id: 10 }], second: [] };
  expect(stereoInstrumentReport('forceps', { firstIds: [10], secondIds: [11, 12], errorPx: 1.234 }, pair, [10, 11, 12], undefined)).toEqual({ note: 'forceps · Camera 1 IDs 10 / Camera 2 IDs 11,12 · joint error 1.23 px', fitErrorPx: 1.234 });
  expect(stereoInstrumentReport('forceps', null, pair, [10, 11], 'fit error 6.5 px')).toEqual({ note: 'forceps · stereo not used: fit error 6.5 px', fitErrorPx: 6.5 });
  expect(stereoInstrumentReport('scissors', null, pair, [20], 'too few faces')).toEqual({ note: null, fitErrorPx: null });
  expect(stereoInstrumentReport('forceps', null, null, [10], 'x')).toEqual({ note: null, fitErrorPx: null });
});

it('describes shared stereo markers and the frame offset', async () => {
  const { stereoMatchText } = await import('./stereoIndicator');
  expect(stereoMatchText(null, [], [])).toBe('Stereo matching: waiting for both camera detections.');
  expect(stereoMatchText(12.4, [1, 2, 3], [3, 1])).toBe('Stereo: shared marker IDs 1, 3 · frame offset 12 ms · calibration required for 3D');
  expect(stereoMatchText(300, [1], [2])).toBe('Stereo: frames not synchronized · no shared marker IDs · frame offset 300 ms · calibration required for 3D');
});
