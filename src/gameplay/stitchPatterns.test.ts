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

  it('does not pair passes in the same direction at the same spot', () => {
    expect(recognisePatterns([pass(-1, 6, 0), pass(-1, 2, 0)]).map((s) => s.pattern)).toEqual(['simple', 'simple']);
  });

  it('recognises a pulley stitch: far-near then near-far', () => {
    const u2 = (mm: number) => mm / SCENE_MM_PER_UNIT;
    const asym = (zMm: number, entryMm: number, exitMm: number): PatternPass => ({ entry: { x: -u2(entryMm), z: u2(zMm) }, exit: { x: u2(exitMm), z: u2(zMm) }, entryEdge: u2(entryMm), exitEdge: u2(exitMm), depth: u2(3), crossesWound: true });
    const [stitch] = recognisePatterns([asym(0, 8, 3), asym(3, 3, 8)]);
    expect(stitch.pattern).toBe('pulley');
    expect(stitch.checks[0].met).toBe(true);
  });

  it('recognises a figure-of-eight: two same-side passes a few mm apart', () => {
    const [stitch] = recognisePatterns([pass(-1, 5, 0), pass(-1, 5.4, 6)]);
    expect(stitch.pattern).toBe('figure-of-eight');
    expect(stitch.checks.every((c) => c.met)).toBe(true);
  });

  it('recognises a running stitch and checks its spacing', () => {
    const [run] = recognisePatterns([pass(-1, 5, 0), pass(-1, 5, 5), pass(-1, 5.5, 10), pass(-1, 5, 18)]);
    expect(run.pattern).toBe('running');
    expect(run.passes).toEqual([1, 2, 3, 4]);
    expect(run.checks[0].met).toBe(false);
  });

  it('recognises a running subcuticular closure from alternating dermal bites', () => {
    const bite = (fromSide: number, zMm: number): PatternPass => ({ entry: { x: fromSide * u(2), z: u(zMm) }, exit: { x: fromSide * u(1), z: u(zMm + 3) }, entryEdge: u(2), exitEdge: u(1), depth: u(2), crossesWound: false, deepestLayer: 'dermis' });
    // Each bite starts level with the last exit on the other side (2026-11-28 placement check).
    const [run] = recognisePatterns([bite(-1, 0), bite(1, 3), bite(-1, 6)]);
    expect(run.pattern).toBe('running subcuticular');
    expect(run.checks.every((c) => c.met)).toBe(true);
    // Starting each bite 2 mm ahead of the last exit leaves gaps.
    const [gappy] = recognisePatterns([bite(-1, 0), bite(1, 5), bite(-1, 10)]);
    expect(gappy.checks.at(-1)!.label).toContain('ahead (gap)');
    expect(gappy.checks.at(-1)!.met).toBe(false);
  });
});
