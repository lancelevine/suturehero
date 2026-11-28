import { describe, expect, it } from 'vitest';
import { flipBlocker } from './flipCheck';

describe('vessel flip check', () => {
  it('allows a turn only when nothing is through or holding the wall', () => {
    expect(flipBlocker({ needleInWall: false, untiedThread: false, wallHeld: false })).toBeNull();
    expect(flipBlocker({ needleInWall: true, untiedThread: true, wallHeld: true })).toContain('needle');
    expect(flipBlocker({ needleInWall: false, untiedThread: false, wallHeld: true })).toContain('forceps');
    expect(flipBlocker({ needleInWall: false, untiedThread: true, wallHeld: false })).toContain('tie');
  });
});
