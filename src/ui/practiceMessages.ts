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
