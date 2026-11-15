import { describe, expect, it } from 'vitest';
import { isIphone, isSwitchingLens, orientationNote, preferredIphoneCamera } from './iphoneCamera';

const cameras = [
  { deviceId: 'front', label: 'Front Camera' },
  { deviceId: 'dual', label: 'Back Dual Wide Camera' },
  { deviceId: 'ultra', label: 'Back Ultra Wide Camera' },
  { deviceId: 'main', label: 'Back Camera' },
];

describe('iPhone camera mode', () => {
  it('recognizes iPhones and lens-switching cameras', () => {
    expect(isIphone('Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X)')).toBe(true);
    expect(isIphone('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe(false);
    expect(isSwitchingLens('Back Dual Wide Camera')).toBe(true);
    expect(isSwitchingLens('Back Triple Camera')).toBe(true);
    expect(isSwitchingLens('Back Camera')).toBe(false);
  });

  it('swaps a lens-switching camera for the single main rear camera, and keeps a good choice', () => {
    expect(preferredIphoneCamera('Back Dual Wide Camera', cameras)?.deviceId).toBe('main');
    expect(preferredIphoneCamera('', cameras)?.deviceId).toBe('main');
    expect(preferredIphoneCamera('Back Camera', cameras)).toBeNull();
    expect(preferredIphoneCamera('Back Dual Wide Camera', cameras.filter((c) => c.deviceId !== 'main'))).toBeNull();
  });

  it('asks for landscape when the image is portrait', () => {
    expect(orientationNote(1080, 1920)).toMatch(/landscape/);
    expect(orientationNote(1920, 1080)).toBeNull();
  });
});
