import { expect, it } from 'vitest';
import { STEREO_CONTINUITY_MS, StereoPoseMemory } from './stereoPoseMemory';

it('reuses the fit for the same frame pair and calibration only', () => {
  const memory = new StereoPoseMemory<string, string, object>();
  const calibration = {};
  expect(memory.cached('forceps', 'pair-1', calibration)).toBeUndefined();
  memory.remember('forceps', 'pair-1', calibration, null, 1000);
  expect(memory.cached('forceps', 'pair-1', calibration)).toBeNull();
  expect(memory.cached('forceps', 'pair-2', calibration)).toBeUndefined();
  expect(memory.cached('forceps', 'pair-1', {})).toBeUndefined();
});

it('seeds the next fit with the last accepted pose while it is recent', () => {
  const memory = new StereoPoseMemory<string, string, object>();
  const calibration = {};
  memory.remember('forceps', 'a', calibration, 'good', 1000);
  expect(memory.seed('forceps', 1100)).toBe('good');
  memory.remember('forceps', 'b', calibration, null, 1100);
  expect(memory.seed('forceps', 1000 + STEREO_CONTINUITY_MS - 1)).toBe('good');
  expect(memory.seed('forceps', 1000 + STEREO_CONTINUITY_MS)).toBeUndefined();
  // A new calibration forgets the last accepted pose.
  memory.remember('forceps', 'c', {}, null, 1200);
  expect(memory.seed('forceps', 1201)).toBeUndefined();
});
