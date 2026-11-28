import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { tractPoint, type FreeTract } from '../tissue/FreeNeedlePass';
import { FreeThreadGuide } from './FreeThreadGuide';
import { ThreadStrand } from './ThreadStrand';

const tractAt = (z: number): FreeTract => ({ centre: new THREE.Vector3(0, 0.61, z), axis: new THREE.Vector3(0, 0, 1), start: new THREE.Vector3(-0.22, -0.2, 0), exitAngle: 1.6 });
const tract = tractAt(0.2);
const ordered = (pins: Map<number, THREE.Vector3>) => [...pins.keys()].sort((a, b) => a - b);
const pinAt = (pins: Map<number, THREE.Vector3>, point: THREE.Vector3) => ordered(pins).find((k) => pins.get(k)!.distanceTo(point) < 1e-9);

describe('thread through free passes', () => {
  it('only follows the eye before the eye reaches the tissue', () => {
    const pins = new FreeThreadGuide().anchors(new ThreadStrand(), new THREE.Vector3(1, 1, 1), [{ tract, eyeAngle: -0.2 }]);
    expect(ordered(pins)).toEqual([0]);
  });

  it('pins the thread along the path from the eye back to the entry while the eye is inside', () => {
    const strand = new ThreadStrand();
    const pins = new FreeThreadGuide().anchors(strand, tractPoint(tract, 0.8), [{ tract, eyeAngle: 0.8 }]);
    const keys = ordered(pins);
    expect(pins.get(keys.at(-1)!)!.distanceTo(tractPoint(tract, 0))).toBeLessThan(1e-9);
    for (const key of keys.slice(1)) expect(pins.get(key)!.distanceTo(tract.centre)).toBeCloseTo(tract.start.length(), 6);
    expect(pins.get(keys[1])!.distanceTo(pins.get(keys[2])!)).toBeLessThanOrEqual(strand.restLength + 1e-9);
  });

  it('once the eye is out, pins the exit with enough thread for the distance, then the whole path', () => {
    const strand = new ThreadStrand();
    const exit = tractPoint(tract, tract.exitAngle!);
    const eye = exit.clone().add(new THREE.Vector3(0.5, 0.3, 0));
    const pins = new FreeThreadGuide().anchors(strand, eye, [{ tract, eyeAngle: Infinity }]);
    const keys = ordered(pins);
    expect(pinAt(pins, exit)! * strand.restLength).toBeGreaterThanOrEqual(eye.distanceTo(exit));
    expect(pins.get(keys.at(-1)!)!.distanceTo(tractPoint(tract, 0))).toBeLessThan(1e-9);
  });

  it('threads a running stitch through several passes in order, newest first', () => {
    const strand = new ThreadStrand();
    const older = tractAt(-0.3), newer = tractAt(0.2);
    const eye = tractPoint(newer, newer.exitAngle!).add(new THREE.Vector3(0.2, 0.2, 0));
    const pins = new FreeThreadGuide().anchors(strand, eye, [{ tract: newer, eyeAngle: Infinity }, { tract: older, eyeAngle: Infinity }]);
    const order = [tractPoint(newer, newer.exitAngle!), tractPoint(newer, 0), tractPoint(older, older.exitAngle!), tractPoint(older, 0)].map((p) => pinAt(pins, p)!);
    order.forEach((index) => expect(index).toBeDefined());
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    // The loose span between the passes has enough thread for the gap.
    expect((order[2] - order[1]) * strand.restLength).toBeGreaterThanOrEqual(tractPoint(newer, 0).distanceTo(tractPoint(older, older.exitAngle!)));
  });

  it('runs straight from the eye to the previous pass while a new pass has not taken the eye in yet', () => {
    const strand = new ThreadStrand();
    const older = tractAt(-0.3);
    const pins = new FreeThreadGuide().anchors(strand, new THREE.Vector3(0, 1, 0.2), [{ tract: tractAt(0.2), eyeAngle: -0.5 }, { tract: older, eyeAngle: Infinity }]);
    expect(pinAt(pins, tractPoint(older, older.exitAngle!))).toBeDefined();
  });

  it('keeps earlier passes threaded when the needle is pulled far away (the thread goes taut instead)', () => {
    const strand = new ThreadStrand();
    const older = tractAt(-0.3), newer = tractAt(0.2);
    const guide = new FreeThreadGuide();
    // Pull the needle further and further from the newest exit, up to about 25 cm (9 scene units).
    for (let d = 0.2; d <= 9; d += 0.2) {
      const eye = tractPoint(newer, newer.exitAngle!).add(new THREE.Vector3(d, d / 2, 0));
      const pins = guide.anchors(strand, eye, [{ tract: newer, eyeAngle: Infinity }, { tract: older, eyeAngle: Infinity }]);
      expect(pinAt(pins, tractPoint(older, older.exitAngle!))).toBeDefined();
      expect(pinAt(pins, tractPoint(older, 0))).toBeDefined();
      expect(Math.max(...pins.keys())).toBeLessThan(strand.count);
    }
  });

  it('leaves out passes that no longer fit on the strand', () => {
    const strand = new ThreadStrand(0.6, 20);
    const passes = [-1.2, -0.6, 0, 0.6].map((z) => ({ tract: tractAt(z), eyeAngle: Infinity }));
    const pins = new FreeThreadGuide().anchors(strand, new THREE.Vector3(0, 1, 1), passes);
    expect(Math.max(...pins.keys())).toBeLessThan(strand.count);
    expect(pinAt(pins, tractPoint(passes[3].tract, 0))).toBeUndefined();
  });
});

describe('thread drag through the tissue', () => {
  it('slides the thread through at a limited speed, so a fast pull makes it taut; a slow pull does not', async () => {
    const { tractPoint } = await import('../tissue/FreeNeedlePass');
    const tract = { centre: new THREE.Vector3(0, 0.61, 0.2), axis: new THREE.Vector3(0, 0, 1), start: new THREE.Vector3(-0.2, -0.2, 0).normalize().multiplyScalar(0.3), exitAngle: 1.6 };
    const exit = tractPoint(tract, tract.exitAngle);
    const pull = (speed: number) => {
      const strand = new ThreadStrand();
      const guide = new FreeThreadGuide();
      let peak = 0;
      for (let t = 0; t < 1; t += 1 / 60) {
        guide.anchors(strand, exit.clone().add(new THREE.Vector3(0.05 + speed * t, 0.1, 0)), [{ tract, eyeAngle: Infinity }], 1 / 60);
        peak = Math.max(peak, guide.tension);
      }
      return peak;
    };
    expect(pull(0.2)).toBeLessThan(1.35);
    expect(pull(3)).toBeGreaterThan(1.35);
  });
});

describe('tension hold on running stitches', () => {
  it('lets earlier loops go slack while the thread is not held taut, and tightens them when pulled', () => {
    const strand = new ThreadStrand();
    const older = tractAt(-0.3), newer = tractAt(0.2);
    const guide = new FreeThreadGuide();
    const passes = [{ tract: newer, eyeAngle: Infinity }, { tract: older, eyeAngle: Infinity }];
    const exit = tractPoint(newer, newer.exitAngle!);
    // Eye resting near the newest exit with plenty of thread out: not taut.
    guide.anchors(strand, exit.clone().add(new THREE.Vector3(0.6, 0.3, 0)), passes, 0.05);
    for (let i = 0; i < 80; i++) guide.anchors(strand, exit.clone().add(new THREE.Vector3(0.1, 0.05, 0)), passes, 0.05);
    const slack = guide.loopSlackUnits();
    expect(slack).toHaveLength(1);
    expect(slack[0]).toBeGreaterThan(0);
    // Pull the needle steadily away so the thread runs taut: the loop tightens again.
    for (let d = 0.2; d <= 6; d += 0.05) guide.anchors(strand, exit.clone().add(new THREE.Vector3(d, d / 2, 0)), passes, 0.05);
    expect(guide.loopSlackUnits()[0]).toBeLessThan(slack[0]);
  });
});
