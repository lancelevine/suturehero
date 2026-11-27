/**
 * In-scene HUD (2026-11-27, "Practice. Play. Get better." mockup): a centred timer pill, a live
 * stat card (precision, tension, progress) and a challenge card, floating over the 3D view.
 * Display only: it reads values the session already computes and changes no scoring.
 */

/** Challenge goals shown on the card (display targets, not scoring rules). */
export const SANDBOX_GOAL_STITCHES = 6;
export const COURSE_GOAL_STITCHES = 3;
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
}

export interface HudState {
  timer: string;
  precision: { value: string; fraction: number; good: boolean };
  tension: { value: string; fraction: number };
  progress: { value: string; goal: number; done: number };
  challenge: { title: string; lines: Array<{ text: string; met: boolean | null }> };
}

export function formatClock(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function hudState(input: HudInput): HudState {
  const goal = input.course ? COURSE_GOAL_STITCHES : SANDBOX_GOAL_STITCHES;
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
      title: input.course ? '3-stitch course' : 'Sandbox challenge',
      lines: [
        { text: `Place ${goal} sutures`, met: done >= goal ? true : null },
        { text: `Within ${formatClock(GOAL_SECONDS)}`, met: input.seconds <= GOAL_SECONDS ? (done >= goal ? true : null) : false },
        { text: `Within ±${PRECISION_TARGET_MM.toFixed(1)} mm`, met: withinPrecision },
      ],
    },
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
  <div class="hud-stat"><span class="hud-icon">${ICONS.precision}</span><span class="hud-label" title="Entry/exit symmetry of the last needle pass">Precision</span><strong data-hud="precision">–</strong><span class="hud-bar"><i data-hud-bar="precision"></i></span></div>
  <div class="hud-stat"><span class="hud-icon">${ICONS.tension}</span><span class="hud-label" title="How taut the held strand is while tying">Tension</span><strong data-hud="tension">–</strong><span class="hud-bar"><i data-hud-bar="tension"></i></span></div>
  <div class="hud-stat"><span class="hud-icon">${ICONS.progress}</span><span class="hud-label">Progress</span><strong data-hud="progress">0/0</strong><span class="hud-segments" data-hud="segments"></span></div>
</section>
<section class="hud-card hud-challenge" aria-label="Challenge"><span class="hud-eyebrow">CHALLENGE</span><strong data-hud="challenge-title"></strong><ul data-hud="challenge"></ul></section>`;
  viewport.append(hud);
  const text = (key: string, value: string) => {
    const element = hud.querySelector(`[data-hud="${key}"]`)!;
    if (element.textContent !== value) element.textContent = value;
  };
  const bar = (key: string, fraction: number, good = true) => {
    const element = hud.querySelector<HTMLElement>(`[data-hud-bar="${key}"]`)!;
    element.style.width = `${Math.round(fraction * 100)}%`;
    element.classList.toggle('warn', !good);
  };
  let segmentKey = '';
  let challengeKey = '';
  const render = () => {
    const state = hudState(read());
    text('timer', state.timer);
    text('precision', state.precision.value);
    bar('precision', state.precision.fraction, state.precision.good || state.precision.value === '–');
    hud.querySelector('[data-hud="precision"]')!.classList.toggle('good', state.precision.good);
    text('tension', state.tension.value);
    bar('tension', state.tension.fraction);
    text('progress', state.progress.value);
    const key = `${state.progress.done}/${state.progress.goal}`;
    if (key !== segmentKey) {
      segmentKey = key;
      hud.querySelector('[data-hud="segments"]')!.innerHTML = Array.from({ length: state.progress.goal }, (_, i) => `<i class="${i < state.progress.done ? 'done' : ''}"></i>`).join('');
    }
    text('challenge-title', state.challenge.title);
    const lines = JSON.stringify(state.challenge.lines);
    if (lines !== challengeKey) {
      challengeKey = lines;
      hud.querySelector('[data-hud="challenge"]')!.innerHTML = state.challenge.lines.map((line) => `<li class="${line.met === true ? 'met' : line.met === false ? 'missed' : ''}"><span>${line.met === true ? '✓' : line.met === false ? '✗' : '○'}</span>${line.text}</li>`).join('');
    }
  };
  render();
  setInterval(render, HUD_REFRESH_MS);
  return hud;
}
