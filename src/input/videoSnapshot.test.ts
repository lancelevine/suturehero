import { expect, it } from 'vitest';
import { frameMatchesVideo } from './videoSnapshot';

it('uses a VideoFrame only when its pixels are laid out like the video (no iOS rotation)', () => {
  expect(frameMatchesVideo({ displayWidth: 1920, displayHeight: 1080 }, 1920, 1080)).toBe(true);
  expect(frameMatchesVideo({ displayWidth: 1920, displayHeight: 1080, rotation: 0 }, 1920, 1080)).toBe(true);
  // iPhone: the video reports the rotated size but the frame keeps the sensor's.
  expect(frameMatchesVideo({ displayWidth: 1920, displayHeight: 1080 }, 1080, 1920)).toBe(false);
  expect(frameMatchesVideo({ displayWidth: 1080, displayHeight: 1920, rotation: 90 }, 1080, 1920)).toBe(false);
});
