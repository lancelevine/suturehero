import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { tractPoint, type FreeTract } from '../tissue/FreeNeedlePass';
import { FreeThreadGuide } from './FreeThreadGuide';
import { ThreadStrand } from './ThreadStrand';

const tract: FreeTract = { centre: new THREE.Vector3(0, 0.61, 0.2), axis: new THREE.Vector3(0, 0, 1), start: new THREE.Vector3(-0.22, -0.2, 0), exitAngle: 1.6 };
const ordered = (pins: Map<number, THREE.Vector3>) => [...pins.keys()].sort((a, b) => a - b);

describe('thread through a free pass', () => {
  it('only follows the eye before the eye reaches the tissue', () => {
    const pins = new FreeThreadGuide().anchors(new ThreadStrand(), new THREE.Vector3(1, 1, 1), tract, -0.2);
    expect(ordered(pins)).toEqual([0]);
  });

  it('pins the thread along the path from the eye back to the entry while the eye is inside', () => {
    const strand = new ThreadStrand();
    const pins = new FreeThreadGuide().anchors(strand, tractPoint(tract, 0.8), tract, 0.8);
    const keys = ordered(pins);
    expect(pins.get(keys.at(-1)!)!.distanceTo(tractPoint(tract, 0))).toBeLessThan(1e-9);
    for (const key of keys.slice(1)) expect(pins.get(key)!.distanceTo(tract.centre)).toBeCloseTo(tract.start.length(), 6);
    // Neighbouring pins are no further apart than one strand segment.
    expect(pins.get(keys[1])!.distanceTo(pins.get(keys[2])!)).toBeLessThanOrEqual(strand.restLength + 1e-9);
  });

  it('once the eye is out, pins the exit with enough thread for the distance, then the whole path', () => {
    const strand = new ThreadStrand();
    const guide = new FreeThreadGuide();
    const exit = tractPoint(tract, tract.exitAngle!);
    const eye = exit.clone().add(new THREE.Vector3(0.5, 0.3, 0));
    const pins = guide.anchors(strand, eye, tract, Infinity);
    const keys = ordered(pins);
    const exitIndex = keys.find((k) => k > 0 && pins.get(k)!.distanceTo(exit) < 1e-9)!;
    expect(exitIndex * strand.restLength).toBeGreaterThanOrEqual(eye.distanceTo(exit));
    expect(pins.get(keys.at(-1)!)!.distanceTo(tractPoint(tract, 0))).toBeLessThan(1e-9);
    expect(keys.at(-1)!).toBeLessThan(strand.count);
  });
});
