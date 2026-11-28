import { SCENE_MM_PER_UNIT } from '../setup/sceneScale';

/**
 * Tension hold on running stitches (roadmap, 2026-11-28): how much extra thread each earlier loop
 * of a running stitch has taken while the thread was not held taut (src/suture/FreeThreadGuide.ts).
 * Approximate millimetres from the thread model.
 */
export const SLACK_LOOP_MM = 2;

export function describeTensionHold(slackUnits: readonly number[]) {
  if (!slackUnits.length) return '';
  const slackMm = slackUnits.map((u) => u * SCENE_MM_PER_UNIT);
  const slack = slackMm.map((mm, i) => ({ mm, loop: i + 1 })).filter((l) => l.mm > SLACK_LOOP_MM);
  if (!slack.length) return `Running loops: ${slackMm.length} snug · keep the thread taut between bites`;
  return `Running loops: ${slackMm.length - slack.length} snug · slack at loop ${slack.map((l) => `${l.loop} (+${l.mm.toFixed(1)} mm)`).join(', ')} · pull the thread taut before the next bite`;
}
