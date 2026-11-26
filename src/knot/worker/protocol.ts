import type { KnotTissue } from '../knotTissue';

/**
 * Messages between the main thread and a knot engine in a worker (2026-11-15).
 * The main thread sends the instruments and the tissue each frame; the worker runs the
 * classic knot model and answers with a snapshot of everything the app reads from it.
 */

export interface ToolState {
  id: string;
  position: [number, number, number];
  quaternion: [number, number, number, number];
  openness: number;
}

export interface KnotFrame {
  tools: ToolState[];
  entry: [number, number, number];
  exit: [number, number, number];
  tissue: KnotTissue;
  padOffsetZ: number;
  tractHalfWidth: number;
}

/** A display frame the worker has not seen yet: its time step and the instruments then. */
export interface BacklogFrame {
  dt: number;
  tools: ToolState[];
}

/** Which knot model the worker runs (default: classic). */
export type WorkerModel = 'classic' | 'claude';

export type KnotRequest =
  | ({ type: 'begin'; technique: string | undefined; model?: WorkerModel } & KnotFrame)
  | ({
      type: 'update';
      dt: number;
      blocked: string[] | null;
      /**
       * Frames since the last update the worker saw, oldest first, replayed before this one
       * (2026-11-26). Each keeps its own jaw openings, so a grasp or release made while the
       * worker was behind is not lost.
       */
      backlog?: BacklogFrame[];
    } & KnotFrame)
  | { type: 'reset' }
  | { type: 'cut'; strand: number; coordinate: number };

export interface StrandState {
  length: number;
  /** x, y, z per point. */
  points: Float32Array;
}

export interface ThrowState {
  wraps: number;
  direction: number;
  postHeld: boolean;
}

export interface KnotSnapshot {
  active: boolean;
  /** long, short, then any cut-off fragments. */
  strands: StrandState[];
  grips: Array<{ tool: string; strand: number; index: number; label: string }>;
  sequence: { throws: ThrowState[]; technique: string; label: string; locked: boolean; sliding: boolean } | null;
  retained: { active: boolean; tightness: number; phase: string };
  passageOpening: boolean;
  lockSeated: boolean;
  seatedThrows: number;
  closureLoad: number;
  pullDemand: number;
  instruction: string;
  handlingHint: string;
  tensionHint: string;
  tension: Record<'long' | 'short', { state: string; tautness: number; demand: number; peakDemand: number }>;
  reachLimited: boolean;
  winding: number;
  driverOnTissue: boolean;
  knotAtTissue: boolean;
  cutMessage: string;
  /** Indices (into strands) of trimmed tails. */
  trimmed: number[];
  /** minimumCut per strand. */
  minimumCut: number[];
  /** Index of the next tail to trim, or −1. */
  nextTrim: number;
  /** How the knot model moved each tool this frame (e.g. the driver kept off the skin). */
  corrections: Array<{ id: string; delta: [number, number, number] }>;
  /** For diagnostics: the knot's contact with the skin, model time, and physics updates run. */
  diagnostics: { seatContact: boolean; seatLoad: number; entry: [number, number, number]; updates: number; simulatedSeconds: number };
}
