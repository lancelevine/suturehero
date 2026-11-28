/**
 * In-scene HUD (2026-11-27, "Practice. Play. Get better." mockup): a centred timer pill, a live
 * stat card (precision, tension, progress) and a challenge card, floating over the 3D view.
 * Display only: it reads values the session already computes and changes no scoring.
 */

/** Challenge goals shown on the card (display targets, not scoring rules). */
export const SANDBOX_GOAL_STITCHES = 6;
export const COURSE_GOAL_STITCHES = 3;
/** Microsurgery: sutures in an end-to-end anastomosis, and the alignment target (mm). */
export const MICRO_GOAL_STITCHES = 8;
export const MICRO_ALIGNMENT_TARGET_MM = 0.2;
export const GOAL_SECONDS = 10 * 60;
/** Target entry/exit symmetry (mm) shown as "within ±…" and used for the precision bar. */
export const PRECISION_TARGET_MM = 1;
/** How often the HUD refreshes (ms). */
export const HUD_REFRESH_MS = 250;

export interface HudInput {
  seconds: number;
  /** Entry/exit symmetry of the last completed pass (mm), when there is one. */
  precisionMm: number | null;
  /** Held strand tautness, 0–1, while tying; null otherwise. */
  tension: number | null;
  stitches: number;
  /** In the 3-stitch course (else the Sandbox challenge). */
  course: boolean;
  /** Microsurgery: remaining gap plus edge step between the vessel ends (mm) and closure (0–1). */
  micro?: { alignmentMm: number; closure: number; /** Suggested stitch count for this vessel (default MICRO_GOAL_STITCHES). */ goal?: number };
  /** Personal best for this challenge (s), if any (src/gameplay/personalBest.ts). */
  bestSeconds?: number;
}

export interface HudState {
  timer: string;
  precision: { value: string; fraction: number; good: boolean };
  tension: { value: string; fraction: number };
  progress: { value: string; goal: number; done: number };
  challenge: { title: string; lines: Array<{ text: string; met: boolean | null }> };
  /** Microsurgery readouts (alignment, score) instead of precision and tension. */
  micro: { alignment: { value: string; fraction: number; good: boolean }; score: { value: string; fraction: number } } | null;
}

export function formatClock(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function hudState(input: HudInput): HudState {
  const goal = input.micro ? (input.micro.goal ?? MICRO_GOAL_STITCHES) : input.course ? COURSE_GOAL_STITCHES : SANDBOX_GOAL_STITCHES;
  const done = Math.min(goal, input.stitches);
  const precision = input.precisionMm;
  const withinPrecision = precision === null ? null : precision <= PRECISION_TARGET_MM;
  return {
    timer: formatClock(input.seconds),
    precision: {
      value: precision === null ? '–' : `${precision.toFixed(1)} mm`,
      fraction: precision === null ? 0 : clamp01(1 - precision / (PRECISION_TARGET_MM * 3)),
      good: withinPrecision === true,
    },
    tension: {
      value: input.tension === null ? '–' : `${Math.round(clamp01(input.tension) * 100)}%`,
      fraction: input.tension === null ? 0 : clamp01(input.tension),
    },
    progress: { value: `${done}/${goal}`, goal, done },
    challenge: {
      title: (input.micro ? 'Anastomosis' : input.course ? '3-stitch course' : 'Sandbox challenge') + (input.bestSeconds !== undefined ? ` · best ${formatClock(input.bestSeconds)}` : ''),
      lines: [
        { text: `Place ${goal} sutures`, met: done >= goal ? true : null },
        { text: `Within ${formatClock(GOAL_SECONDS)}`, met: input.seconds <= GOAL_SECONDS ? (done >= goal ? true : null) : false },
        input.micro
          ? { text: `Align within ${MICRO_ALIGNMENT_TARGET_MM.toFixed(1)} mm`, met: input.micro.alignmentMm <= MICRO_ALIGNMENT_TARGET_MM ? true : null }
          : { text: `Within ±${PRECISION_TARGET_MM.toFixed(1)} mm`, met: withinPrecision },
      ],
    },
    micro: input.micro
      ? {
          alignment: {
            value: `≈${input.micro.alignmentMm.toFixed(2)} mm`,
            fraction: clamp01(1 - input.micro.alignmentMm / (MICRO_ALIGNMENT_TARGET_MM * 10)),
            good: input.micro.alignmentMm <= MICRO_ALIGNMENT_TARGET_MM,
          },
          score: { value: `${Math.round(clamp01(input.micro.closure) * 100)}%`, fraction: clamp01(input.micro.closure) },
        }
      : null,
  };
}

const STOPWATCH = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 13V9M10 2h4M19 6l-1.5 1.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/></svg>';
const ICONS = {
  precision: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="2.5" fill="currentColor"/></svg>',
  tension: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h4l2-5 4 10 2-5h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>',
  progress: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18L10 6l4 8 2-4 4 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>',
};

/** Build the HUD inside the 3D view and keep it updated from `read`. */
export function mountPracticeHud(viewport: HTMLElement, read: () => HudInput) {
  const hud = document.createElement('div');
  hud.className = 'practice-hud';
  hud.innerHTML = `
<div class="hud-timer" role="timer" aria-label="Session time">${STOPWATCH}<span data-hud="timer">0:00</span></div>
<section class="hud-card hud-stats" aria-label="Live stats">
  <div class="hud-stat"><span class="hud-icon">${ICONS.precision}</span><span class="hud-label" data-hud="label-precision" title="Precision: entry/exit symmetry of the last needle pass. Alignment (microsurgery): remaining gap plus edge step between the vessel ends">Precision</span><strong data-hud="precision">–</strong><span class="hud-bar"><i data-hud-bar="precision"></i></span></div>
  <div class="hud-stat"><span class="hud-icon">${ICONS.tension}</span><span class="hud-label" data-hud="label-tension" title="Tension: how taut the held strand is while tying. Score (microsurgery): how fully the vessel ends are brought together">Tension</span><strong data-hud="tension">–</strong><span class="hud-bar"><i data-hud-bar="tension"></i></span></div>
  <div class="hud-stat"><span class="hud-icon">${ICONS.progress}</span><span class="hud-label">Progress</span><strong data-hud="progress">0/0</strong><span class="hud-segments" data-hud="segments"></span></div>
</section>
<section class="hud-card hud-challenge" aria-label="Challenge"><span class="hud-eyebrow">CHALLENGE</span><strong data-hud="challenge-title"></strong><ul data-hud="challenge"></ul></section>`;
  viewport.append(hud);
  // Elements are looked up once; values are written only when they change.
  const elements = new Map<string, HTMLElement>();
  const find = (selector: string) => {
    let element = elements.get(selector);
    if (!element) {
      element = hud.querySelector<HTMLElement>(selector)!;
      elements.set(selector, element);
    }
    return element;
  };
  const text = (key: string, value: string) => {
    const element = find(`[data-hud="${key}"]`);
    if (element.textContent !== value) element.textContent = value;
  };
  const bar = (key: string, fraction: number, good = true) => {
    const element = find(`[data-hud-bar="${key}"]`);
    const width = `${Math.round(fraction * 100)}%`;
    if (element.style.width !== width) element.style.width = width;
    element.classList.toggle('warn', !good);
  };
  let segmentKey = '';
  let challengeKey = '';
  const render = () => {
    const state = hudState(read());
    text('timer', state.timer);
    const first = state.micro ? state.micro.alignment : state.precision;
    text('label-precision', state.micro ? 'Alignment' : 'Precision');
    text('precision', first.value);
    bar('precision', first.fraction, first.good || first.value === '–');
    find('[data-hud="precision"]').classList.toggle('good', first.good);
    text('label-tension', state.micro ? 'Score' : 'Tension');
    text('tension', state.micro ? state.micro.score.value : state.tension.value);
    bar('tension', state.micro ? state.micro.score.fraction : state.tension.fraction);
    text('progress', state.progress.value);
    const key = `${state.progress.done}/${state.progress.goal}`;
    if (key !== segmentKey) {
      segmentKey = key;
      find('[data-hud="segments"]').innerHTML = Array.from({ length: state.progress.goal }, (_, i) => `<i class="${i < state.progress.done ? 'done' : ''}"></i>`).join('');
    }
    text('challenge-title', state.challenge.title);
    const lines = JSON.stringify(state.challenge.lines);
    if (lines !== challengeKey) {
      challengeKey = lines;
      find('[data-hud="challenge"]').innerHTML = state.challenge.lines.map((line) => `<li class="${line.met === true ? 'met' : line.met === false ? 'missed' : ''}"><span>${line.met === true ? '✓' : line.met === false ? '✗' : '○'}</span>${line.text}</li>`).join('');
    }
  };
  render();
  setInterval(render, HUD_REFRESH_MS);
  return hud;
}
