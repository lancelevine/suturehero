import type { DemoStep } from './demoRunner';

/**
 * Simple interrupted suture demo (2026-11-15): the guided exercise played
 * with the same keys and buttons a learner uses (the sequence mirrors
 * scripts/check-knot.mjs). Evert the edge, drive the needle, support the
 * opposite edge, transfer and extract, tie a surgeon's knot (double throw
 * then an opposing throw), release, pull check, trim both tails.
 */

export interface DemoPage {
  /** Text of an element (empty if missing). */
  text(selector: string): string;
  /** An attribute (null if missing). */
  attribute(selector: string, name: string): string | null;
  /** Whether a button is present and enabled. */
  enabled(selector: string): boolean;
  /** Sets a range input and fires its input event. */
  setRange(selector: string, value: number): void;
}

/** Pause between stages so the audience can follow (ms). */
export const STAGE_PAUSE_MS = 700;

export function interruptedSutureDemo(page: DemoPage): DemoStep[] {
  const title = () => page.text('#exercise-title');
  const readout = () => page.text('#exercise-readout');
  const pause: DemoStep = { pause: STAGE_PAUSE_MS };
  const hold = (keys: string[], until: () => boolean, label: string, timeoutMs?: number): DemoStep[] => [{ press: keys }, { until, label, timeoutMs }, { release: keys }];
  const throwSteps = (wrapKey: string, pullKeys: string[], first: boolean): DemoStep[] => [
    { caption: first ? "Knot · double wrap around the driver (surgeon's throw)" : 'Knot · opposing single wrap (locks the knot)' },
    ...hold([wrapKey], () => title().includes('Click Position driver at tail'), 'wrap formed'),
    pause,
    { caption: 'Knot · grasp the short tail with the driver' },
    { click: 'Position driver at tail' },
    ...hold(['Comma'], () => title().includes('pull the ends apart'), 'tail grasped'),
    pause,
    { caption: 'Knot · pull the ends apart to lay the throw flat' },
    ...hold(pullKeys, () => title().includes('First throw seated') || title().includes('square-knot sequence complete'), 'throw seated'),
    pause,
  ];
  return [
    { caption: 'Simple interrupted suture · automatic demonstration' },
    pause,
    { click: 'Start guided exercise' },
    pause,
    { caption: 'Forceps grasp the right skin edge' },
    { click: '#position-forceps' },
    ...hold(['KeyZ'], () => /(?:Skin|Vessel) edge held/.test(title()), 'edge held'),
    { caption: 'Lift gently to evert the edge' },
    ...hold(['ShiftLeft', 'KeyE'], () => /(?:Skin|Vessel) edge everted/.test(title()), 'edge everted'),
    pause,
    { caption: 'Needle driver enters perpendicular to the skin and follows the needle curve' },
    { click: 'Begin needle pass' },
    ...hold(['KeyU'], () => page.attribute('#exercise-title', 'data-pass-support') === 'opposite' || title().includes('Needle emerged'), 'first side'),
    ...oppositeEdge(page, title, hold, pause),
    { caption: 'Needle tip emerges through the opposite edge' },
    pause,
    { caption: 'Release the skin, then take the needle with the forceps' },
    ...hold(['KeyX'], () => page.enabled('#position-forceps'), 'forceps open'),
    { run: () => page.setRange('#grip-point', 85) },
    { click: 'Position forceps' },
    ...hold(['KeyZ'], () => page.text('#grasp-status').includes('grip ready'), 'needle grip'),
    ...hold(['Period'], () => page.text('#grasp-status').includes('Needle held · left'), 'needle transferred'),
    { caption: 'Pull the needle through along its curve' },
    ...hold(['KeyR'], () => title().includes('fully through'), 'needle extracted'),
    pause,
    { click: 'Begin knot tying' },
    ...throwSteps('KeyR', ['KeyA', 'ArrowRight'], true),
    { click: 'Next opposing throw' },
    ...throwSteps('KeyY', ['KeyD', 'ArrowLeft'], false),
    { until: () => readout().includes('Local wound edges approximated'), label: 'edges approximated' },
    { caption: 'Wound edges approximated · release both instruments' },
    ...hold(['KeyX'], () => title().includes('Open right driver with period'), 'forceps released'),
    ...hold(['Period'], () => readout().includes('Release check: observing'), 'driver released'),
    { until: () => readout().includes('Release check: passed'), label: 'knot holds' },
    pause,
    { caption: 'Gentle pull check: the knot holds' },
    { click: 'Position driver at released tail' },
    ...hold(['Comma'], () => title().includes('Hold Left arrow'), 'tail regrasped'),
    ...hold(['ArrowLeft'], () => Number(readout().match(/Pull load: ([0-9.]+)/)?.[1]) >= 0.25, 'pull load'),
    { until: () => title().includes('Gentle pull check complete'), label: 'pull check' },
    pause,
    { caption: 'Trim both tails with the scissors' },
    { click: 'Use scissors' },
    { click: 'Position scissors at tail' },
    ...hold(['Comma'], () => readout().includes('Suture cut'), 'first tail cut'),
    pause,
    { click: 'Position scissors at tail' },
    ...hold(['Comma'], () => page.text('#stitch-quality').includes('Tails trimmed: 2/2'), 'second tail cut'),
    { caption: 'Simple interrupted suture complete' },
  ];
}

/** Supporting the opposite edge mid-pass (the skin exercise pauses for it), then finishing the needle arc. */
function oppositeEdge(page: DemoPage, title: () => string, hold: (keys: string[], until: () => boolean, label: string) => DemoStep[], pause: DemoStep): DemoStep[] {
  return [
    { caption: 'Hold the opposite edge so its surface lines up with the first' },
    ...hold(['KeyX'], () => page.enabled('#position-forceps'), 'forceps open'),
    { click: '#position-forceps' },
    ...hold(['KeyZ'], () => title().includes('Opposite edge held'), 'opposite edge held'),
    ...hold(['ShiftLeft', 'KeyD'], () => page.attribute('#exercise-title', 'data-pass-support') === 'aligned', 'edges aligned'),
    pause,
    { caption: 'Drive the needle on through the opposite edge' },
    ...hold(['KeyU'], () => title().includes('Needle emerged'), 'needle emerged'),
  ];
}
