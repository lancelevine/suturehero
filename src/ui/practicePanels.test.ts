import { expect, it } from 'vitest';
import { markStitchSteps, tensionMeterValue, updateTensionPanel } from './practicePanels';

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
