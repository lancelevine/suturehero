import { expect, it } from 'vitest';
import { MIN_SWEEP_SAMPLES, sweepCalibration } from './hallCalibrationSweep';

/** Held closed, then `cycles` open/close cycles, with a little noise and one spike. */
const sweep = (closed: number, open: number, cycles = 3, count = 500) => {
  const samples: number[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const opening = t < 0.2 ? 0 : 0.5 - 0.5 * Math.cos(((t - 0.2) / 0.8) * cycles * 2 * Math.PI);
    samples.push(closed + (open - closed) * opening + ((i * 37) % 7) - 3);
  }
  samples[250] = 4095;
  return samples;
};

it('finds closed and open from a sweep, either magnet direction', () => {
  const up = sweepCalibration(sweep(1900, 2700), 40);
  expect(up.ok && Math.abs(up.calibration.closed - 1900) <= 5 && Math.abs(up.calibration.open - 2700) <= 15).toBe(true);
  const down = sweepCalibration(sweep(2600, 1800), 40);
  expect(down.ok && Math.abs(down.calibration.closed - 2600) <= 5 && Math.abs(down.calibration.open - 1800) <= 15).toBe(true);
});

it('rejects a sweep that barely moved, or one that is too short', () => {
  const flat = sweepCalibration(sweep(1900, 1920), 40);
  expect(flat.ok).toBe(false);
  expect(!flat.ok && flat.reason).toMatch(/barely changed/);
  expect(sweepCalibration(sweep(1900, 2700).slice(0, MIN_SWEEP_SAMPLES - 1), 40).ok).toBe(false);
});
