import type { ThrowRecord } from '../suture/KnotTechnique';

/**
 * Knot security and edge approximation for a finished Sandbox stitch
 * (2026-11-15). Rule-based teaching feedback from the observed throws and the
 * modelled wound; approximate, not a mechanical knot-security test.
 */

/** Throws recommended for a secure instrument tie (common teaching guidance for braided/monofilament). */
export const SECURE_THROWS = 3;
/** A knot that may slip loses this share of its closure when the stitch is finished. */
export const SLIP_CLOSURE_LOSS = 0.3;

export type KnotSecurity = 'secure' | 'may slip' | 'insecure';

export interface KnotReport {
  security: KnotSecurity;
  /** Square, granny, sliding… for the review. */
  notes: string[];
}

/** Wound tension (body-site multiple of standard) at or above which a single first throw slips back
 * when let go (roadmap: "First throws that slip back"); a double (surgeon's) first throw holds. */
export const FIRST_THROW_SLIP_TENSION = 1.2;

export function assessKnot(throws: readonly ThrowRecord[], seatedThrows: number, woundTension = 1): KnotReport {
  const notes: string[] = [];
  if (!throws.length) return { security: 'insecure', notes: ['No throws'] };
  // Consecutive single throws in the same direction after the start form a granny (slips); opposing ones are square.
  let grannies = 0;
  let squares = 0;
  for (let i = 1; i < throws.length; i++) {
    if (throws[i].wraps !== 1) continue;
    if (throws[i].direction === throws[i - 1].direction) {
      // A same-direction second throw with the post held is a deliberate sliding start.
      if (!(i === 1 && throws[i].postHeld)) grannies++;
    } else squares++;
  }
  const start = throws[0].wraps === 2 ? "surgeon's start" : throws.length > 1 && throws[1].direction === throws[0].direction ? 'sliding start' : 'square start';
  notes.push(`${start} · ${throws.length} throw${throws.length > 1 ? 's' : ''}`);
  if (squares) notes.push(`${squares} opposing (square) throw${squares > 1 ? 's' : ''}`);
  if (grannies) notes.push(`${grannies} granny throw${grannies > 1 ? 's' : ''} (same direction: slips) · reverse each throw`);
  const unseated = Math.max(0, throws.length - seatedThrows);
  if (unseated) notes.push(`${unseated} throw${unseated > 1 ? 's' : ''} not seated down on the knot · tighten each throw onto the last`);
  if (throws.length < SECURE_THROWS) notes.push(`Add throws: ${SECURE_THROWS} or more for a secure knot`);
  const slidingStart = throws.length > 1 && throws[1].direction === throws[0].direction && !!throws[1].postHeld;
  const firstSlipped = woundTension >= FIRST_THROW_SLIP_TENSION && throws[0].wraps === 1 && !slidingStart;
  if (firstSlipped) notes.push("Single first throw slipped back under the wound's tension · start with a surgeon's (double) throw");
  const security: KnotSecurity = !squares ? 'insecure' : grannies || unseated || firstSlipped || throws.length < SECURE_THROWS ? 'may slip' : 'secure';
  return { security, notes };
}

export interface EdgeReport {
  /** "Edges meet", "edges overlap", "gap" …, then eversion and level. */
  notes: string[];
  good: boolean;
}

/** Closure 0–1, eversion and mismatch from the wound model (scene units). */
export function assessEdges(closure: number, eversion: number, mismatch: number): EdgeReport {
  const notes: string[] = [];
  const meet = closure > 0.9;
  notes.push(closure > 1.02 ? 'Edges overlap · ease the knot tension' : meet ? 'Edges meet' : closure > 0.5 ? 'Small gap between the edges · tighten a little more' : 'Edges gap open · the stitch is not closing the wound');
  const everted = eversion > EVERTED_ABOVE;
  notes.push(everted ? 'Edges everted (good)' : eversion < -0.002 ? 'Edges inverted · take a wider, deeper bite' : 'Edges flat · aim for slight eversion (wider at depth than at the surface)');
  const level = Math.abs(mismatch) < 0.006;
  notes.push(level ? 'Edges level' : `${mismatch > 0 ? 'Left' : 'Right'} edge higher · match bite depth on both sides`);
  return { notes, good: meet && everted && level };
}

/** Edge eversion above this (scene units) counts as everted (as `assessEdges`). */
export const EVERTED_ABOVE = 0.004;

/** Vessel eversion across the saved anastomosis stitches (roadmap "Vessel eversion", 2026-11-27). */
export function describeVesselEversion(eversions: readonly number[]) {
  if (!eversions.length) return '';
  const everted = eversions.filter((e) => e > EVERTED_ABOVE).length;
  const inverted = eversions.map((e, i) => ({ e, stitch: i + 1 })).filter((x) => x.e < -0.002).map((x) => x.stitch);
  return `Vessel eversion: ${everted}/${eversions.length} stitches everted${inverted.length ? ` · inverted at stitch ${inverted.join(', ')}` : ''}`;
}
