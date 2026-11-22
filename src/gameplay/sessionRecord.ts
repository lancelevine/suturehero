import type { SandboxSummary } from './sandboxSummary';

/**
 * Session results for teaching and research (2026-11-23): what each completed stitch's
 * knot was, how long it took, who was practising, and CSV exports that open in a
 * spreadsheet. Practice measures from the simulation; approximate, not a validated
 * assessment.
 */

export interface KnotSummary {
  /** Recognised technique (surgeon, square, sliding, …), or 'guided' for the scripted knot. */
  technique: string;
  /** Each throw: wraps and direction (+1 / −1). */
  throws: { wraps: number; direction: number }[];
  locked: boolean;
  /** 'secure', 'may slip', … from the stitch outcome, when assessed. */
  security: string | null;
  /** Knot engine id (Practice setup → Knot engine). */
  engine: string;
}

export interface StitchMeta {
  completedAt: string;
  /** Seconds from the start of the session to this stitch's completion. */
  secondsFromStart: number;
  /** Seconds since the previous stitch (or the session start). */
  secondsForStitch: number;
  knot: KnotSummary | null;
}

export interface KnotSequenceLike {
  technique: string;
  locked: boolean;
  throws: readonly { wraps: number; direction: number }[];
}

export function knotSummary(sequence: KnotSequenceLike | undefined, engine: string, security: string | null = null): KnotSummary | null {
  if (!sequence || !sequence.throws.length) return null;
  return {
    technique: sequence.technique,
    throws: sequence.throws.map((t) => ({ wraps: t.wraps, direction: t.direction })),
    locked: sequence.locked,
    security,
    engine,
  };
}

/** Wall-clock timing of stitches within a practice session. */
export class SessionClock {
  private startedAt: number;
  private lastAt: number;
  constructor(private readonly now: () => number = () => Date.now()) {
    this.startedAt = this.lastAt = now();
  }
  restart() {
    this.startedAt = this.lastAt = this.now();
  }
  get secondsSoFar() {
    return (this.now() - this.startedAt) / 1000;
  }
  /** Timing for a stitch completed now; the next stitch is timed from here. */
  stitchDone(knot: KnotSummary | null): StitchMeta {
    const at = this.now();
    const meta: StitchMeta = {
      completedAt: new Date(at).toISOString(),
      secondsFromStart: (at - this.startedAt) / 1000,
      secondsForStitch: (at - this.lastAt) / 1000,
      knot,
    };
    this.lastAt = at;
    return meta;
  }
}

/** One CSV field: quoted when it holds a comma, quote or line break (RFC 4180). */
export function csvField(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'number' ? (Number.isFinite(value) ? String(Math.round(value * 100) / 100) : '') : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(header: readonly string[], rows: readonly (readonly unknown[])[]): string {
  return [header, ...rows].map((row) => row.map(csvField).join(',')).join('\r\n') + '\r\n';
}

export interface ExportStitch {
  number: number;
  review: readonly string[];
  meta?: StitchMeta;
}

const throwsText = (knot: KnotSummary | null | undefined) =>
  knot ? knot.throws.map((t) => `${t.wraps}${t.direction > 0 ? '+' : t.direction < 0 ? '-' : ''}`).join(' ') : '';

/** One row per completed stitch. */
export function stitchesCsv(stitches: readonly ExportStitch[], trainee: string, build: string): string {
  const header = ['trainee', 'build', 'stitch', 'completed_at', 'seconds_from_start', 'seconds_for_stitch', 'knot_technique', 'throws (wraps+direction)', 'locked', 'knot_security', 'knot_engine', 'review'];
  return toCsv(header, stitches.map((s) => {
    const knot = s.meta?.knot;
    return [trainee, build, s.number, s.meta?.completedAt, s.meta?.secondsFromStart, s.meta?.secondsForStitch, knot?.technique, throwsText(knot), knot ? (knot.locked ? 'yes' : 'no') : '', knot?.security, knot?.engine, s.review.join(' | ')];
  }));
}

/** A saved session's summary with who practised and for how long. */
export type SavedSession = SandboxSummary & { trainee?: string; durationSeconds?: number };

/** One row per saved session (progress over time). */
export function sessionsCsv(history: readonly SavedSession[]): string {
  const header = ['saved_at', 'trainee', 'duration_seconds', 'passes', 'tears', 'cut_throughs', 'mean_bite_mm', 'worst_entry_exit_difference_mm', 'mean_depth_mm', 'mean_entry_angle_deg', 'crossing_share', 'stitches', 'secure_knots', 'spacing_mm'];
  return toCsv(header, history.map((s) => [s.at, s.trainee, s.durationSeconds, s.passes, s.tears, s.cutThroughs, s.meanBiteMm, s.worstAsymmetryMm, s.meanDepthMm, s.meanEntryAngleDeg, s.crossingShare, s.stitches, s.secureKnots, s.spacingMm.map((g) => g.toFixed(1)).join(' ')]));
}
