import { expect, it } from 'vitest';
import { duplicateInstruments, hallCalibration, MIN_CALIBRATION_SPAN, parseAllHallSettings, parseHallSettings } from './HallSensorPanel';

it('defaults missing or invalid saved settings', () => {
  expect(parseHallSettings(undefined)).toEqual({ instrument: 'needleDriver', closed: null, open: null });
  expect(parseHallSettings({ instrument: 'tweezers', closed: 'x', open: 2100 })).toEqual({ instrument: 'needleDriver', closed: null, open: 2100 });
  expect(parseHallSettings({ instrument: 'forceps', closed: 1900, open: 2600 })).toEqual({ instrument: 'forceps', closed: 1900, open: 2600 });
});

it('reads two slots, defaulting to needle driver then forceps', () => {
  expect(parseAllHallSettings(undefined, undefined)).toEqual([
    { instrument: 'needleDriver', closed: null, open: null },
    { instrument: 'forceps', closed: null, open: null },
  ]);
  const saved = { sensors: [{ instrument: 'forceps', closed: 1, open: 900 }, { instrument: 'scissors', closed: 5, open: 800 }] };
  expect(parseAllHallSettings(saved, { instrument: 'needleDriver', closed: 2, open: 3 })).toEqual([
    { instrument: 'forceps', closed: 1, open: 900 },
    { instrument: 'scissors', closed: 5, open: 800 },
  ]);
});

it('migrates the single-sensor settings of build 0.204 into the first slot', () => {
  expect(parseAllHallSettings(undefined, { instrument: 'needleDriver', closed: 1900, open: 2700 })).toEqual([
    { instrument: 'needleDriver', closed: 1900, open: 2700 },
    { instrument: 'forceps', closed: null, open: null },
  ]);
});

it('accepts a calibration only when closed and open are far enough apart, in either direction', () => {
  expect(hallCalibration({ instrument: 'needleDriver', closed: 1900, open: null })).toBeNull();
  expect(hallCalibration({ instrument: 'needleDriver', closed: 1900, open: 1900 + MIN_CALIBRATION_SPAN - 1 })).toBeNull();
  expect(hallCalibration({ instrument: 'needleDriver', closed: 2600, open: 1900 })).toEqual({ closed: 2600, open: 1900 });
});

it('flags two sensors on the same instrument', () => {
  const slot = (instrument: 'needleDriver' | 'forceps') => ({ instrument, closed: null, open: null });
  expect(duplicateInstruments([slot('needleDriver'), slot('forceps')])).toEqual([]);
  expect(duplicateInstruments([slot('forceps'), slot('forceps')])).toEqual(['forceps']);
});

it('remembers the board id per slot, ignoring invalid ids', () => {
  expect(parseHallSettings({ instrument: 'forceps', closed: 1, open: 900, deviceId: 'abc' }).deviceId).toBe('abc');
  expect(parseHallSettings({ instrument: 'forceps', deviceId: 7 }).deviceId).toBeUndefined();
  expect(parseHallSettings({ instrument: 'forceps', deviceId: '' }).deviceId).toBeUndefined();
});
