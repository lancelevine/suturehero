import { expect, it } from 'vitest';
import { depthLockState } from './trackingControls';

it('shows the depth lock as on, off or mixed', () => {
  expect(depthLockState([true, true, true])).toEqual({ checked: true, indeterminate: false });
  expect(depthLockState([false, false, false])).toEqual({ checked: false, indeterminate: false });
  expect(depthLockState([true, false, false])).toEqual({ checked: false, indeterminate: true });
});
