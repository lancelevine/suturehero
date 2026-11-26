import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { exerciseTitle, sandboxTitle, type ExerciseTitleInput, type SandboxTitleInput } from './practiceMessages';

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
