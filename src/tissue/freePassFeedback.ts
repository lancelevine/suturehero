import { formatMm } from '../setup/sceneScale';
import type { FreePassRecord } from './FreeNeedlePass';

/** Entry angles further than this from perpendicular (degrees) get a hint. */
export const ENTRY_ANGLE_TOLERANCE_DEG = 20;

/** Plain-language note on the entry angle (90° = perpendicular to the skin). */
export function describeEntryAngle(degrees: number): string {
  const rounded = `${Math.round(degrees)}°`;
  if (degrees >= 90 - ENTRY_ANGLE_TOLERANCE_DEG) return `entered at ${rounded} (near perpendicular)`;
  return `entered at ${rounded} · aim nearer 90° (pronate the wrist to bring the tip down)`;
}

/** Entry lift above which the edge counts as everted (scene units, ≈ 0.8 mm). */
export const EVERTED_LIFT = 0.03;
/** Entries closer than this to the wound edge (scene units, ≈ 10 mm) benefit from everting it first. */
const NEAR_EDGE = 0.37;

/** Forceps technique note: was the edge everted for this entry? */
export function describeEversion(record: FreePassRecord): string | null {
  if ((record.entryLift ?? 0) > EVERTED_LIFT) return 'edge everted with the forceps (good)';
  if (record.entryEdge < NEAR_EDGE) return 'tip: evert the edge with the forceps before entering';
  return null;
}

/** Millimetre feedback for a free needle pass (Sandbox), e.g. "entry 7.0 mm from the edge · exit 6.8 mm · 4.0 mm deep (dermis) · crosses the wound". */
export function describeFreePass(record: FreePassRecord): string {
  const parts = [`entry ${formatMm(record.entryEdge)} from the edge`];
  if (record.exit) parts.push(`exit ${formatMm(record.exitEdge ?? 0)}`);
  parts.push(`${formatMm(record.depth)} deep (${record.deepestLayer})`);
  if (record.exit) parts.push(record.crossesWound ? 'crosses the wound' : 'same side of the wound');
  parts.push(describeEntryAngle(record.entryAngleDeg));
  const eversion = describeEversion(record);
  if (eversion) parts.push(eversion);
  return parts.join(' · ');
}
