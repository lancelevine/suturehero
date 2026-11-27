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
