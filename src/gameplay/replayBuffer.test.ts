import { expect, it } from 'vitest';
import { ReplayBuffer, ReplayPlayer } from './replayBuffer';

it('keeps a rolling window and finds frames by time', () => {
  const buffer = new ReplayBuffer<number>(2);
  for (let i = 0; i <= 50; i++) buffer.push(i * 0.1, i);
  expect(buffer.duration).toBeCloseTo(2, 6);
  expect(buffer.at(0)).toBe(30);
  expect(buffer.at(1.05)).toBe(40);
  expect(buffer.all().at(-1)).toBe(50);
  buffer.push(0, 99); // time went backwards: start again
  expect(buffer.length).toBe(1);
});

it('plays back at a quarter of real time and ends', () => {
  const buffer = new ReplayBuffer<number>(10);
  for (let i = 0; i <= 10; i++) buffer.push(i * 0.1, i);
  const player = new ReplayPlayer(buffer, 0.25);
  const seen: number[] = [];
  for (let k = 0; k < 100; k++) {
    const frame = player.advance(0.1);
    if (frame === null) break;
    seen.push(frame);
  }
  expect(seen[0]).toBe(0);
  expect(seen.at(-1)).toBe(10);
  // 1 s of recording at ¼ speed takes 4 s = 40 frames of 0.1 s.
  expect(seen.length).toBeGreaterThanOrEqual(40);
  expect(seen.length).toBeLessThanOrEqual(42);
});
