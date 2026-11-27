import { describe, expect, it } from 'vitest';
import { SCENE_MM_PER_UNIT } from '../setup/sceneScale';
import { describePatterns, recognisePatterns, type PatternPass } from './stitchPatterns';

const u = (mm: number) => mm / SCENE_MM_PER_UNIT;
/** A pass crossing the wound from `fromSide` (−1 left, +1 right), `biteMm` each side, at `zMm`. */
const pass = (fromSide: number, biteMm: number, zMm: number, depthMm = 3): PatternPass => ({
  entry: { x: fromSide * u(biteMm), z: u(zMm) },
  exit: { x: -fromSide * u(biteMm), z: u(zMm) },
  entryEdge: u(biteMm),
  exitEdge: u(biteMm),
  depth: u(depthMm),
  crossesWound: true,
});

describe('stitch pattern recognition', () => {
  it('recognises a vertical mattress and grades it', () => {
    const [stitch] = recognisePatterns([pass(-1, 6, 0, 5), pass(1, 2, 0.5, 2)]);
    expect(stitch.pattern).toBe('vertical mattress');
    expect(stitch.checks.every((c) => c.met)).toBe(true);
  });

  it('recognises a horizontal mattress and keeps other passes simple', () => {
    const stitches = recognisePatterns([pass(-1, 5, 0), pass(1, 5.5, 6), pass(-1, 5, 20)]);
    expect(stitches.map((s) => s.pattern)).toEqual(['horizontal mattress', 'simple']);
    expect(describePatterns(stitches)).toMatch(/^Stitch patterns: 1 simple · horizontal mattress \(passes 1\+2: ✓ bites match/);
  });

  it('does not pair passes in the same direction', () => {
    expect(recognisePatterns([pass(-1, 6, 0), pass(-1, 2, 0)]).map((s) => s.pattern)).toEqual(['simple', 'simple']);
  });
});
