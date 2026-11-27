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
