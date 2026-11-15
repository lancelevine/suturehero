import * as THREE from 'three';
import { expect, it } from 'vitest';
import { Instrument } from '../instruments/Instrument';
import { FreeKnotPractice } from './FreeKnotPractice';
import type { KnotEngineMode } from '../suture/KnotEngine';

/**
 * Knot locking at different hand speeds and frame rates (2026-11-15). The same
 * motions as test-support/freeTying.ts, with the durations divided by `speed`
 * and stepped at `fps`. Before motion sub-stepping, the wrap came up short
 * (fewer turns around the driver than the forceps made) at 30 fps even at
 * normal speed, and from about 2.5× speed at any frame rate.
 */
async function tie(speed: number, fps: number, throws: Array<[number, number]>, mode: KnotEngineMode = 'legacy') {
  const tools = [new Instrument('left', 0), new Instrument('right', 0)];
  const model = new FreeKnotPractice();
  model.begin(tools, 'auto', mode);
  const [left, right] = tools;
  const advance = () => model.update(1 / fps, tools);
  const segment = async (seconds: number, apply: (t: number) => void) => {
    const frames = Math.max(1, Math.round((seconds / speed) * fps));
    for (let i = 1; i <= frames; i++) {
      apply(i / frames);
      advance();
      if (i % 240 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
    }
  };
  for (let i = 0; i < 2 * fps; i++) advance();
  right.root.position.copy(model.short.points.at(-1)!);
  right.root.position.z -= 0.05;
  advance();
  right.openness = 0.1;
  advance();
  for (const [wraps, direction] of throws) {
    const subsequent = model.sequence!.throws.length > 0;
    if (subsequent) {
      tools.forEach((tool) => (tool.openness = 0.7));
      for (let i = 0; i < fps; i++) advance();
      const starts = tools.map((tool) => tool.root.position.clone());
      await segment(2, (t) => tools.forEach((tool, i) => tool.root.position.copy(starts[i]).lerp((i ? model.short : model.long).points.at(-1)!.clone().sub(new THREE.Vector3(0, 0, 0.05)), t)));
      tools.forEach((tool) => (tool.openness = 0.1));
      advance();
    }
    const leftStart = left.root.position.clone(), rightStart = right.root.position.clone();
    await segment(2, (t) => {
      right.root.position.copy(rightStart).lerp(new THREE.Vector3(0, 1, -0.65), t);
      left.root.position.copy(leftStart).lerp(new THREE.Vector3(-0.5, 1, 0.55), t);
    });
    const base = right.root.position.clone();
    const radius = subsequent ? 0.25 : 0.5, depth = subsequent ? 0.4 : 1.2, turns = wraps + (subsequent ? 0.35 : 0);
    await segment(4 * turns, (t) => {
      const angle = direction * t * turns * Math.PI * 2;
      left.root.position.copy(base).add(new THREE.Vector3(-radius * Math.cos(angle), radius * Math.sin(angle), depth));
    });
    const pullStart = right.root.position.clone();
    await segment(4, (t) => right.root.position.copy(pullStart).add(new THREE.Vector3(0, 0, t * (subsequent ? 0.8 : 1.6))));
    const spreadLeft = left.root.position.clone(), spreadRight = right.root.position.clone();
    // The pull-apart is held for real time (not sped up): a throw needs tension held to tighten.
    await segment(5 * speed, (t) => {
      const k = Math.min(1, t * 2 * speed);
      left.root.position.copy(spreadLeft);
      left.root.position.x -= 2.3 * k;
      right.root.position.copy(spreadRight);
      right.root.position.x += 0.65 * k;
    });
  }
  return model;
}

// Full knot (double throw, then an opposing throw that locks it).
// Known limit: at 30 fps and 1.6× speed both throws form, but the second throw's direction
// is read as the same as the first, so it does not count as a lock (not asserted here).
it.each([
  { speed: 1, fps: 30 },
  { speed: 2, fps: 60 },
  { speed: 2, fps: 120 },
])('locks a surgeon’s knot at $speed× hand speed and $fps fps', async ({ speed, fps }) => {
  const model = await tie(speed, fps, [[2, 1], [1, -1]]);
  expect(model.sequence!.technique, model.instruction).toBe('surgeon');
  expect(model.sequence!.throws, `${model.instruction} · ${model.retainedThrow.phase} · ${model.retainedThrow.lastFailure}`).toHaveLength(2);
  expect(model.sequence!.locked, `${model.instruction} · ${JSON.stringify(model.sequence!.throws)}`).toBe(true);
}, 300000);

it.each([
  { speed: 1, fps: 30 },
  { speed: 1.6, fps: 30 },
  { speed: 2, fps: 60 },
  { speed: 2, fps: 120 },
  { speed: 2.5, fps: 120 },
])('locks the event-ledger surgeon knot at $speed× and $fps FPS', async ({ speed, fps }) => {
  const model = await tie(speed, fps, [[2, 1], [1, -1]], 'event-ledger');
  expect(model.sequence!.throws, `${model.instruction} · ${model.retainedThrow.phase} · ${model.retainedThrow.lastFailure}`).toHaveLength(2);
  expect(model.sequence!.technique, model.instruction).toBe('surgeon');
  expect(model.sequence!.locked, `${model.instruction} · ${JSON.stringify(model.sequence!.throws)}`).toBe(true);
}, 300000);

// At extreme speeds the first (double) throw must still form as wrapped; whether the
// second throw registers there still varies with the frame rate (not asserted).
it.each([
  { speed: 2.5, fps: 60 },
  { speed: 2.5, fps: 120 },
  { speed: 4, fps: 60 },
])('forms the double first throw at $speed× hand speed and $fps fps', async ({ speed, fps }) => {
  const model = await tie(speed, fps, [[2, 1]]);
  expect(model.sequence!.technique, model.instruction).toBe('surgeon');
  expect(model.sequence!.throws[0].wraps).toBe(2);
}, 300000);
