/**
 * Per-frame updates of practice-page panels (moved out of src/main.ts's render loop, 2026-11-27).
 * Each writes to the DOM only when a value changed.
 */
type Query = <E extends Element = Element>(selector: string) => E | null;

export interface StrandTension {
  state: string;
  tautness: number;
  demand: number;
}

/** Meter value for a strand: zero when released, else mostly tautness with some pull demand. */
export function tensionMeterValue(tension: StrandTension) {
  return tension.state === 'released' ? 0 : tension.tautness * 0.65 + tension.demand * 0.35;
}

/** The free-tying tension panel: hidden without an active knot, else both strand meters and the cue. */
export function updateTensionPanel(query: Query, knot: { tension: Record<'long' | 'short', StrandTension>; tensionHint: string } | null) {
  query<HTMLElement>('#tension-panel')!.hidden = !knot;
  if (!knot) return;
  for (const side of ['long', 'short'] as const) {
    const tension = knot.tension[side];
    const meter = query<HTMLMeterElement>(`#${side}-tension`)!;
    const value = tensionMeterValue(tension);
    if (Math.abs(meter.value - value) > 0.001) meter.value = value;
    if (meter.dataset.state !== tension.state) {
      meter.dataset.state = tension.state;
      meter.setAttribute('aria-label', `${side} strand: ${tension.state}`);
    }
    const label = query(`#${side}-tension-state`)!;
    if (label.textContent !== tension.state) label.textContent = tension.state;
  }
  const cue = query('#tension-cue')!;
  if (cue.textContent !== knot.tensionHint) cue.textContent = knot.tensionHint;
}

/** Highlight the current stitch step and mark earlier ones done. */
export function markStitchSteps(steps: Iterable<HTMLElement>, currentStep: number) {
  for (const element of steps) {
    const number = Number(element.dataset.stitchStep);
    element.classList.toggle('active', number === currentStep);
    element.classList.toggle('done', currentStep > number);
    if (number === currentStep) element.setAttribute('aria-current', 'step');
    else element.removeAttribute('aria-current');
  }
}

export interface CourseButtonState {
  /** Skin environment (the 3-stitch course is skin only). */
  skin: boolean;
  active: boolean;
  finished: boolean;
  /** Current stitch (0-based). */
  index: number;
  canAdvance: boolean;
  canFinishSandboxStitch: boolean;
  canTieFreePass: boolean;
}

/** The 3-stitch course buttons and the Free tying button. */
export function updateCourseButtons(query: Query, state: CourseButtonState) {
  const start = query<HTMLButtonElement>('#start-course')!;
  const next = query<HTMLButtonElement>('#next-stitch')!;
  start.disabled = !state.skin || (state.active && !state.finished);
  start.textContent = state.finished ? 'New 3-stitch session' : 'Start 3-stitch session';
  next.disabled = !state.canAdvance;
  next.textContent = state.index === 2 ? 'Finish session' : 'Save & next stitch';
  next.hidden = !state.active;
  const tying = query<HTMLButtonElement>('#free-tying')!;
  tying.disabled = state.active;
  const tyingText = state.canFinishSandboxStitch ? 'Finish stitch · next' : state.canTieFreePass ? 'Tie knot on this stitch' : 'Free tying lab';
  if (tying.textContent !== tyingText) tying.textContent = tyingText;
}

/** The skin-handling panel's status and hint for the forceps' hold on the wound edge. */
export function skinTractionText(input: {
  /** Traction is stretching, slipping or has slipped. */
  alert: boolean;
  instruction: string;
  held: boolean;
  ready: boolean;
  state: string;
  /** Slip buildup, 0–1. */
  progress: number;
  /** The amber/green epidermal edge rings are shown (needle pass, opposite edge required). */
  edgesShown: boolean;
}): { state: string; hint: string } {
  const state = input.alert ? input.instruction : input.held ? 'Gentle skin traction' : 'Skin released · Traction easing';
  let hint: string;
  if (input.edgesShown && !input.alert) hint = 'Amber rings mark the visible epidermal edges; green means flush. Pull D gently; E/Q adjusts surface height.';
  else if (input.state === 'slipped') hint = 'Open the forceps with X, use Position forceps if needed, then close Z and lift gently.';
  else if (input.progress > 0 && input.held) hint = `Slip buildup: ${Math.round(input.progress * 100)}% · Ease the pull to recover.`;
  else if (input.ready) hint = 'Edge everted · Keep this gentle hold for the needle pass.';
  else hint = 'A small lift everts the skin. Shift slows movement; Q lowers the forceps.';
  return { state, hint };
}

/** The Sandbox buttons over the scene: Replay ½× (with progress while replaying), Reset needle, Undo pass. */
export function updateSandboxViewTools(query: Query, state: { replaying: boolean; replayAvailable: boolean; replayProgress: number; sandbox: boolean; undoable: boolean }) {
  const replay = query<HTMLButtonElement>('#replay');
  if (replay) {
    replay.disabled = !state.replaying && !state.replayAvailable;
    const label = state.replaying ? `Stop replay ${Math.round(state.replayProgress * 100)}%` : 'Replay ½×';
    if (replay.textContent !== label) replay.textContent = label;
  }
  const reset = query<HTMLButtonElement>('#reset-needle');
  if (reset) reset.disabled = !state.sandbox;
  const undo = query<HTMLButtonElement>('#undo-pass');
  if (undo) undo.disabled = !state.sandbox || !state.undoable;
}
