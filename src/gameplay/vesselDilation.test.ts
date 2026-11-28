import { expect, it } from 'vitest';
import { describeDilation, dilateStep, dilationState } from './vesselDilation';

it('grades dilation and tears the intima when overdone', () => {
  expect(dilationState(1, false)).toBe('not dilated');
  let state = { dilation: 1, torn: false };
  for (let i = 0; i < 4; i++) state = dilateStep(state.dilation, state.torn);
  expect(dilationState(state.dilation, state.torn)).toBe('dilated');
  expect(describeDilation(state.dilation, state.torn)).toBe('Dilated 120% ✓ · lumen open');
  for (let i = 0; i < 4; i++) state = dilateStep(state.dilation, state.torn);
  expect(state.torn).toBe(true);
  expect(describeDilation(state.dilation, state.torn)).toMatch(/^Intima torn/);
});
