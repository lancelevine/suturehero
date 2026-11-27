import { setHidden } from './setText';
import { stitchesCsv, type ExportStitch } from '../gameplay/sessionRecord';
import { bindTraineeInput, downloadText, exportFileName } from './traineeExport';

/**
 * Results export for the guided three-stitch course (2026-11-26): the same per-stitch CSV
 * as the Sandbox export (knot, throws, timing, review), with the trainee name. Shown below
 * the course's stitch list once a stitch is saved. Practice measures; approximate.
 */
export interface CourseExportSource {
  /** Whether a guided course is running. */
  active(): boolean;
  /** Saved course stitches with their knot and timing. */
  stitches(): readonly ExportStitch[];
  build(): string;
}

/** How often the block checks whether to show (ms). */
const REFRESH_MS = 500;

const browserStorage = () => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
};

export function mountCourseExport(after: Element, source: CourseExportSource) {
  const block = document.createElement('div');
  block.className = 'course-export';
  block.hidden = true;
  block.innerHTML = `<label>Trainee name or ID <input type="text" name="course-trainee" maxlength="80" autocomplete="off"></label>
<button type="button" data-action="course-csv">Export course stitches CSV</button>
<small>Approximate practice measures; not a validated assessment.</small>`;
  after.after(block);
  const trainee = bindTraineeInput(block.querySelector<HTMLInputElement>('input')!, browserStorage());
  block.querySelector('button')!.addEventListener('click', () => {
    downloadText(stitchesCsv(source.stitches(), trainee(), source.build()), 'text/csv', exportFileName('course', trainee(), 'csv'));
  });
  const refresh = () => {
    setHidden(block, !(source.active() && source.stitches().length > 0));
  };
  refresh();
  setInterval(refresh, REFRESH_MS);
  return block;
}
