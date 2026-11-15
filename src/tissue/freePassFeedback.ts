import { formatMm } from '../setup/sceneScale';
import { WOUND_X, type FreePassRecord } from './FreeNeedlePass';

/** Millimetre feedback for a free needle pass (Sandbox), e.g. "entry 7.0 mm from the edge · exit 6.8 mm · 4.0 mm deep (dermis) · crosses the wound". */
export function describeFreePass(record: FreePassRecord): string {
  const parts = [`entry ${formatMm(Math.abs(record.entry.x - WOUND_X))} from the edge`];
  if (record.exit) parts.push(`exit ${formatMm(Math.abs(record.exit.x - WOUND_X))}`);
  parts.push(`${formatMm(record.depth)} deep (${record.deepestLayer})`);
  if (record.exit) parts.push(record.crossesWound ? 'crosses the wound' : 'same side of the wound');
  return parts.join(' · ');
}
