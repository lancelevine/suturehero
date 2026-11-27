import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { exerciseProgress, exerciseReadout, exerciseTitle, freeKnotStateText, graspStatusText, knotActionLabel, sandboxTitle, type ExerciseTitleInput, type ProgressInput, type ReadoutInput, type SandboxTitleInput } from './practiceMessages';

const sandbox = (over: Partial<SandboxTitleInput> = {}): SandboxTitleInput => ({
  now: 1000, cutMessageUntil: 0, tornMessageUntil: 0, rejection: null, inSkin: null, forcingWarning: false,
  threadGripIds: [], holder: null, heldPoint: null, candidate: null, ...over,
});

describe('sandbox title', () => {
  it('puts recent cut-through and tear notices first', () => {
    expect(sandboxTitle(sandbox({ cutMessageUntil: 2000, tornMessageUntil: 2000 }))).toMatch(/Thread cut through/);
    expect(sandboxTitle(sandbox({ tornMessageUntil: 2000, rejection: 'x' }))).toMatch(/Tissue torn/);
    expect(sandboxTitle(sandbox({ rejection: 'torn skin holds no stitch' }))).toMatch(/No purchase/);
  });
  it('describes what is held, the needle in reach, or free play', () => {
    expect(sandboxTitle(sandbox({ threadGripIds: ['left', 'right'] }))).toBe('Sandbox · Holding the suture with the forceps and needle driver · open the jaws to let go');
    expect(sandboxTitle(sandbox({ holder: { kind: 'forceps' } }))).toBe('Sandbox · Holding the needle with the forceps · open the jaws to let go');
    expect(sandboxTitle(sandbox({ holder: { kind: 'needle-driver' }, heldPoint: new THREE.Vector3(0.4, 0, 0) }))).toMatch(/^Sandbox · Holding the needle with the needle driver · .+ · open the jaws to let go$/);
    expect(sandboxTitle(sandbox({ candidate: { kind: 'needle-driver' } }))).toBe('Sandbox · Needle in reach · close the needle driver to pick it up');
    expect(sandboxTitle(sandbox())).toMatch(/anything goes/);
  });
});

const guided = (over: Partial<ExerciseTitleInput> = {}): ExerciseTitleInput => ({
  sandbox: false, sandboxTitle: 'SANDBOX', edge: { held: false, ready: false, instruction: 'EDGE' }, tractionAlert: false, preparingEdge: false,
  passPhase: 'idle', pullPhase: 'waiting', oppositeEdgeRequired: false, oppositeEdgeInstruction: 'OPPOSITE', tailsTrimmed: false, trimmedTails: 0,
  stitchComplete: false, freeKnotActive: false, knot: { active: false, phase: 'idle', instruction: 'KNOT' }, forcepsOpenness: 0.1,
  loadTest: { active: false, instruction: 'LOAD' }, releaseInstruction: 'RELEASE', holderKind: null, candidateKind: null, hasReceiver: false, ...over,
});

describe('exercise title', () => {
  it('shows the Sandbox line unless the skin edge is held', () => {
    expect(exerciseTitle(guided({ sandbox: true }))).toBe('SANDBOX');
    expect(exerciseTitle(guided({ sandbox: true, edge: { held: true, ready: true, instruction: 'EDGE' } }))).toMatch(/Skin edge everted/);
  });
  it('follows the guided pass, hand-off and pull in order', () => {
    expect(exerciseTitle(guided())).toMatch(/^Click Start guided pass/);
    expect(exerciseTitle(guided({ passPhase: 'passing', edge: { held: true, ready: true, instruction: 'EDGE' } }))).toMatch(/^Follow the arc/);
    expect(exerciseTitle(guided({ passPhase: 'passing' }))).toMatch(/^Pass paused · Regrasp/);
    expect(exerciseTitle(guided({ passPhase: 'passing', tractionAlert: true }))).toBe('Pass paused · EDGE');
    expect(exerciseTitle(guided({ passPhase: 'complete', holderKind: 'needle-driver', candidateKind: 'forceps' }))).toMatch(/^Needle body in reach/);
    expect(exerciseTitle(guided({ passPhase: 'complete', hasReceiver: true }))).toMatch(/^Left grip ready/);
    expect(exerciseTitle(guided({ pullPhase: 'pulling', holderKind: 'forceps' }))).toMatch(/^Hold R/);
    expect(exerciseTitle(guided({ pullPhase: 'complete' }))).toMatch(/Begin knot tying/);
  });
  it('covers the guided knot, its checks, free tying and trimming', () => {
    expect(exerciseTitle(guided({ knot: { active: true, phase: 'wrapping', instruction: 'KNOT' }, forcepsOpenness: 0.7 }))).toMatch(/^Close left forceps/);
    expect(exerciseTitle(guided({ knot: { active: true, phase: 'wrapping', instruction: 'KNOT' } }))).toBe('KNOT');
    expect(exerciseTitle(guided({ knot: { active: true, phase: 'complete', instruction: 'KNOT' } }))).toBe('RELEASE');
    expect(exerciseTitle(guided({ knot: { active: true, phase: 'complete', instruction: 'KNOT' }, loadTest: { active: true, instruction: 'LOAD' } }))).toBe('LOAD');
    expect(exerciseTitle(guided({ freeKnotActive: true }))).toMatch(/^Free tying lab/);
    expect(exerciseTitle(guided({ tailsTrimmed: true, trimmedTails: 1 }))).toBe('Tails trimmed: 1/2 · Position scissors at the other tail');
    expect(exerciseTitle(guided({ tailsTrimmed: true, stitchComplete: true }))).toBe('Tails trimmed · Stitch exercise complete');
  });
});

describe('progress, knot button and grasp status', () => {
  const base: ProgressInput = { sandbox: false, preparingEdge: false, edgeLift: 0, freeKnotActive: false, loadTest: { active: false, held: 0 }, releaseCheck: { state: 'waiting', elapsed: 0, duration: 2 }, knot: { active: false, phase: 'idle', progress: 0 }, pull: { phase: 'waiting', progress: 0 }, pass: { phase: 'idle', progress: 0 } };
  it('labels and fills the progress bar for each stage', () => {
    expect(exerciseProgress(base)).toEqual({ label: 'Guided pass progress', value: 0 });
    expect(exerciseProgress({ ...base, preparingEdge: true, edgeLift: 0.045 })).toEqual({ label: 'Skin edge eversion', value: 0.5 });
    expect(exerciseProgress({ ...base, pass: { phase: 'passing', progress: 0.3 } })).toEqual({ label: 'Tissue pass progress', value: 0.3 });
    expect(exerciseProgress({ ...base, knot: { active: true, phase: 'seating', progress: 0.6 } })).toEqual({ label: 'Seating progress', value: 0.6 });
    expect(exerciseProgress({ ...base, loadTest: { active: true, held: 0.75 } })).toEqual({ label: 'Gentle load hold', value: 0.5 });
    expect(exerciseProgress({ ...base, sandbox: true }).label).toBe('Sandbox');
  });
  it('names the next guided knot action', () => {
    const knot = { loadTestActive: false, releaseCheckState: 'waiting', knotPhase: 'idle', technique: undefined, throws: 0 };
    expect(knotActionLabel(knot)).toBe('Begin knot tying');
    expect(knotActionLabel({ ...knot, knotPhase: 'between', technique: 'sliding', throws: 1 })).toBe('Next same-direction throw');
    expect(knotActionLabel({ ...knot, knotPhase: 'between', technique: 'surgeon', throws: 1 })).toBe('Next opposing throw');
    expect(knotActionLabel({ ...knot, releaseCheckState: 'passed' })).toBe('Position driver at released tail');
  });
  it('says what each instrument holds', () => {
    const status = { tractionAlert: false, edge: { held: false, ready: false, instruction: 'EDGE' }, passPhase: 'idle', oppositeEdgeRequired: false, oppositeEdgeInstruction: 'OPP', preparingEdge: false, freeKnotActive: false, loadTestActive: false, driverOpenness: 0.1, knot: { active: false, phase: 'idle' }, releaseCheck: { leftReleased: false, rightReleased: true }, graspStatus: 'GRASP' };
    expect(graspStatusText(status)).toBe('GRASP');
    expect(graspStatusText({ ...status, edge: { held: true, ready: true, instruction: 'EDGE' } })).toBe('Forceps: holding skin edge · Edge everted');
    expect(graspStatusText({ ...status, loadTestActive: true })).toBe('Forceps: released · Driver: holding test tail · Guided pull check');
    expect(graspStatusText({ ...status, knot: { active: true, phase: 'complete' } })).toBe('Forceps: holding · Driver: released · Release-and-hold check');
  });
});

describe('exercise readout', () => {
  const base: ReadoutInput = {
    sandbox: false, edge: { held: false, active: false, ready: false, instruction: 'EDGE' }, tractionAlert: false, preparingEdge: false, oppositeEdgeRequired: false, oppositeEdgeInstruction: 'OPP',
    freePasses: [], skin: { label: 'Standard dermis', tearDegrees: 35, tearText: '7.0 mm' }, pass: { phase: 'idle', progress: 0 }, wound: { dermalBiteCount: 1, closure: 0.5 },
    freeKnot: null, knot: null, pull: { phase: 'waiting', angle: 0, totalAngle: 0 }, threadGuideState: 'GUIDE', scissorsActive: false, cutFeedback: '',
  };
  it('describes Sandbox free play and the guided stages', () => {
    expect(exerciseReadout({ ...base, sandbox: true })).toMatch(/^Free play · Standard dermis: tears if forced over 35° or 7\.0 mm off the curve/);
    expect(exerciseReadout(base)).toBe('First evert the right skin edge · Optional forceps positioning available');
    expect(exerciseReadout({ ...base, preparingEdge: true, edge: { held: true, active: true, ready: true, instruction: 'EDGE' } })).toBe('Skin edge: held · Eversion ready · Needle stays right → left');
    expect(exerciseReadout({ ...base, pull: { phase: 'pulling', angle: Math.PI / 2, totalAngle: Math.PI } })).toBe('Needle rotation: 90° / 180° · GUIDE');
  });
  it('adds free-tying holds, wound summary and scissors feedback', () => {
    const text = exerciseReadout({ ...base, freeKnot: { forcepsHolding: 'long strand', driverHolding: null, winding: 1.234, driverOnTissue: false, instruction: 'INSTR', handlingHint: 'HINT', reachLimited: false, tightness: 0.5, outcome: null }, scissorsActive: true, cutFeedback: 'Cut' });
    expect(text).toBe('Forceps: holding long strand · Driver: free · Contact winding: 1.23 turns ·  INSTR · HINT · Physical strand handling · Tightening: 50% · Dermal purchase: 1/2 · Wound edges drawing together · Scissors: arrows / N M / I K J L U O · comma closes · period opens · Cut');
  });
  it('summarises the guided knot', () => {
    expect(exerciseReadout({ ...base, wound: { dermalBiteCount: 2, closure: 0.97 }, knot: { throws: 2, targetThrows: 3, threadState: 'THREAD', phase: 'complete', slack: null, loadTest: null, releaseState: 'passed' } }))
      .toBe('2 / 3 throws seated · Dermal purchase: 2/2 · THREAD · Release check: passed · Local wound edges approximated');
  });
});

it('describes the free-tying knot state', () => {
  const base = { phase: 'seated', knotAtTissue: true, throws: 2, label: "Surgeon's knot", hasOpening: false, handlingHint: 'Pull the ends apart' };
  expect(freeKnotStateText(base)).toBe("Throw 2 seated at tissue · Surgeon's knot");
  expect(freeKnotStateText({ ...base, knotAtTissue: false })).toBe('Pull the ends apart');
  expect(freeKnotStateText({ ...base, phase: 'retained' })).toBe('Pull the ends apart');
  expect(freeKnotStateText({ ...base, phase: 'idle' })).toBe('No throw formed · Pull the ends apart');
  expect(freeKnotStateText({ ...base, phase: 'idle', hasOpening: true })).toBe('Pull the ends apart');
  expect(freeKnotStateText({ ...base, throws: undefined, label: undefined })).toBe('Throw 1 seated at tissue · ');
});
