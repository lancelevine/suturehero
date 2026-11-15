import { expect, it } from 'vitest';
import { Choreography } from './choreography';

it('runs segments in order over their durations with captions and start hooks', () => {
  const log: string[] = [];
  const c = new Choreography([
    { caption: 'A', seconds: 1, start: () => log.push('start A'), apply: (t) => log.push(`A ${t.toFixed(2)}`) },
    { seconds: 0.5, start: () => log.push('start B'), apply: (t) => log.push(`B ${t.toFixed(2)}`) },
  ]);
  expect(c.step(0.5)).toBe(true);
  expect(c.caption).toBe('A');
  expect(c.step(0.6)).toBe(true);
  expect(c.step(1)).toBe(false);
  expect(c.finished).toBe(true);
  expect(log).toEqual(['start A', 'A 0.50', 'A 1.00', 'start B', 'B 1.00']);
});

it('ends a segment early when it is done', () => {
  let count = 0;
  const c = new Choreography([{ seconds: 10, apply: () => count++, done: () => count >= 3 }, { caption: 'next', seconds: 1 }]);
  for (let i = 0; i < 3; i++) c.step(0.1);
  expect(c.caption).toBe('next');
});

it('reads a caption function after the segment starts', () => {
  let n = 0;
  const c = new Choreography([{ seconds: 1, start: () => (n = 7), caption: () => `n=${n}` }]);
  c.step(0.1);
  expect(c.caption).toBe('n=7');
});
