import { describe, expect, it } from 'vitest';
import { SCENE_MM_PER_UNIT } from '../setup/sceneScale';
import { placementCheck, placementOffsets } from './subcuticularPlacement';

const mm = (v: number) => v / SCENE_MM_PER_UNIT;
const bite = (entry: number, exit: number) => ({ entry: { z: mm(entry) }, exit: { z: mm(exit) } });

describe('subcuticular bite placement', () => {
  it('measures each entry against the last exit along the direction of travel', () => {
    const good = [bite(0, 4), bite(3.5, 8), bite(7.6, 12)];
    expect(placementOffsets(good).map((o) => Math.round(o * 10) / 10)).toEqual([-0.5, -0.4]);
    expect(placementCheck(good).met).toBe(true);
    expect(placementCheck([bite(0, 4), bite(6, 10)]).label).toContain('ahead (gap)');
    expect(placementCheck([bite(0, 4), bite(1, 5), bite(9, 12)]).label).toContain('zig-zag');
  });
});
