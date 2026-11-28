import { expect, it } from 'vitest';
import { biteHand, describeBiteHands } from './biteHand';

it('calls right-to-left bites forehand for a right-handed driver', () => {
  expect([biteHand(0.2, -0.2), biteHand(-0.2, 0.2), biteHand(0.2, 0.1)]).toEqual(['forehand', 'backhand', null]);
  expect(describeBiteHands([{ entry: { x: 0.2 }, exit: { x: -0.2 } }, { entry: { x: -0.2 }, exit: { x: 0.2 } }, { entry: { x: 0.2 }, exit: null }])).toBe('Bites: 1 forehand (right to left) · 1 backhand (left to right)');
});

import { describeBiteHands as describeHands } from './biteHand';
it('swaps the on-screen direction words in the mirrored left-handed view', () => {
  const passes = [{ entry: { x: 0.2 }, exit: { x: -0.2 } }];
  expect(describeHands(passes)).toContain('forehand (right to left)');
  expect(describeHands(passes, true)).toContain('forehand (left to right)');
});
