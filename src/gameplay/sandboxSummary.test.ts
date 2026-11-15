import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { FreePassRecord } from '../tissue/FreeNeedlePass';
import { appendProgress, checkTargets, DEFAULT_TARGETS, describeSpacing, describeTrend, loadProgress, loadTargets, saveTargets, summarizeSandbox } from './sandboxSummary';

const tract = { centre: new THREE.Vector3(), axis: new THREE.Vector3(0, 0, 1), start: new THREE.Vector3(-0.3, 0, 0), exitAngle: 1 };
const pass = (entryMm: number, exitMm: number, angle = 80, extra: Partial<FreePassRecord> = {}): FreePassRecord => ({
  entry: new THREE.Vector3(-entryMm / 27, 0.41, 0), exit: new THREE.Vector3(exitMm / 27, 0.41, 0), entryEdge: entryMm / 27, exitEdge: exitMm / 27, entryAngleDeg: angle,
  depth: 4 / 27, deepestLayer: 'dermis', crossesWound: true, tract, ...extra,
});
const memory = () => {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
};

describe('sandbox summary', () => {
  it('summarizes passes, tears and stitches in mm', () => {
    const s = summarizeSandbox([pass(6, 5), pass(5, 6)], [pass(3, 3, 50, { torn: true }), pass(5, 5, 80, { torn: true, cutThrough: true })],
      [{ siteZ: 0.5, review: ['Knot: secure · x'] }, { siteZ: 0, review: ['Knot: may slip'] }, { siteZ: 0.25, review: [] }], 'now');
    expect(s.passes).toBe(2);
    expect(s.tears).toBe(1);
    expect(s.cutThroughs).toBe(1);
    expect(s.meanBiteMm).toBeCloseTo(5.5, 9);
    expect(s.worstAsymmetryMm).toBeCloseTo(1, 9);
    expect(s.meanDepthMm).toBeCloseTo(4, 9);
    expect(s.secureKnots).toBe(1);
    expect(s.spacingMm.map((g) => +g.toFixed(2))).toEqual([6.75, 6.75]);
    expect(describeSpacing(s.spacingMm)).toBe('Even spacing · 6.8 mm / 6.8 mm');
  });

  it('checks instructor targets', () => {
    const good = summarizeSandbox([pass(6, 5)], [], [{ siteZ: 0, review: [] }, { siteZ: 0.25, review: [] }, { siteZ: 0.5, review: [] }]);
    expect(checkTargets(good, DEFAULT_TARGETS).every((r) => r.met)).toBe(true);
    const poor = summarizeSandbox([pass(2, 9, 45)], [pass(1, 1, 30, { torn: true })], []);
    const results = checkTargets(poor, DEFAULT_TARGETS);
    expect(results.filter((r) => r.met === false).map((r) => r.label.split(' ')[0])).toEqual(['Symmetric', 'Entry', 'Tears']);
    expect(results.find((r) => r.label.startsWith('Even'))!.met).toBeNull();
  });

  it('saves targets and progress, and describes the trend', () => {
    const storage = memory();
    saveTargets(storage, { ...DEFAULT_TARGETS, biteMaxMm: 10 });
    expect(loadTargets(storage).biteMaxMm).toBe(10);
    expect(loadTargets(null)).toEqual(DEFAULT_TARGETS);
    appendProgress(storage, summarizeSandbox([pass(2, 9, 45)], [pass(1, 1, 30, { torn: true })], [], 'a'));
    const history = appendProgress(storage, summarizeSandbox([pass(6, 5)], [], [], 'b'));
    expect(loadProgress(storage).map((s) => s.at)).toEqual(['a', 'b']);
    expect(describeTrend(history, DEFAULT_TARGETS)).toMatch(/Last 2 sessions · targets met 1 → 4 · tears 1 → 0/);
  });
});
