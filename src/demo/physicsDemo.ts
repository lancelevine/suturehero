import * as THREE from 'three';
import type { PracticeSession } from '../gameplay/PracticeSession';
import type { Instrument } from '../instruments/Instrument';
import type { NeedleGrasp } from '../suture/NeedleGrasp';
import type { SutureModel } from '../suture/SutureModel';
import { humanCadence, humanEase, type Segment } from './choreography';
import { freeKnotSegments } from './freeKnotDemo';
import { formatMm } from '../setup/sceneScale';
import { TISSUE_LAYERS } from '../tissue/anatomy';

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

/**
 * Needle circle centre above the skin for the demo bite (scene units): bites ≈ 6.5 mm from
 * the edge, ≈ 3.2 mm deep (mid-dermis), entering at ≈ 53°. The 3/8 PS-2 spans ≈ 106° of
 * its 135° arc in the skin, so the driver grips near the back to stay out of the skin.
 */
const PASS_CENTRE = new THREE.Vector3(0, 0.41 + 0.18, 0);
/** Driver turn rate while driving the needle (rad/s, ≈ 57°/s), a steady wrist pronation. */
const DRIVE_RATE = 1;
/** Longest a drive may take (s); each drive ends earlier on its own condition. */
const DRIVE_SECONDS = 20;
/** Skin surface height (scene units). */
const SKIN_Y = 0.41;
/** How far the tip comes out before the driver lets go (scene units, ≈ 1 mm). */
const TIP_OUT = 0.04;
/** Needle counts as exposed this far above the skin (scene units, ≈ 1 mm). */
const EXPOSED_CLEARANCE = 0.04;
/** Where the forceps wait, out of the way of the pass. */
const FORCEPS_REST = new THREE.Vector3(-1.6, 1.2, -0.9);

/** Where along the needle the driver grips it, from the swage (0) to the tip (1): near the back for this wide bite. */
const GRIP_FRACTION = 0.1;
/** Jaw point in the driver's own frame (the needle grasp uses the same point). */
const JAW_LOCAL = new THREE.Vector3(0, 0, 0.05);
/** Height above the needle from which the driver approaches and lifts (scene units, ≈ 11 mm). */
const APPROACH_HEIGHT = 0.4;

const matrixOf = (position: THREE.Vector3, quaternion: THREE.Quaternion) => new THREE.Matrix4().compose(position, quaternion, new THREE.Vector3(1, 1, 1));

/** Needle pose at the start of the bite: circle in the world XY plane around PASS_CENTRE. */
/**
 * Needle pose at the start of the bite: the needle's circle in the world XY plane around
 * PASS_CENTRE, mirrored (turned 180° about vertical) so it enters the right edge and exits
 * the left (right-to-left, as a right-handed surgeon throws). It then advances about −Z.
 */
const passNeedlePose = () =>
  matrixOf(PASS_CENTRE, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2)));
/** Axis the driver turns about to advance the needle (pronation). */
const DRIVE_AXIS = new THREE.Vector3(0, 0, -1);
/** The needle exits on this side of the wound (x < 0: left). */
const EXIT_SIDE = -1;
/** Where the forceps grasp the right (entry) skin edge: beside the bite along the wound (scene units, ≈ 9 mm). */
const EVERT_Z = 0.35;
/** How far the forceps lift the grasped edge to evert it (scene units, ≈ 3 mm). */
const EVERT_LIFT = 0.12;

/**
 * Driver pose holding the needle at the start of the bite: jaws on the needle at
 * GRIP_FRACTION, shaft perpendicular to the needle's plane (how a needle is loaded).
 */
function passDriverPose(needle: SutureModel) {
  const gripLocal = needle.points[Math.round(GRIP_FRACTION * (needle.points.length - 1))];
  const gripWorld = gripLocal.clone().applyMatrix4(passNeedlePose());
  return matrixOf(gripWorld.sub(JAW_LOCAL), new THREE.Quaternion());
}

/** Moves a tool between two poses (computed when the segment starts), easing in and out. */
function poseMove(tool: Instrument, target: () => THREE.Matrix4, seconds: number, caption?: string): Segment {
  const from = { p: new THREE.Vector3(), q: new THREE.Quaternion() };
  const to = { p: new THREE.Vector3(), q: new THREE.Quaternion() };
  return {
    caption,
    seconds,
    start: () => {
      from.p.copy(tool.root.position);
      from.q.copy(tool.root.quaternion);
      target().decompose(to.p, to.q, new THREE.Vector3());
    },
    apply: (t) => {
      const k = humanEase(t);
      tool.root.position.copy(from.p).lerp(to.p, k);
      const distance=from.p.distanceTo(to.p);
      tool.root.position.y+=Math.sin(Math.PI*k)*Math.min(.065,distance*.04);
      tool.root.position.x+=Math.sin(Math.PI*k)*Math.min(.025,distance*.012);
      tool.root.quaternion.copy(from.q).slerp(to.q, k);
      tool.root.updateWorldMatrix(true, false);
    },
  };
}

export function physicsDemoSegments(scene: DemoScene): Segment[] {
  const { session, needle, grasp, left, right } = scene;
  const forcepsStart = new THREE.Vector3();
  /** Turns the held needle about its circle centre (pronation) until `done`. */
  const drive = (caption: string, done: () => boolean): Segment => {
    let driven = 0;
    return {
      caption,
      seconds: DRIVE_SECONDS,
      start: () => (driven = 0),
      apply: (t) => {
        const target = humanCadence(t) * DRIVE_SECONDS * DRIVE_RATE;
        const turn = new THREE.Quaternion().setFromAxisAngle(DRIVE_AXIS, target - driven);
        driven = target;
        right.root.position.sub(PASS_CENTRE).applyQuaternion(turn).add(PASS_CENTRE);
        right.root.quaternion.premultiply(turn);
        right.root.updateWorldMatrix(true, false);
      },
      done,
    };
  };
  /**
   * Driver pose gripping the exposed part of the needle beyond the exit (half way between
   * where it leaves the skin and the tip), in the same loading as the first grip.
   */
  const regripPose = () => {
    needle.root.updateWorldMatrix(true, false);
    const world = needle.points.map((p) => p.clone().applyMatrix4(needle.root.matrixWorld));
    let firstExposed = world.length - 1;
    while (firstExposed > 0 && world[firstExposed - 1].y > SKIN_Y + EXPOSED_CLEARANCE) firstExposed--;
    const index = Math.round((firstExposed + world.length - 1) / 2);
    const gripLocal = needle.points[index].clone();
    // Same orientation relation as the first grip (shaft perpendicular to the needle plane), moved to this point.
    const relative = passNeedlePose().invert().multiply(passDriverPose(needle));
    const rotation = new THREE.Quaternion();
    needle.root.matrixWorld.clone().multiply(relative).decompose(new THREE.Vector3(), rotation, new THREE.Vector3());
    const jawWorld = gripLocal.applyMatrix4(needle.root.matrixWorld);
    return matrixOf(jawWorld.sub(JAW_LOCAL.clone().applyQuaternion(rotation)), rotation);
  };
  // The driver's pickup pose: the same grip relation as at the bite start, applied to the resting needle.
  const pickupPose = () => {
    needle.root.updateWorldMatrix(true, false);
    const relative = passNeedlePose().invert().multiply(passDriverPose(needle));
    return needle.root.matrixWorld.clone().multiply(relative);
  };
  /** The right (entry) skin edge where the forceps grasp it: at the wound edge, mid-epidermis. */
  const evertJaw = () => new THREE.Vector3(session.wound.initialGap / 2, (TISSUE_LAYERS.epidermis.bottom + TISSUE_LAYERS.epidermis.top) / 2, EVERT_Z);
  const above = (pose: () => THREE.Matrix4) => () => pose().premultiply(new THREE.Matrix4().makeTranslation(0, APPROACH_HEIGHT, 0));
  const liftedPassPose = above(() => passDriverPose(needle));
  return [
    {
      caption: 'Simple interrupted suture · automatic demonstration (free physics)',
      seconds: 1.2,
      start: () => {
        // The needle settles on the pad (it was just reset); the forceps move out of the way.
        forcepsStart.copy(left.root.position);
        left.openness = 0.65;
        right.openness = 0.65;
      },
      apply: (t) => left.root.position.copy(forcepsStart).lerp(FORCEPS_REST, humanEase(t)),
    },
    poseMove(right, above(pickupPose), 1.5, 'Load the needle in the needle driver, near its back'),
    poseMove(right, pickupPose, 0.7),
    { seconds: 0.5, start: () => (right.openness = 0.1), done: () => grasp.holder === right },
    poseMove(right, () => above(pickupPose)(), 0.8, 'Lift the needle and bring it to the wound'),
    poseMove(right, liftedPassPose, 1.5),
    // Forceps grasp the right skin edge beside the bite and lift it gently to evert it.
    poseMove(left, () => matrixOf(evertJaw().add(new THREE.Vector3(0, APPROACH_HEIGHT, 0)).sub(JAW_LOCAL), new THREE.Quaternion()), 1, 'Forceps grasp the right skin edge'),
    poseMove(left, () => matrixOf(evertJaw().sub(JAW_LOCAL), new THREE.Quaternion()), 0.5),
    { seconds: 0.4, start: () => (left.openness = 0.1), done: () => session.eversion.held },
    poseMove(left, () => matrixOf(left.root.position.clone().add(new THREE.Vector3(0, EVERT_LIFT, 0)), new THREE.Quaternion()), 1, 'Lift gently to evert the edge'),
    poseMove(right, () => passDriverPose(needle), 1, 'Enter the everted edge about 5 mm out, right to left'),
    drive('Drive the needle through the skin along its curve', () => {
      // Until the tip is well out on the far side: then let go and regrasp the tip.
      const tip = needle.getTipPose().position;
      return !!session.freePass.current?.exit && tip.y > SKIN_Y + TIP_OUT;
    }),
    { caption: 'Tip out through the far edge · let go of the needle and the skin', seconds: 0.6, start: () => { right.openness = 0.65; left.openness = 0.65; } },
    poseMove(left, () => matrixOf(FORCEPS_REST, new THREE.Quaternion()), 0.8),
    poseMove(right, () => regripPose().premultiply(new THREE.Matrix4().makeTranslation(0.15 * EXIT_SIDE, APPROACH_HEIGHT, 0)), 0.9),
    poseMove(right, () => regripPose().premultiply(new THREE.Matrix4().makeTranslation(0, APPROACH_HEIGHT * 0.5, 0)), 0.7, 'Regrasp the needle near its tip'),
    poseMove(right, () => regripPose(), 0.6),
    { seconds: 0.5, start: () => (right.openness = 0.1), done: () => grasp.holder === right },
    drive('Pull the needle out along its curve · the thread follows', () => session.freePass.passes.length > 0),
    {
      caption: 'Needle through both edges · the thread follows',
      seconds: 0.8,
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
      caption: () => stitchSummary(session),
      seconds: 4,
      start: () => {
        if (session.canFinishSandboxStitch) session.finishSandboxStitch();
      },
    },
  ];
}

/** Release the instruments, lift them clear, and cut both tails with the scissors (page only). */
function trimSegments({ scissors, left, right }: DemoScene): Segment[] {
  let lifts: THREE.Vector3[] = [];
  const cut = (which: string): Segment[] => [
    { caption: `Cut the ${which} tail, leaving a short end`, seconds: 0.6, start: () => void scissors?.position() },
    // The scissors close from the key at the instrument's jaw speed: about 0.8 s from open to cut.
    { seconds: 0.9, start: () => scissors?.close(true) },
    { seconds: 0.4, start: () => scissors?.close(false) },
  ];
  return [
    {
      caption: 'Release the thread and lift the instruments clear',
      seconds: 1.2,
      start: () => {
        left.openness = 0.7;
        right.openness = 0.7;
        lifts = [left.root.position.clone(), right.root.position.clone()];
      },
      apply: (t) => {
        const leftProgress=humanEase(t),rightProgress=humanEase(Math.max(0,(t-.06)/.94));
        left.root.position.copy(lifts[0]).add(new THREE.Vector3(-0.3*leftProgress,0.6*leftProgress,0.3*leftProgress));
        right.root.position.copy(lifts[1]).add(new THREE.Vector3(0.3*rightProgress,0.6*rightProgress,-0.3*rightProgress));
      },
    },
    // The scissors come from the page; unit tests have none and skip the cutting.
    ...(scissors ? [...cut('long'), ...cut('short'), { seconds: 0.4, start: () => scissors.putAway() }] : []),
  ];
}

/** Closing caption from the simulation itself: the bite and the knot grade of the stitch just kept. */
export function stitchSummary(session: PracticeSession): string {
  const pass = session.freePass.passes[session.freePass.passes.length - 1];
  const stitch = session.course.completed[session.course.completed.length - 1];
  if (!pass || !stitch) return 'Simple interrupted suture complete';
  const knot = stitch.review.find((line) => line.startsWith('Knot: '))?.replace(/^Knot: (\S+(?: \S+)?) ·.*$/, '$1') ?? 'tied';
  const exit = pass.exitEdge !== null ? ` / ${formatMm(pass.exitEdge)}` : '';
  return `Stitch complete · bites ${formatMm(pass.entryEdge)}${exit} from the edge · ${formatMm(pass.depth)} deep (${pass.deepestLayer}) · knot ${knot}`;
}
