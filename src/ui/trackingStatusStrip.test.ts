import { expect, it } from 'vitest';
import { healthInput, type InstrumentState, type TrackingState } from './trackingStatusStrip';

const instrument = (overrides: Partial<InstrumentState> = {}): InstrumentState => ({ lastSeen: 900, neutralSaved: true, depthSource: 'marker size', markerSidePx: 30, stereoRejection: 'fit error 4 px', tipCalibrated: true, ...overrides });
const state = (overrides: Partial<TrackingState> = {}): TrackingState => ({
  stereoMode: false, camera1Running: true, camera2Running: false, stereoCalibrated: false, calibrationMismatch: null,
  pairingFailure: 'no pair', workspaceSet: true, tableSet: false,
  instruments: { needleDriver: instrument(), forceps: instrument({ lastSeen: undefined, depthSource: 'pose · depth held' }), scissors: instrument() },
  ...overrides,
});

it('reports single-camera health without stereo details', () => {
  const health = healthInput(state(), 1000);
  expect(health.stereoCalibrationProblem).toBe('No stereo calibration loaded');
  expect(health.pairingFailure).toBeNull();
  expect(health.workspaceSet).toBeUndefined();
  expect(health.instruments.map((i) => [i.label, i.lastSeenAgoMs, i.depthHeld, i.stereoRejection, i.tipCalibrated])).toEqual([
    ['Needle driver', 100, false, null, undefined],
    ['Forceps', null, true, null, undefined],
    ['Scissors', 100, false, null, undefined],
  ]);
});

it('adds the stereo setup steps once a stereo calibration is loaded', () => {
  const health = healthInput(state({ stereoMode: true, stereoCalibrated: true, calibrationMismatch: 'resolution differs' }), 1000);
  expect(health.stereoCalibrationProblem).toBe('resolution differs');
  expect(health.pairingFailure).toBe('no pair');
  expect([health.workspaceSet, health.tableSet]).toEqual([true, false]);
  expect(health.instruments.map((i) => [i.depthHeld, i.stereoRejection, i.tipCalibrated])).toEqual([
    [false, 'fit error 4 px', true],
    [false, 'fit error 4 px', true],
    [false, 'fit error 4 px', undefined],
  ]);
});

it('reports no instrument as seen while camera 1 is off', () => {
  expect(healthInput(state({ camera1Running: false }), 1000).instruments[0].lastSeenAgoMs).toBeNull();
});
