import * as THREE from 'three';
import { Instrument } from '../../instruments/Instrument';
import type { KnotEngine } from '../../knot/engines';

/**
 * Knot locking at different hand speeds and frame rates (2026-11-15). The same
 * motions as test-support/freeTying.ts, with the durations divided by `speed`
 * and stepped at `fps`. Before motion sub-stepping, the wrap came up short
 * (fewer turns around the driver than the forceps made) at 30 fps even at
 * normal speed, and from about 2.5× speed at any frame rate.
 */
/** Longest wait for a throw to be recorded before the next one (s). */
const RECORD_WAIT_S = 8;

/** Trial options: tracking-like jitter on the instrument positions (scene units, ≈ 27 mm each). */
export interface TrialOptions {
  /** Size of a smooth random wobble added to both instruments every frame (0 = none). */
  jitter?: number;
  /** Seed for the jitter. */
  seed?: number;
}

export async function tieKnot(model: KnotEngine, speed: number, fps: number, throws: Array<[number, number]>, options: TrialOptions = {}) {
  const tools = [new Instrument('left', 0), new Instrument('right', 0)];
  model.begin(tools, 'auto');
  const [left, right] = tools;
  // Tracking-like jitter: a smooth random wobble added for the update and removed after it,
  // so it disturbs what the knot model sees without drifting the scripted motion.
  let seed = options.seed ?? 1;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296) * 2 - 1;
  const wobble = tools.map(() => new THREE.Vector3());
  const advance = () => {
    const jitter = options.jitter ?? 0;
    if (jitter > 0) tools.forEach((tool, i) => {
      wobble[i].multiplyScalar(0.7).add(new THREE.Vector3(random(), random(), random()).multiplyScalar(jitter * 0.3));
      tool.root.position.add(wobble[i]);
    });
    model.update(1 / fps, tools);
    if (jitter > 0) tools.forEach((tool, i) => tool.root.position.sub(wobble[i]));
  };
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
  let thrown = 0;
  for (const [wraps, direction] of throws) {
    // Wait (up to RECORD_WAIT_S) for the previous throw to be recorded before the next one: the model
    // records a throw shortly after the pull-apart, and engines in a worker report it a frame or two late.
    for (let i = 0; i < RECORD_WAIT_S * fps && model.sequence!.throws.length < thrown; i++) advance();
    const subsequent = model.sequence!.throws.length > 0;
    thrown++;
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
  // Give the last throw the same chance to be recorded.
  for (let i = 0; i < RECORD_WAIT_S * fps && model.sequence!.throws.length < thrown; i++) advance();
  return model;
}

