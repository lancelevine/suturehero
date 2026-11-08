import { expect, it } from 'vitest';
import { frameDrivenEnabled, parseFrameDrivenSetting } from './captureScheduling';

it('is frame-driven for OV9281 cameras by default, never without requestVideoFrameCallback', () => {
  expect(frameDrivenEnabled('auto', 'ov9281', true)).toBe(true);
  expect(frameDrivenEnabled('auto', 'webcam1080', true)).toBe(false);
  expect(frameDrivenEnabled('on', 'webcam1080', true)).toBe(true);
  expect(frameDrivenEnabled('off', 'ov9281', true)).toBe(false);
  expect(frameDrivenEnabled('on', 'ov9281', false)).toBe(false);
  expect(parseFrameDrivenSetting('nonsense')).toBe('auto');
});
