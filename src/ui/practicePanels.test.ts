import { expect, it } from 'vitest';
import { markStitchSteps, skinTractionText, tensionMeterValue, updateCourseButtons, updateTensionPanel } from './practicePanels';

function element() {
  const classes = new Set<string>();
  const attributes = new Map<string, string>();
  return {
    hidden: false, value: 0, textContent: '', dataset: {} as Record<string, string>,
    classList: { toggle: (name: string, on: boolean) => (on ? classes.add(name) : classes.delete(name)), contains: (name: string) => classes.has(name) },
    setAttribute: (name: string, value: string) => attributes.set(name, value),
    removeAttribute: (name: string) => attributes.delete(name),
    getAttribute: (name: string) => attributes.get(name) ?? null,
  };
}

it('weights strand tension and zeroes a released strand', () => {
  expect(tensionMeterValue({ state: 'taut', tautness: 1, demand: 0 })).toBeCloseTo(0.65);
  expect(tensionMeterValue({ state: 'released', tautness: 1, demand: 1 })).toBe(0);
});

it('fills the tension panel, or hides it without a knot', () => {
  const elements = new Map<string, ReturnType<typeof element>>();
  const query = ((selector: string) => {
    if (!elements.has(selector)) elements.set(selector, element());
    return elements.get(selector);
  }) as never;
  updateTensionPanel(query, null);
  expect(elements.get('#tension-panel')!.hidden).toBe(true);
  updateTensionPanel(query, { tension: { long: { state: 'taut', tautness: 1, demand: 1 }, short: { state: 'slack', tautness: 0, demand: 0 } }, tensionHint: 'Pull the long end' });
  expect(elements.get('#tension-panel')!.hidden).toBe(false);
  expect(elements.get('#long-tension')!.value).toBeCloseTo(1);
  expect(elements.get('#short-tension-state')!.textContent).toBe('slack');
  expect(elements.get('#long-tension')!.getAttribute('aria-label')).toBe('long strand: taut');
  expect(elements.get('#tension-cue')!.textContent).toBe('Pull the long end');
});

it('marks the current and earlier stitch steps', () => {
  const steps = [1, 2, 3].map((n) => Object.assign(element(), { dataset: { stitchStep: String(n) } }));
  markStitchSteps(steps as unknown as HTMLElement[], 2);
  expect(steps.map((s) => [s.classList.contains('done'), s.classList.contains('active'), s.getAttribute('aria-current')])).toEqual([[true, false, null], [false, true, 'step'], [false, false, null]]);
});

it('labels the course and free-tying buttons', () => {
  const elements = new Map<string, ReturnType<typeof element> & { disabled?: boolean }>();
  const query = ((selector: string) => {
    if (!elements.has(selector)) elements.set(selector, element());
    return elements.get(selector);
  }) as never;
  updateCourseButtons(query, { skin: true, active: true, finished: false, index: 2, canAdvance: true, canFinishSandboxStitch: false, canTieFreePass: true });
  expect([elements.get('#start-course')!.disabled, elements.get('#next-stitch')!.textContent, elements.get('#free-tying')!.textContent, elements.get('#free-tying')!.disabled]).toEqual([true, 'Finish session', 'Tie knot on this stitch', true]);
  updateCourseButtons(query, { skin: true, active: false, finished: true, index: 0, canAdvance: false, canFinishSandboxStitch: true, canTieFreePass: false });
  expect([elements.get('#start-course')!.textContent, elements.get('#next-stitch')!.hidden, elements.get('#free-tying')!.textContent]).toEqual(['New 3-stitch session', true, 'Finish stitch · next']);
});

it('explains the skin hold', () => {
  const base = { alert: false, instruction: 'Ease off', held: true, ready: false, state: 'holding', progress: 0, edgesShown: false };
  expect(skinTractionText(base)).toEqual({ state: 'Gentle skin traction', hint: 'A small lift everts the skin. Shift slows movement; Q lowers the forceps.' });
  expect(skinTractionText({ ...base, progress: 0.42 }).hint).toBe('Slip buildup: 42% · Ease the pull to recover.');
  expect(skinTractionText({ ...base, alert: true, state: 'slipped' })).toEqual({ state: 'Ease off', hint: 'Open the forceps with X, use Position forceps if needed, then close Z and lift gently.' });
  expect(skinTractionText({ ...base, edgesShown: true }).hint).toMatch(/^Amber rings/);
  expect(skinTractionText({ ...base, held: false, ready: true })).toEqual({ state: 'Skin released · Traction easing', hint: 'Edge everted · Keep this gentle hold for the needle pass.' });
});
