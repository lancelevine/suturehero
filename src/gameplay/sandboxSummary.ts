import { formatMm, SCENE_MM_PER_UNIT } from '../setup/sceneScale';
import type { FreePassRecord } from '../tissue/FreeNeedlePass';

/**
 * Sandbox session summary, instructor targets and progress over time
 * (2026-11-15). Practice feedback in approximate millimetres; not a validated
 * assessment.
 */

export interface SandboxStitchInfo {
  siteZ: number;
  review: readonly string[];
}

export interface SandboxSummary {
  at: string;
  passes: number;
  tears: number;
  cutThroughs: number;
  /** Mean distance of entries and exits from the wound edge (mm). */
  meanBiteMm: number | null;
  /** Largest difference between a pass's entry and exit distances (mm): symmetry. */
  worstAsymmetryMm: number | null;
  meanDepthMm: number | null;
  meanEntryAngleDeg: number | null;
  /** Share of completed passes that cross the wound (0–1). */
  crossingShare: number | null;
  stitches: number;
  secureKnots: number;
  /** Gaps between neighbouring tied stitches along the wound (mm), in order along it. */
  spacingMm: number[];
}

const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);
const mm = (units: number) => units * SCENE_MM_PER_UNIT;

export function summarizeSandbox(passes: readonly FreePassRecord[], torn: readonly FreePassRecord[], stitches: readonly SandboxStitchInfo[], at = new Date().toISOString()): SandboxSummary {
  const bites = passes.flatMap((p) => [p.entryEdge, ...(p.exitEdge !== null ? [p.exitEdge] : [])]).map(mm);
  const asymmetry = passes.filter((p) => p.exitEdge !== null).map((p) => Math.abs(mm(p.entryEdge) - mm(p.exitEdge!)));
  const sorted = [...stitches].sort((a, b) => a.siteZ - b.siteZ);
  return {
    at,
    passes: passes.length,
    tears: torn.filter((p) => !p.cutThrough).length,
    cutThroughs: torn.filter((p) => p.cutThrough).length,
    meanBiteMm: mean(bites),
    worstAsymmetryMm: asymmetry.length ? Math.max(...asymmetry) : null,
    meanDepthMm: mean(passes.map((p) => mm(p.depth))),
    meanEntryAngleDeg: mean(passes.map((p) => p.entryAngleDeg)),
    crossingShare: passes.length ? passes.filter((p) => p.crossesWound).length / passes.length : null,
    stitches: stitches.length,
    secureKnots: stitches.filter((s) => s.review.some((line) => line.startsWith('Knot: secure'))).length,
    spacingMm: sorted.slice(1).map((s, i) => mm(s.siteZ - sorted[i].siteZ)),
  };
}

/** Plain-language spacing review for tied Sandbox stitches (sorted along the wound). */
export function describeSpacing(spacingMm: readonly number[]): string {
  if (!spacingMm.length) return 'Tie two stitches to review spacing.';
  const label = spacingMm.map((g) => `${g.toFixed(1)} mm`).join(' / ');
  if (spacingMm.length === 1) return `Stitch spacing: ${label}`;
  const spread = (Math.max(...spacingMm) - Math.min(...spacingMm)) / Math.max(...spacingMm);
  return `${spread < 0.2 ? 'Even' : 'Uneven'} spacing · ${label}`;
}

/** Instructor targets (all mm or degrees). */
export interface SandboxTargets {
  biteMinMm: number;
  biteMaxMm: number;
  maxAsymmetryMm: number;
  minEntryAngleDeg: number;
  maxTears: number;
  /** Largest allowed spread between stitch gaps (mm). */
  maxSpacingSpreadMm: number;
}

/** Defaults: common skin teaching guidance (bites ≈ 4–8 mm, symmetric, near-perpendicular entry). */
export const DEFAULT_TARGETS: SandboxTargets = { biteMinMm: 4, biteMaxMm: 8, maxAsymmetryMm: 2, minEntryAngleDeg: 70, maxTears: 0, maxSpacingSpreadMm: 2 };

export interface TargetResult {
  label: string;
  met: boolean | null;
  detail: string;
}

export function checkTargets(summary: SandboxSummary, targets: SandboxTargets): TargetResult[] {
  const n = (v: number | null, f = 1) => (v === null ? 'n/a' : v.toFixed(f));
  const spread = summary.spacingMm.length > 1 ? Math.max(...summary.spacingMm) - Math.min(...summary.spacingMm) : null;
  return [
    { label: `Bite ${targets.biteMinMm}–${targets.biteMaxMm} mm`, met: summary.meanBiteMm === null ? null : summary.meanBiteMm >= targets.biteMinMm && summary.meanBiteMm <= targets.biteMaxMm, detail: summary.meanBiteMm === null ? 'no passes yet' : `mean ${n(summary.meanBiteMm)} mm` },
    { label: `Symmetric within ${targets.maxAsymmetryMm} mm`, met: summary.worstAsymmetryMm === null ? null : summary.worstAsymmetryMm <= targets.maxAsymmetryMm, detail: summary.worstAsymmetryMm === null ? 'no passes yet' : `worst ${n(summary.worstAsymmetryMm)} mm` },
    { label: `Entry angle ≥ ${targets.minEntryAngleDeg}°`, met: summary.meanEntryAngleDeg === null ? null : summary.meanEntryAngleDeg >= targets.minEntryAngleDeg, detail: summary.meanEntryAngleDeg === null ? 'no passes yet' : `mean ${n(summary.meanEntryAngleDeg, 0)}°` },
    { label: `Tears ≤ ${targets.maxTears}`, met: summary.passes + summary.tears + summary.cutThroughs === 0 ? null : summary.tears + summary.cutThroughs <= targets.maxTears, detail: `${summary.tears} torn · ${summary.cutThroughs} cut through` },
    { label: `Even spacing (within ${targets.maxSpacingSpreadMm} mm)`, met: spread === null ? null : spread <= targets.maxSpacingSpreadMm, detail: spread === null ? 'tie 3 stitches' : `spread ${spread.toFixed(1)} mm` },
  ];
}

export const TARGETS_STORAGE_KEY = 'suturehero.sandboxTargets.v1';
export const PROGRESS_STORAGE_KEY = 'suturehero.sandboxProgress.v1';
/** Saved sessions kept in progress history. */
export const PROGRESS_LIMIT = 50;

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function loadTargets(storage: StorageLike | null): SandboxTargets {
  try {
    const saved = JSON.parse(storage?.getItem(TARGETS_STORAGE_KEY) ?? 'null') as Partial<SandboxTargets> | null;
    const merged = { ...DEFAULT_TARGETS };
    if (saved && typeof saved === 'object') for (const key of Object.keys(DEFAULT_TARGETS) as (keyof SandboxTargets)[]) if (Number.isFinite(saved[key])) merged[key] = saved[key]!;
    return merged;
  } catch {
    return { ...DEFAULT_TARGETS };
  }
}

export function saveTargets(storage: StorageLike | null, targets: SandboxTargets) {
  try {
    storage?.setItem(TARGETS_STORAGE_KEY, JSON.stringify(targets));
  } catch {
    // Blocked storage: targets last until reload.
  }
}

export function loadProgress(storage: StorageLike | null): SandboxSummary[] {
  try {
    const saved = JSON.parse(storage?.getItem(PROGRESS_STORAGE_KEY) ?? '[]');
    return Array.isArray(saved) ? (saved as SandboxSummary[]).filter((s) => s && typeof s.at === 'string') : [];
  } catch {
    return [];
  }
}

export function appendProgress(storage: StorageLike | null, summary: SandboxSummary): SandboxSummary[] {
  const history = [...loadProgress(storage), summary].slice(-PROGRESS_LIMIT);
  try {
    storage?.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(history));
  } catch {
    // Blocked storage.
  }
  return history;
}

/** Trend over the last few saved sessions, e.g. "Last 5 sessions · targets met 2 → 4 · tears 3 → 0". */
export function describeTrend(history: readonly SandboxSummary[], targets: SandboxTargets, window = 5): string {
  const recent = history.slice(-window);
  if (recent.length < 2) return recent.length ? '1 saved session · save more to see a trend' : 'No saved sessions yet';
  const met = (s: SandboxSummary) => checkTargets(s, targets).filter((r) => r.met).length;
  const first = recent[0], last = recent[recent.length - 1];
  const bite = (s: SandboxSummary) => (s.meanBiteMm === null ? 'n/a' : formatMm(s.meanBiteMm / SCENE_MM_PER_UNIT));
  return `Last ${recent.length} sessions · targets met ${met(first)} → ${met(last)} · tears ${first.tears + first.cutThroughs} → ${last.tears + last.cutThroughs} · mean bite ${bite(first)} → ${bite(last)}`;
}
