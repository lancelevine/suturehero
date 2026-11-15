import { FreeKnotPractice } from '../gameplay/FreeKnotPractice';

/**
 * Knot engine switch (2026-11-15). Free tying can run on different knot
 * implementations so they can be compared for reliability and speed:
 *  - `classic`: the event-based FreeKnotPractice (src/gameplay/FreeKnotPractice.ts);
 *  - Claude's engine (src/knot/claude/) and Codex's (src/knot/codex/) register here when ready.
 * Chosen in Practice setup → Knot engine, or with ?knot=<id> in the link (reloads the practice).
 *
 * An engine provides everything the practice session, the scene and the demo read
 * from free tying: the members of FreeKnotPractice listed in KnotEngine.
 */
export type KnotEngine = Pick<
  FreeKnotPractice,
  | 'active' | 'begin' | 'update' | 'reset'
  | 'entry' | 'exit' | 'long' | 'short' | 'strands' | 'fragments'
  | 'grips' | 'gripLabel' | 'sequence' | 'retainedThrow' | 'lockSeated' | 'seatedThrows' | 'closureLoad' | 'pullDemand'
  | 'instruction' | 'handlingHint' | 'tensionHint' | 'tension' | 'reachLimited' | 'winding' | 'driverOnTissue'
  | 'surfaceAt' | 'threadFloorAt' | 'tissueContact' | 'driverObstacle' | 'padOffsetZ' | 'tractHalfWidth'
  | 'nextTrimTarget' | 'minimumCut' | 'cut' | 'cutMessage' | 'trimmedTails' | 'knotAtTissue' | 'passage'
>;

export interface KnotEngineEntry {
  id: string;
  label: string;
  create(): KnotEngine;
}

export const DEFAULT_KNOT_ENGINE = 'classic';

export const KNOT_ENGINES: KnotEngineEntry[] = [
  { id: 'classic', label: 'Classic (event-based)', create: () => new FreeKnotPractice() },
];

/** The engine for an id (unknown ids fall back to the default). */
export function knotEngineEntry(id: string | null | undefined): KnotEngineEntry {
  return KNOT_ENGINES.find((engine) => engine.id === id) ?? KNOT_ENGINES.find((engine) => engine.id === DEFAULT_KNOT_ENGINE)!;
}

export function createKnotEngine(id: string | null | undefined): KnotEngine {
  return knotEngineEntry(id).create();
}
