import type * as THREE from 'three';
import { FreeKnotPractice } from '../gameplay/FreeKnotPractice';
import type { Instrument } from '../instruments/Instrument';
import type { KnotTechnique, ThrowRecord } from '../suture/KnotTechnique';
import type { StrandObstacle, ThreadStrand } from '../suture/ThreadStrand';
import type { KnotTissue } from './knotTissue';
import { ClaudeKnotEngine } from './claude/ClaudeKnotEngine';
import { createKnotWorkerPort } from './worker/knotWorkerPort';
import { WorkerKnotEngine } from './worker/WorkerKnotEngine';
import { CodexKnotEngine } from './codex/CodexKnotEngine';

/**
 * Knot engine switch (2026-11-15). Free tying can run on different knot
 * implementations so they can be compared for reliability and speed:
 *  - `classic`: the event-based FreeKnotPractice (src/gameplay/FreeKnotPractice.ts);
 *  - `claude`: Claude's engine (src/knot/claude/): the classic model with robustness fixes;
 *  - `classic-worker`: the classic model in a Web Worker (src/knot/worker/);
 *  - `codex`: Claude's robust grasp with stricter event-ledger classification.
 * Chosen in Practice setup → Knot engine, or with ?knot=<id> in the link (reloads the practice).
 *
 * An engine provides everything the practice session, the scene and the demo read
 * from free tying: the members of FreeKnotPractice listed in KnotEngine.
 */
/** Tension shown for one strand (meters in the free-tying panel). */
export interface StrandTensionView {
  readonly state: string;
  readonly tautness: number;
  readonly demand: number;
  readonly peakDemand: number;
}

/** A thread grip by an instrument: which strand, at which point. */
export interface KnotGrip {
  strand: ThreadStrand;
  index: number;
}

/**
 * Everything the practice session, the scene and the demo use from a knot engine.
 * The classic FreeKnotPractice satisfies it directly; other engines (or a stand-in for
 * one running in a worker) provide the same members.
 */
export interface KnotEngine {
  active: boolean;
  begin(tools: readonly Instrument[], technique?: KnotTechnique | 'auto'): void;
  update(dt: number, tools: readonly Instrument[], blockedGrips?: ReadonlySet<string>): void;
  reset(): void;
  /** Optional: the tissue as data, for engines that cannot call the session's surface functions. */
  configureTissue?(tissue: KnotTissue): void;
  readonly entry: THREE.Vector3;
  readonly exit: THREE.Vector3;
  readonly long: ThreadStrand;
  readonly short: ThreadStrand;
  readonly strands: ThreadStrand[];
  readonly fragments: ThreadStrand[];
  readonly grips: Map<string, KnotGrip>;
  gripLabel(id: string): string;
  readonly sequence?: { readonly throws: readonly ThrowRecord[]; readonly technique: string; readonly label: string; readonly locked: boolean; readonly sliding: boolean; readonly requiredWraps?: number };
  readonly retainedThrow: { readonly active: boolean; readonly tightness: number; readonly phase: string };
  readonly passage: { readonly hasOpening: boolean };
  readonly lockSeated: boolean;
  readonly seatedThrows: number;
  readonly closureLoad: number;
  readonly pullDemand: number;
  readonly instruction: string;
  readonly handlingHint: string;
  readonly tensionHint: string;
  readonly tension: Record<'long' | 'short', StrandTensionView>;
  readonly reachLimited: boolean;
  readonly winding: number;
  readonly driverOnTissue: boolean;
  readonly knotAtTissue: boolean;
  readonly cutMessage: string;
  readonly trimmedTails: ReadonlySet<ThreadStrand>;
  readonly nextTrimTarget: ThreadStrand | undefined;
  minimumCut(strand: ThreadStrand): number;
  cut(strand: ThreadStrand, coordinate: number): boolean;
  surfaceAt: (p: THREE.Vector3) => number;
  threadFloorAt?: (p: THREE.Vector3) => number;
  tissueContact?: StrandObstacle;
  driverObstacle?: (radius: number) => StrandObstacle;
  padOffsetZ: number;
  tractHalfWidth: number;
}

export interface KnotEngineEntry {
  id: string;
  label: string;
  create(): KnotEngine;
}

export const DEFAULT_KNOT_ENGINE = 'classic';

export const KNOT_ENGINES: KnotEngineEntry[] = [
  { id: 'classic', label: 'Classic (event-based)', create: () => new FreeKnotPractice() },
  { id: 'claude', label: "Claude's (classic + robustness fixes)", create: () => new ClaudeKnotEngine() },
  { id: 'codex', label: 'Codex (robust grasp + event ledger)', create: () => new CodexKnotEngine() },
  // The same model in a Web Worker: drawing is not held up by the thread physics; the knot state is a frame behind.
  { id: 'classic-worker', label: 'Classic in a background thread (experimental)', create: () => new WorkerKnotEngine(createKnotWorkerPort()) },
];

/** The engine for an id (unknown ids fall back to the default). */
export function knotEngineEntry(id: string | null | undefined): KnotEngineEntry {
  return KNOT_ENGINES.find((engine) => engine.id === id) ?? KNOT_ENGINES.find((engine) => engine.id === DEFAULT_KNOT_ENGINE)!;
}

export function createKnotEngine(id: string | null | undefined): KnotEngine {
  return knotEngineEntry(id).create();
}
