import { expect, it } from 'vitest';
import { hallCalibration, MIN_CALIBRATION_SPAN, parseHallSettings } from './HallSensorPanel';

it('defaults missing or invalid saved settings', () => {
  expect(parseHallSettings(undefined)).toEqual({ instrument: 'needleDriver', closed: null, open: null });
  expect(parseHallSettings({ instrument: 'tweezers', closed: 'x', open: 2100 })).toEqual({ instrument: 'needleDriver', closed: null, open: 2100 });
  expect(parseHallSettings({ instrument: 'forceps', closed: 1900, open: 2600 })).toEqual({ instrument: 'forceps', closed: 1900, open: 2600 });
});

it('accepts a calibration only when closed and open are far enough apart, in either direction', () => {
  expect(hallCalibration({ instrument: 'needleDriver', closed: 1900, open: null })).toBeNull();
  expect(hallCalibration({ instrument: 'needleDriver', closed: 1900, open: 1900 + MIN_CALIBRATION_SPAN - 1 })).toBeNull();
  expect(hallCalibration({ instrument: 'needleDriver', closed: 2600, open: 1900 })).toEqual({ closed: 2600, open: 1900 });
});
