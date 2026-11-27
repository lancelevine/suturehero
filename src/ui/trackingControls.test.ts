import { expect, it } from 'vitest';
import { depthLockState, trackingModeDescription } from './trackingControls';

it('shows the depth lock as on, off or mixed', () => {
  expect(depthLockState([true, true, true])).toEqual({ checked: true, indeterminate: false });
  expect(depthLockState([false, false, false])).toEqual({ checked: false, indeterminate: false });
  expect(depthLockState([true, false, false])).toEqual({ checked: false, indeterminate: true });
});

it('describes the tracking modes', () => {
  expect(trackingModeDescription('mono')).toMatch(/^1 camera/);
  expect(trackingModeDescription('stereo')).toMatch(/^2 cameras/);
});
