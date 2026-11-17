import { expect, it } from 'vitest';
import { recordDecodeSearch } from './DecodeSearchMetrics';

it('records shared camera search counters and full-scan reasons', () => {
  const values = new Map<string, number>();
  const sink = { count: (name: string, amount = 1) => values.set(name, (values.get(name) ?? 0) + amount) };
  recordDecodeSearch(sink, 1, { left: 0, top: 0, width: 200, height: 100, kind: 'full', reason: 'no hints' });
  recordDecodeSearch(sink, 2, { left: 10, top: 10, width: 20, height: 30, kind: 'predicted', reason: 'flow prediction' });
  expect(values.get('Camera 1 full reason: no hints')).toBe(1);
  expect(values.get('Camera 1 searched pixels')).toBe(20_000);
  expect(values.get('Camera 2 search predicted')).toBe(1);
  expect(values.get('Camera 2 searched pixels')).toBe(600);
});
