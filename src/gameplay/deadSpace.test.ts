import { describe, expect, it } from 'vitest';
import { TISSUE_LAYERS } from '../tissue/anatomy';
import { deadSpaceBelow, describeDeadSpace, leavesDeadSpace } from './deadSpace';

const toFloor = TISSUE_LAYERS.epidermis.top - TISSUE_LAYERS.dermis.bottom;
const dermis = TISSUE_LAYERS.dermis.top - TISSUE_LAYERS.dermis.bottom;

describe('dead space check', () => {
  it('flags bites that stop well above the dermis floor', () => {
    expect(deadSpaceBelow(toFloor + 0.02)).toBe(0);
    expect(leavesDeadSpace(toFloor - 0.1 * dermis)).toBe(false);
    expect(leavesDeadSpace(toFloor - 0.6 * dermis)).toBe(true);
    expect(describeDeadSpace([toFloor], 10)).toContain('none');
    expect(describeDeadSpace([toFloor, toFloor - 0.6 * dermis], 10)).toMatch(/pass 2 \(/);
    expect(describeDeadSpace([], 10)).toBe('');
  });
});
