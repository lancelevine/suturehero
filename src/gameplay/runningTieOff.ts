/** Running stitch tie-off (roadmap: "Running stitch tie-off"). A running line is finished by
 * leaving the last loop long and tying the free end to it. When the knot starts after a running
 * line, this grades from the loop slack captured then: the last loop should be left long enough to
 * tie to, the earlier loops should be snug (little slack along the line), and the last bite must
 * not be cinched (its loop pulled down to nothing). Approximate, from the thread's loop slack. */

/** The last loop should be left at least this long (mm of extra thread) to tie to. */
export const MIN_TIE_LOOP_MM = 1.5;
/** Earlier loops with more slack than this (mm) leave the line loose. */
export const MAX_LINE_SLACK_MM = 1;
/** A last loop at or below this (mm) has cinched the last bite. */
export const CINCHED_MM = 0.2;

export interface TieOffAssessment { lastLoopMm: number; looseLoops: number; cinched: boolean; longEnough: boolean }

/** `loopSlackMm`: slack of each loop along the running line, oldest first (the last is the loop tied to). */
export function assessTieOff(loopSlackMm: readonly number[]): TieOffAssessment | null {
  if (!loopSlackMm.length) return null;
  const lastLoopMm = loopSlackMm[loopSlackMm.length - 1];
  const looseLoops = loopSlackMm.slice(0, -1).filter((mm) => mm > MAX_LINE_SLACK_MM).length;
  return { lastLoopMm, looseLoops, cinched: lastLoopMm <= CINCHED_MM, longEnough: lastLoopMm >= MIN_TIE_LOOP_MM };
}

export function describeTieOff(a: TieOffAssessment | null) {
  if (!a) return '';
  const notes = [`Running tie-off: last loop left ${a.lastLoopMm.toFixed(1)} mm`];
  if (a.cinched) notes.push('the last bite is cinched · leave the last loop long and tie to it');
  else if (!a.longEnough) notes.push(`leave it a little longer (${MIN_TIE_LOOP_MM} mm or more) to tie to`);
  else notes.push('long enough to tie to');
  notes.push(a.looseLoops ? `${a.looseLoops} loop${a.looseLoops === 1 ? '' : 's'} slack along the line · snug the line before tying` : 'line snug');
  return notes.join(' · ');
}
