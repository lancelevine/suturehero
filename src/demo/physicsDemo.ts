import * as THREE from 'three';
import type { PracticeSession } from '../gameplay/PracticeSession';
import type { Instrument } from '../instruments/Instrument';
import type { NeedleGrasp } from '../suture/NeedleGrasp';
import type { SutureModel } from '../suture/SutureModel';
import { ease, type Segment } from './choreography';
import { freeKnotSegments } from './freeKnotDemo';

/**
 * The demo's simple interrupted suture with free (physics) handling
 * (2026-11-15): a free Sandbox pass driven by turning the needle driver about
 * the needle's curve, then an instrument tie by thread physics
 * (demo/freeKnotDemo.ts), then the stitch is kept. Replaces the scripted
 * guided-exercise demo.
 */

/** Scissors controls from the page (main.ts); absent in unit tests, which skip trimming. */
export interface DemoScissors {
  /** "Position scissors at tail" for the next untrimmed tail; false when none is left. */
  position(): boolean;
  /** Holds or releases the scissors' closing key. */
  close(closed: boolean): void;
  /** Back to the needle driver. */
  putAway(): void;
}

export interface DemoScene {
  scissors?: DemoScissors;
  session: PracticeSession;
  needle: SutureModel;
  grasp: NeedleGrasp;
  left: Instrument;
  right: Instrument;
}

/** Needle circle centre above the skin for the demo bite (scene units): reaches mid-dermis both sides. */
const PASS_CENTRE = new THREE.Vector3(0, 0.41 + 0.18, 0);
/** Driver turn rate while driving the needle (rad/s), about a wrist's pronation speed. */
const DRIVE_RATE = 0.6;
/** Where the forceps wait, out of the way of the pass. */
const FORCEPS_REST = new THREE.Vector3(-1.2, 1.3, 0.8);

export function physicsDemoSegments(scene: DemoScene): Segment[] {
  const { session, needle, grasp, left, right } = scene;
  const forcepsStart = new THREE.Vector3();
  let driven = 0;
  return [
    {
      caption: 'Simple interrupted suture · automatic demonstration (free physics)',
      seconds: 1.5,
      start: () => {
        // Load the needle in the driver at the start of its arc (instantly, before anything moves).
        grasp.release();
        needle.root.position.copy(PASS_CENTRE);
        needle.root.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
        needle.root.updateWorldMatrix(true, false);
        right.root.position.set(0.5, 1, 0);
        right.root.quaternion.identity();
        right.root.updateWorldMatrix(true, false);
        right.openness = 0.1;
        grasp.attach(right);
        forcepsStart.copy(left.root.position);
        left.openness = 0.65;
      },
      apply: (t) => left.root.position.copy(forcepsStart).lerp(FORCEPS_REST, ease(t)),
    },
    {
      caption: 'Drive the needle through the skin along its curve',
      seconds: 20,
      start: () => (driven = 0),
      apply: (t) => {
        // Turn the driver (and the held needle) about the needle's circle centre.
        const target = t * 20 * DRIVE_RATE;
        const turn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), target - driven);
        driven = target;
        right.root.position.sub(PASS_CENTRE).applyQuaternion(turn).add(PASS_CENTRE);
        right.root.quaternion.premultiply(turn);
        right.root.updateWorldMatrix(true, false);
      },
      done: () => session.freePass.passes.length > 0,
    },
    {
      caption: 'Needle through both edges · the thread follows',
      seconds: 1.5,
      done: () => {
        if (!session.canTieFreePass) return false;
        return session.tieFreePass();
      },
    },
    // Tie (freeKnotSegments starts from free tying begun after the pass).
    { seconds: 0.1 },
    ...freeKnotSegments(session.freeKnot, { left, right }),
    ...trimSegments(scene),
    {
      caption: 'Stitch kept · simple interrupted suture complete',
      seconds: 2,
      start: () => {
        if (session.canFinishSandboxStitch) session.finishSandboxStitch();
      },
    },
  ];
}

/** Release the instruments, lift them clear, and cut both tails with the scissors (page only). */
function trimSegments({ scissors, left, right }: DemoScene): Segment[] {
  if (!scissors) return [];
  let lifts: THREE.Vector3[] = [];
  const cut = (which: string): Segment[] => [
    { caption: `Cut the ${which} tail, leaving a short end`, seconds: 0.8, start: () => void scissors.position() },
    { seconds: 0.8, start: () => scissors.close(true) },
    { seconds: 0.6, start: () => scissors.close(false) },
  ];
  return [
    {
      caption: 'Release the thread and lift the instruments clear',
      seconds: 2,
      start: () => {
        left.openness = 0.7;
        right.openness = 0.7;
        lifts = [left.root.position.clone(), right.root.position.clone()];
      },
      apply: (t) => {
        left.root.position.copy(lifts[0]).add(new THREE.Vector3(-0.3, 0.6 * ease(t), 0.3));
        right.root.position.copy(lifts[1]).add(new THREE.Vector3(0.3, 0.6 * ease(t), -0.3));
      },
    },
    ...cut('long'),
    ...cut('short'),
    { seconds: 0.6, start: () => scissors.putAway() },
  ];
}
