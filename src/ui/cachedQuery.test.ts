import { expect, it, vi } from 'vitest';
import { cachedQuery } from './cachedQuery';

it('looks an element up once while it stays on the page, and again after it is replaced', () => {
  const first = { isConnected: true }, second = { isConnected: true };
  const querySelector = vi.fn(() => first as unknown as Element);
  const query = cachedQuery({ querySelector } as unknown as Document);
  expect(query('#a')).toBe(first);
  expect(query('#a')).toBe(first);
  expect(querySelector).toHaveBeenCalledOnce();
  first.isConnected = false;
  querySelector.mockReturnValue(second as unknown as Element);
  expect(query('#a')).toBe(second);
  expect(querySelector).toHaveBeenCalledTimes(2);
});
