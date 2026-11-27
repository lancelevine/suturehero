import { expect, it } from 'vitest';
import { setText } from './setText';

it('writes only changed text', () => {
  let writes = 0;
  let text = 'a';
  const element = { get textContent(): string { return text; }, set textContent(value: string) { writes++; text = value; } };
  setText(element, 'a');
  expect(writes).toBe(0);
  setText(element, 'b');
  expect([writes, text]).toEqual([1, 'b']);
  setText(null, 'c');
});

it('writes hidden and disabled only when they change', async () => {
  const { setDisabled, setHidden } = await import('./setText');
  let writes = 0;
  const element = {
    _hidden: false,
    get hidden() { return this._hidden; },
    set hidden(value: boolean) { writes++; this._hidden = value; },
    disabled: true,
  };
  setHidden(element, false);
  setHidden(element, true);
  setDisabled(element, true);
  expect([writes, element.hidden, element.disabled]).toEqual([1, true, true]);
});

it('rewrites markup and attributes only when they change', async () => {
  const { setAttr, setMarkup } = await import('./setText');
  let markupWrites = 0;
  let attributeWrites = 0;
  const attributes = new Map<string, string>();
  const element = {
    set innerHTML(_html: string) { markupWrites++; },
    getAttribute: (name: string) => attributes.get(name) ?? null,
    setAttribute: (name: string, value: string) => { attributeWrites++; attributes.set(name, value); },
  } as unknown as Element;
  setMarkup(element, '<b>a</b>');
  setMarkup(element, '<b>a</b>');
  setMarkup(element, '<b>b</b>');
  setAttr(element, 'title', 'x');
  setAttr(element, 'title', 'x');
  expect([markupWrites, attributeWrites]).toEqual([2, 1]);
});
