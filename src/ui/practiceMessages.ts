import { SKID_MESSAGE } from '../tissue/needleSkid';
import type * as THREE from 'three';
import { NEEDLE_ARC } from '../suture/needleGeometry';
import { describeLoading, loadingFraction } from '../suture/needleLoading';
import { describeFreePass } from '../tissue/freePassFeedback';
import type { FreePassRecord } from '../tissue/FreeNeedlePass';

/**
 * Text shown to the trainee on the practice page (moved out of the main.ts animation loop,
 * 2026-11-26). Each function is a readable version of what was one long conditional
 * expression, checked in the same order, so the messages are unchanged.
 */

type ToolKind = 'forceps' | 'needle-driver' | string;

export interface SandboxTitleInput {
  now: number;
  /** Until when to show the "thread cut through" and "tissue torn" notices (ms, performance.now). */
  cutMessageUntil: number;
  tornMessageUntil: number;
  /** Why the last entry was refused (e.g. into torn skin), or null. */
  rejection: string | null;
  /** The pass currently in the skin, if any. */
  inSkin: FreePassRecord | null;
  forcingWarning: boolean;
  /** Instruments holding the suture thread ('left' forceps, 'right' driver). */
  threadGripIds: readonly string[];
  /** The instrument holding the needle, and where on the needle. */
  holder: { kind: ToolKind } | null;
  heldPoint: THREE.Vector3 | null;
  /** An instrument whose jaws could pick the needle up. */
  candidate: { kind: ToolKind } | null;
}

const toolName = (kind: ToolKind) => (kind === 'forceps' ? 'forceps' : 'needle driver');

/** Sandbox status line (free play). */
export function sandboxTitle(input: SandboxTitleInput): string {
  const { now, inSkin, holder, candidate } = input;
  const recentlyTorn = now < input.tornMessageUntil;
  if (now < input.cutMessageUntil) return 'Sandbox · Thread cut through the skin · pulled too fast or too hard through the tissue · pull the suture slowly along its path';
  if (input.rejection === SKID_MESSAGE && !inSkin) return `Sandbox · ${SKID_MESSAGE}`;
  if (input.rejection && !inSkin && !recentlyTorn) return 'Sandbox · No purchase · torn skin holds no stitch · enter beside the tear, or Undo pass';
  if (recentlyTorn && !inSkin) return 'Sandbox · Tissue torn · the needle was forced off its curve and split the skin (dark red) · torn skin holds no stitch · Undo pass takes it back';
  if (input.forcingWarning) return 'Sandbox · Forcing the needle off its curve · rotate along the curve instead (this would tear tissue)';
  if (inSkin) return `Sandbox · Needle in the skin · rotate along its curve to ${inSkin.exit ? 'pull it through (or regrasp the tip with the forceps)' : 'advance'} · ${describeFreePass(inSkin)}`;
  if (input.threadGripIds.length) return `Sandbox · Holding the suture with the ${input.threadGripIds.map((id) => (id === 'left' ? 'forceps' : 'needle driver')).join(' and ')} · open the jaws to let go`;
  if (holder) {
    const loading = holder.kind === 'needle-driver' && input.heldPoint ? ' · ' + describeLoading(loadingFraction(input.heldPoint, NEEDLE_ARC)) : '';
    return `Sandbox · Holding the needle with the ${toolName(holder.kind)}${loading} · open the jaws to let go`;
  }
  if (candidate) return `Sandbox · Needle in reach · close the ${toolName(candidate.kind)} to pick it up`;
  return 'Sandbox · Pick up the needle, hand it between instruments, lift the skin edges · anything goes';
}

export interface ExerciseTitleInput {
  /** Sandbox free play, and its status line (sandboxTitle). */
  sandbox: boolean;
  sandboxTitle: string;
  /** Skin edge held/everted by the forceps, and its current instruction. */
  edge: { held: boolean; ready: boolean; instruction: string };
  tractionAlert: boolean;
  preparingEdge: boolean;
  passPhase: string;
  pullPhase: string;
  oppositeEdgeRequired: boolean;
  oppositeEdgeInstruction: string;
  /** Tails trimmed after the guided knot: how many, and whether the stitch is complete. */
  tailsTrimmed: boolean;
  trimmedTails: number;
  stitchComplete: boolean;
  freeKnotActive: boolean;
  /** Guided knot: its phase and instruction, the forceps jaw opening, pull check and release check. */
  knot: { active: boolean; phase: string; instruction: string };
  forcepsOpenness: number;
  loadTest: { active: boolean; instruction: string };
  releaseInstruction: string;
  /** Needle hand-off state. */
  holderKind: ToolKind | null;
  candidateKind: ToolKind | null;
  hasReceiver: boolean;
}

/** Main instruction above the practice scene. */
export function exerciseTitle(s: ExerciseTitleInput): string {
  const { edge, passPhase, pullPhase, knot } = s;
  if (s.sandbox && !edge.held) return s.sandboxTitle;
  if (s.tailsTrimmed) return s.stitchComplete ? 'Tails trimmed · Stitch exercise complete' : `Tails trimmed: ${s.trimmedTails}/2 · Position scissors at the other tail`;
  if (s.tractionAlert) return (passPhase === 'passing' ? 'Pass paused · ' : '') + edge.instruction;
  if (edge.held && !s.preparingEdge && passPhase === 'idle') return edge.ready ? 'Skin edge everted · Move freely or open X to release' : 'Skin edge held · Lift E to evert · Open X to release';
  if (s.preparingEdge) return edge.instruction;
  if (passPhase === 'passing' && s.oppositeEdgeRequired) return s.oppositeEdgeInstruction;
  if (passPhase === 'passing' && !edge.ready) return 'Pass paused · Regrasp and evert the skin edge to continue';
  if (passPhase === 'complete' && pullPhase === 'waiting' && edge.held) return 'Needle emerged · Open left forceps with X to release the skin, then Position forceps';
  if (s.freeKnotActive) return 'Free tying lab · Move either instrument freely · Close near thread to grasp; open to release';
  if (knot.active) {
    if (s.forcepsOpenness > 0.2 && knot.phase !== 'complete' && knot.phase !== 'between') return 'Close left forceps with Z to hold the long strand';
    if (s.loadTest.active) return s.loadTest.instruction;
    if (knot.phase === 'complete') return s.releaseInstruction;
    return knot.instruction;
  }
  if (pullPhase === 'complete') return 'Needle curved fully through ✓ · Click Begin knot tying';
  if (pullPhase === 'pulling') return s.holderKind === 'forceps' ? 'Hold R to follow the curve · Y reverses · Shift for precision' : 'Extraction paused · Regrasp with left forceps to continue';
  if (passPhase === 'complete') {
    if (s.hasReceiver) return 'Left grip ready · Open right driver with period';
    if (s.holderKind === 'needle-driver') return s.candidateKind === 'forceps' ? 'Needle body in reach · Hold Z to close left forceps' : 'Click Position forceps, then hold Z and open the driver with period';
    return 'Grasp the exposed needle body with left forceps (Z)';
  }
  if (passPhase === 'passing') return 'Follow the arc · U advances / O reverses · Shift for precision';
  if (passPhase === 'interrupted') return 'Pass interrupted · Click Start guided pass to restart';
  return 'Click Start guided pass · First grasp and evert the right skin edge';
}

export interface ProgressInput {
  sandbox: boolean;
  preparingEdge: boolean;
  /** Skin edge lift (scene units); 0.09 is a full eversion. */
  edgeLift: number;
  freeKnotActive: boolean;
  loadTest: { active: boolean; held: number };
  releaseCheck: { state: string; elapsed: number; duration: number };
  knot: { active: boolean; phase: string; progress: number };
  pull: { phase: string; progress: number };
  pass: { phase: string; progress: number };
}

/** Lift (scene units) that counts as a fully everted skin edge. */
const FULL_EVERSION_LIFT = 0.09;
/** Seconds the guided pull check must be held. */
const LOAD_HOLD_SECONDS = 1.5;

/** Label and value (0–1) of the progress bar under the exercise title. */
export function exerciseProgress(s: ProgressInput): { label: string; value: number } {
  const { knot, pull, pass } = s;
  const passing = pass.phase === 'passing' || pass.phase === 'complete';
  let label: string;
  if (s.sandbox) label = 'Sandbox';
  else if (s.preparingEdge) label = 'Skin edge eversion';
  else if (s.freeKnotActive) label = 'Free thread handling';
  else if (s.loadTest.active) label = 'Gentle load hold';
  else if (knot.phase === 'complete') label = 'Release hold check';
  else if (knot.active) label = knot.phase === 'wrapping' ? 'Loop progress' : knot.phase === 'seating' ? 'Seating progress' : 'Throw progress';
  else if (pull.phase !== 'waiting') label = 'Needle & thread pull-through';
  else label = passing ? 'Tissue pass progress' : 'Guided pass progress';
  let value: number;
  if (s.preparingEdge) value = Math.min(1, Math.max(0, s.edgeLift / FULL_EVERSION_LIFT));
  else if (s.freeKnotActive) value = 0;
  else if (s.loadTest.active) value = s.loadTest.held / LOAD_HOLD_SECONDS;
  else if (knot.phase === 'complete') value = s.releaseCheck.state === 'waiting' ? 0 : s.releaseCheck.elapsed / s.releaseCheck.duration;
  else if (knot.active) value = knot.progress;
  else if (pull.phase !== 'waiting') value = pull.progress;
  else value = passing ? pass.progress : 0;
  return { label, value };
}

export interface KnotActionInput {
  loadTestActive: boolean;
  releaseCheckState: string;
  knotPhase: string;
  /** Recognised technique of the guided knot so far, and its throw count. */
  technique: string | undefined;
  throws: number;
}

/** Label of the guided knot's action button. */
export function knotActionLabel(s: KnotActionInput): string {
  if (s.loadTestActive) return 'Pull check active';
  if (s.releaseCheckState === 'passed') return 'Position driver at released tail';
  if (s.knotPhase === 'between') return s.technique === 'sliding' && s.throws === 1 ? 'Next same-direction throw' : 'Next opposing throw';
  if (s.knotPhase === 'tail') return 'Position driver at tail';
  return 'Begin knot tying';
}

export interface GraspStatusInput {
  tractionAlert: boolean;
  edge: { held: boolean; ready: boolean; instruction: string };
  passPhase: string;
  oppositeEdgeRequired: boolean;
  oppositeEdgeInstruction: string;
  preparingEdge: boolean;
  freeKnotActive: boolean;
  loadTestActive: boolean;
  /** Needle-driver jaw opening (0 closed … 1 open). */
  driverOpenness: number;
  knot: { active: boolean; phase: string };
  releaseCheck: { leftReleased: boolean; rightReleased: boolean };
  /** The needle grasp's own status line, used when nothing more specific applies. */
  graspStatus: string;
}

/** Jaw opening at or below which a jaw counts as holding. */
const HOLDING_OPENNESS = 0.2;

/** Status line about what each instrument is holding. */
export function graspStatusText(s: GraspStatusInput): string {
  const { edge } = s;
  if (s.tractionAlert) return edge.instruction;
  if (s.passPhase === 'passing' && s.oppositeEdgeRequired) return s.oppositeEdgeInstruction;
  if (s.preparingEdge || edge.held) return `Forceps: ${edge.held ? 'holding skin edge' : 'ready to grasp skin'} · ${edge.ready ? 'Edge everted' : 'Lift E to evert · X releases'}`;
  if (s.freeKnotActive) return 'Free movement · Start holds the long tail in the forceps · Driver can grasp nearby thread';
  if (s.loadTestActive) return `Forceps: released · Driver: ${s.driverOpenness <= HOLDING_OPENNESS ? 'holding test tail' : 'open'} · Guided pull check`;
  if (s.knot.phase === 'complete') return `Forceps: ${s.releaseCheck.leftReleased ? 'released' : 'holding'} · Driver: ${s.releaseCheck.rightReleased ? 'released' : 'holding'} · Release-and-hold check`;
  if (s.knot.active) return 'Forceps: long strand · Driver: short tail · Follow the stage prompts';
  return s.graspStatus;
}

export interface ReadoutInput {
  sandbox: boolean;
  edge: { held: boolean; active: boolean; ready: boolean; instruction: string };
  tractionAlert: boolean;
  preparingEdge: boolean;
  oppositeEdgeRequired: boolean;
  oppositeEdgeInstruction: string;
  /** Completed Sandbox passes, and the skin type's tear limits. */
  freePasses: readonly FreePassRecord[];
  skin: { label: string; tearDegrees: number; tearText: string };
  pass: { phase: string; progress: number };
  wound: { dermalBiteCount: number; closure: number };
  /** Free tying state when active: what each jaw holds (null = free), contact winding, prompts and the stitch outcome. */
  freeKnot: null | {
    forcepsHolding: string | null;
    driverHolding: string | null;
    winding: number;
    driverOnTissue: boolean;
    instruction: string;
    handlingHint: string;
    reachLimited: boolean;
    /** Tightening of the retained throw (0–1), when one is retained. */
    tightness: number | null;
    outcome: null | { security: string; notes: readonly string[]; edgeNotes: readonly string[] };
  };
  /** Guided knot state when active. */
  knot: null | {
    throws: number;
    targetThrows: number;
    threadState: string;
    phase: string;
    slack: null | { state: string; friction: string };
    loadTest: null | { load: number; slip: number };
    releaseState: string;
  };
  pull: { phase: string; angle: number; totalAngle: number };
  threadGuideState: string;
  scissorsActive: boolean;
  cutFeedback: string;
}

/** Closure fractions for the wound-edge summary. */
const EDGES_APPROXIMATED = 0.95;
const EDGES_DRAWING_TOGETHER = 0.05;
const woundEdges = (closure: number) => closure > EDGES_APPROXIMATED ? 'Local wound edges approximated' : closure > EDGES_DRAWING_TOGETHER ? 'Wound edges drawing together' : 'Wound edges open';
const degrees = (radians: number) => Math.round(radians * 180 / Math.PI);
const percent = (fraction: number) => Math.round(fraction * 100);

/** Detail line under the exercise title. */
export function exerciseReadout(s: ReadoutInput): string {
  const { edge, pass, wound } = s;
  let text: string;
  if (s.sandbox && !edge.held) {
    const count = s.freePasses.length;
    text = count
      ? `Last pass: ${describeFreePass(s.freePasses[count - 1])} · ${count} pass${count > 1 ? 'es' : ''} · Reset practice clears them`
      : `Free play · ${s.skin.label}: tears if forced over ${s.skin.tearDegrees}° or ${s.skin.tearText} off the curve · Push the needle tip into the skin anywhere, then rotate along its curve · Needle driver: comma closes, period opens · Forceps: Z closes, X opens`;
  } else if (s.preparingEdge || (pass.phase === 'passing' && edge.active)) {
    const prompt = s.oppositeEdgeRequired && pass.phase === 'passing' ? s.oppositeEdgeInstruction
      : edge.ready ? 'Eversion ready'
      : s.tractionAlert ? edge.instruction
      : edge.held ? 'Lift gently with E' : 'Close Z near the edge, then lift with E';
    const stage = s.preparingEdge ? 'Needle stays right → left' : `Assisted pass: ${percent(pass.progress)}% · Dermal purchase: ${wound.dermalBiteCount}/2`;
    text = `Skin edge: ${edge.held ? 'held' : 'released'} · ${prompt} · ${stage}`;
  } else if (s.freeKnot) {
    const f = s.freeKnot;
    const forceps = edge.held ? 'holding skin edge' : f.forcepsHolding !== null ? 'holding ' + f.forcepsHolding : 'free';
    const driver = f.driverHolding !== null ? 'holding ' + f.driverHolding : 'free';
    const tightening = f.tightness !== null ? ' · Tightening: ' + percent(f.tightness) + '%' : '';
    const outcome = f.outcome ? ' · Knot ' + f.outcome.security + ' (' + f.outcome.notes.slice(1).join('; ') + ') · ' + f.outcome.edgeNotes.join(' · ') : '';
    text = `Forceps: ${forceps} · Driver: ${driver} · Contact winding: ${f.winding.toFixed(2)} turns · ${f.driverOnTissue ? 'Driver at tissue surface · ' : ''} ${f.instruction} · ${f.handlingHint} · ${f.reachLimited ? 'Thread at reach limit' : 'Physical strand handling'}${tightening}${outcome}`;
  } else if (s.knot) {
    const k = s.knot;
    const slack = k.slack ? ' · ' + k.slack.state + ' · ' + (k.slack.friction === 'holding' ? 'Sliding held' : k.slack.friction === 'sliding' ? 'Sliding resisted' : 'Thread feeds freely') : '';
    const load = k.loadTest ? ' · Pull load: ' + k.loadTest.load.toFixed(2) + ' (relative) · Slip: ' + k.loadTest.slip.toFixed(3) : '';
    const release = k.phase === 'complete' ? ' · Release check: ' + k.releaseState : '';
    text = `${k.throws} / ${k.targetThrows} throws seated · Dermal purchase: ${wound.dermalBiteCount}/2 · ${k.threadState}${slack}${load}${release} · ${woundEdges(wound.closure)}`;
  } else if (s.pull.phase !== 'waiting') {
    text = `Needle rotation: ${degrees(s.pull.angle)}° / ${degrees(s.pull.totalAngle)}° · ${s.threadGuideState}`;
  } else if (pass.phase === 'passing' || pass.phase === 'complete') {
    text = `Assisted pass: ${percent(pass.progress)}% · Right entry → left exit · Open jaws to abort`;
  } else {
    text = 'First evert the right skin edge · Optional forceps positioning available';
  }
  if (s.freeKnot) text += ` · Dermal purchase: ${wound.dermalBiteCount}/2 · ${woundEdges(wound.closure)}`;
  if (s.scissorsActive || s.cutFeedback) text += ` · ${s.scissorsActive ? 'Scissors: arrows / N M / I K J L U O · comma closes · period opens · ' : ''}${s.cutFeedback}`;
  return text;
}

/** The free-tying knot status line (moved out of src/main.ts, 2026-11-27). */
export function freeKnotStateText(input: { phase: string; knotAtTissue: boolean; throws: number | undefined; label: string | undefined; hasOpening: boolean; handlingHint: string }): string {
  const { phase, handlingHint } = input;
  if (phase === 'seated') return input.knotAtTissue ? `Throw ${input.throws || 1} seated at tissue · ${input.label ?? ''}` : handlingHint;
  if (phase === 'retained' || phase === 'passed' || input.hasOpening) return handlingHint;
  return `No throw formed · ${handlingHint}`;
}

const ARTERY_EVERSION_NOTE = 'Grasp the right vessel edge with the forceps, lift briefly to evert the wall, then begin the needle pass. Release the wall before transferring the needle. The arterial wall carries the stitch load. This is one anterior-wall stitch; a complete circumferential anastomosis is not yet modeled.';
const NERVE_EVERSION_NOTE = 'Grasp the outer nerve sheath with the forceps and lift gently before the guided pass. The epineurial sheath carries the stitch load; the fascicle bundles are shown inside. This is a practice approximation of one stitch.';

/**
 * Page texts for the skin or microsurgery environment (moved out of src/main.ts, 2026-11-27).
 * `targetLabel` is the microsurgery target's label (e.g. "Artery"); `original` are the skin texts
 * read from the page at start-up.
 */
export function environmentTexts(micro: boolean, target: string, targetLabel: string, original: { lesson: string; eversion: string; free: string }) {
  const nerve = micro && target === 'nerve';
  return {
    switchButton: micro ? 'Skin environment' : 'Microsurgery environment',
    heading: micro ? `${targetLabel} anastomosis · one stitch` : 'Simple interrupted suture',
    tag: micro ? (nerve ? 'NERVE + FASCICLES' : 'HOLLOW ARTERY ENDS') : '3-LAYER TISSUE PAD',
    tagTitle: micro ? 'Outer wall · Lumen · Cut ends' : 'Epidermis · Dermis · Subcutaneous fat',
    sceneLabel: micro ? (nerve ? 'NERVE ENDS' : 'VESSEL ENDS') : 'TISSUE PAD 01',
    firstStep: `Evert the right ${micro ? 'tissue' : 'skin'} edge`,
    lesson: micro ? original.lesson.replaceAll('skin edge', 'vessel edge') : original.lesson,
    eversion: nerve ? NERVE_EVERSION_NOTE : micro ? ARTERY_EVERSION_NOTE : original.eversion,
    free: micro ? original.free.replaceAll('skin edge', 'vessel edge') : original.free,
  };
}
