import * as THREE from 'three';
import type { KnotEngine } from '../knot/engines';
import type { Instrument } from '../instruments/Instrument';
import { ease, type Segment } from './choreography';

/**
 * Instrument tie by real thread physics for the demo (2026-11-15): the same
 * hand motions the free-tying unit tests use (src/gameplay/test-support/
 * freeTying.ts), timed for viewing. The forceps hold the long strand and wrap
 * it around the needle driver; the driver grasps the short tail and pulls it
 * through; both ends are pulled apart; then an opposing single throw locks a
 * surgeon's knot, which is lowered and tightened onto the skin.
 */

/** Jaw tip offset from the instrument root (scene units), as used for grasping. */
const TIP = new THREE.Vector3(0, 0, 0.05);
const CLOSED = 0.1;
const OPEN = 0.7;
/**
 * Seconds per full wrap. 2.5 s locks since the thread takes extra physics steps while it is
 * wound on the driver (FreeKnotPractice MAX_PIN_MOVE_PER_STEP, build 0.191); before that it
 * needed 3.2 s. Checked in freeKnotDemo.test.ts.
 */
/** Share of the tightening spent pulling; the rest holds the tension so the throw seats on the skin. */
const TIGHTEN_PULL_SHARE = 0.7;
const SECONDS_PER_WRAP = 2.5;

type Tools = { left: Instrument; right: Instrument };

/** Moves a tool toward a target that may itself move (a loose thread end), arriving at it at the end. */
const moveTo = (tool: Instrument, target: () => THREE.Vector3, seconds: number, caption?: string): Segment => {
  let from = new THREE.Vector3();
  return {
    caption,
    seconds,
    start: () => {
      from = tool.root.position.clone();
    },
    apply: (t) => tool.root.position.copy(from).lerp(target(), ease(t)),
  };
};

const jaws = (tool: Instrument, openness: number, seconds = 0.3, caption?: string): Segment => ({
  caption,
  seconds,
  apply: (t) => {
    if (t >= 1) tool.openness = openness;
  },
});

const pause = (seconds: number, caption?: string): Segment => ({ caption, seconds });

/** Longest a grip attempt may take (s) before the demo moves on. */
const GRIP_TIMEOUT_S = 4;
/** Reach speed toward a thread end (scene units/s, ≈ 40 mm/s) and the closing distance (≈ 0.8 mm). */
const REACH_SPEED = 1.5;
const CLOSE_WITHIN = 0.03;
/** Frames the jaws stay open between grip attempts, so the next close counts as a new grasp. */
const REOPEN_FRAMES = 3;
/** Frames to wait after closing before judging the grip (a knot engine in a worker reports it late). */
const GRIP_CONFIRM_FRAMES = 8;

/**
 * Reaches for a thread end that may be moving, closes on it, and retries
 * (reopen, close) until the grip takes: robust to frame timing in the browser.
 */
function gripEnd(tool: Instrument, end: () => THREE.Vector3, gripped: () => boolean, caption?: string): Segment {
  let last = 0;
  let reopen = 0;
  let closedFor = 0;
  return {
    caption,
    seconds: GRIP_TIMEOUT_S,
    start: () => {
      last = 0;
      reopen = 0;
      closedFor = 0;
    },
    apply: (t) => {
      const now = t * GRIP_TIMEOUT_S;
      const dt = Math.max(0, now - last);
      last = now;
      const target = end().sub(TIP);
      const step = target.clone().sub(tool.root.position);
      tool.root.position.add(step.clampLength(0, REACH_SPEED * dt));
      if (gripped() && tool.openness <= CLOSED) return;
      if (reopen > 0) {
        reopen--;
        tool.openness = OPEN;
        closedFor = 0;
      } else if (step.length() < CLOSE_WITHIN) {
        if (tool.openness > CLOSED) tool.openness = CLOSED;
        // Closed but not (yet) reported as gripping: give the report time, then retry.
        else if (++closedFor > GRIP_CONFIRM_FRAMES) reopen = REOPEN_FRAMES;
      }
    },
    done: () => gripped() && tool.openness <= CLOSED,
  };
}

/** Both tools to the ends of the thread: forceps the long strand, driver the short tail. */
function regraspEnds(model: KnotEngine, { left, right }: Tools): Segment[] {
  // Look the strands up each frame: FreeKnotPractice.begin replaces them when tying starts.
  const end = (strand: () => { points: THREE.Vector3[] }) => () => strand().points.at(-1)!.clone();
  return [
    jaws(left, OPEN),
    jaws(right, OPEN, 0.4),
    // Let the released thread settle before reaching for its ends.
    pause(0.5),
    { ...moveTo(left, () => end(() => model.long)().sub(TIP), 1.2), caption: 'Regrasp both ends of the thread' },
    // Close as soon as each jaw arrives: a loose end drifts while the other hand moves.
    jaws(left, CLOSED),
    // If a grip did not take (frame timing), reach again and retry.
    gripEnd(left, end(() => model.long), () => model.gripLabel('left') === 'long strand'),
    moveTo(right, () => end(() => model.short)().sub(TIP), 1.2),
    jaws(right, CLOSED, 0.4),
    gripEnd(right, end(() => model.short), () => model.gripLabel('right') === 'short tail'),
  ];
}

/** One throw: position, wrap the long strand around the driver, pull the tail through, pull the ends apart. */
function throwSegments(model: KnotEngine, { left, right }: Tools, wraps: number, direction: number, first: boolean, title?: string): Segment[] {
  const base = new THREE.Vector3();
  const offset = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyQuaternion(right.root.quaternion);
  const radius = first ? 0.5 : 0.25;
  const depth = first ? 1.2 : 0.4;
  const turns = wraps + (first ? 0 : 0.35);
  const wrapAt = (turn: number) => base.clone().add(offset(-radius * Math.cos(direction * turn * Math.PI * 2), radius * Math.sin(direction * turn * Math.PI * 2), depth));
  let pullStart = new THREE.Vector3();
  let spread: THREE.Vector3[] = [];
  return [
    { ...moveTo(right, () => new THREE.Vector3(0, 1, -0.65), 1.2), caption: title ?? (first ? "Surgeon's knot · bring the driver over the wound" : 'Opposing throw · driver back over the wound') },
    moveTo(left, () => new THREE.Vector3(-0.5, 1, 0.55), 1.2),
    { ...moveTo(left, () => { base.copy(right.root.position); return wrapAt(0); }, 0.7) },
    {
      caption: wraps === 2 ? 'Wrap the long strand twice around the driver' : 'Wrap once around the driver, the other way from the last throw',
      seconds: turns * SECONDS_PER_WRAP,
      start: () => base.copy(right.root.position),
      apply: (t) => left.root.position.copy(wrapAt(t * turns)),
    },
    {
      caption: 'Grasp-side pull: draw the short tail through the loop',
      seconds: 2,
      start: () => (pullStart = right.root.position.clone()),
      apply: (t) => right.root.position.copy(pullStart).add(offset(0, 0, ease(t) * (first ? 1.6 : 0.8))),
    },
    {
      caption: 'Pull the ends apart to lay the throw flat',
      seconds: 2.5,
      start: () => (spread = [left.root.position.clone(), right.root.position.clone()]),
      apply: (t) => {
        // One continuous pull (no long hold at the end).
        const k = ease(t);
        left.root.position.copy(spread[0]).add(new THREE.Vector3(-2.3 * k, 0, 0));
        right.root.position.copy(spread[1]).add(new THREE.Vector3(0.65 * k, 0, 0));
      },
    },
  ];
}

/** Lower both hands to the skin and pull to seat the knot. */
function lowerAndPull(model: KnotEngine, { left, right }: Tools, seconds = 3): Segment {
  let starts: THREE.Vector3[] = [];
  return {
    caption: 'Lower the hands and tighten the knot down onto the skin',
    seconds,
    start: () => (starts = [left.root.position.clone(), right.root.position.clone()]),
    apply: (t) => {
      // Pull down and apart, then keep the tension a moment so the throw seats.
      const k = ease(Math.min(1, (t * seconds) / (3 * TIGHTEN_PULL_SHARE)));
      [left, right].forEach((tool, i) => {
        const target = new THREE.Vector3(starts[i].x + (i ? 0.5 : -0.8), model.entry.y + 0.05, model.entry.z + 0.05);
        tool.root.position.copy(starts[i]).lerp(target, k);
      });
    },
  };
}

/**
 * The whole tie, starting from free tying just begun after a pass (the forceps
 * hold the long strand; see FreeKnotPractice.begin).
 */
export function freeKnotSegments(model: KnotEngine, tools: Tools): Segment[] {
  const { right } = tools;
  return [
    pause(0.5, 'Free instrument tie · real thread physics'),
    { ...moveTo(right, () => model.short.points.at(-1)!.clone().sub(TIP), 1.5), caption: 'Needle driver takes the short tail' },
    jaws(right, CLOSED, 0.4),
    gripEnd(right, () => model.short.points.at(-1)!.clone(), () => model.gripLabel('right') === 'short tail'),
    ...throwSegments(model, tools, 2, 1, true),
    lowerAndPull(model, tools),
    ...regraspEnds(model, tools),
    ...throwSegments(model, tools, 1, -1, false),
    lowerAndPull(model, tools),
    // A third throw, reversed again, makes the knot secure (three or more alternating throws).
    ...regraspEnds(model, tools),
    ...throwSegments(model, tools, 1, 1, false, 'Third throw · reverse again to secure the knot'),
    // The last throw gets a longer, firm hold so it seats down on the knot.
    lowerAndPull(model, tools, 4.5),
    pause(1, "Surgeon's knot tied and seated · three throws"),
  ];
}
