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
