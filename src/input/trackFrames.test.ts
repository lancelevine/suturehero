import { describe, expect, it } from 'vitest';
import { TrackFrames, type FrameLike } from './trackFrames';

class Frame implements FrameLike {
  open = 1;
  constructor(readonly id: number, private root: Frame | null = null) {}
  clone(): Frame {
    const base = this.root ?? this;
    base.open++;
    return new Frame(this.id, base);
  }
  close() {
    (this.root ?? this).open--;
  }
}

function source() {
  const waiting: Array<(r: { done: boolean; value?: Frame }) => void> = [];
  let stopped = false;
  return {
    push: (frame: Frame | null) => waiting.shift()!(frame ? { done: false, value: frame } : { done: true }),
    get stopped() {
      return stopped;
    },
    open: () => ({
      reader: { read: () => new Promise<{ done: boolean; value?: Frame }>((resolve) => waiting.push(resolve)), cancel: async () => undefined },
      stop: () => {
        stopped = true;
      },
    }),
  };
}
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('track frames', () => {
  it('keeps only the newest frame and calls back once per frame', async () => {
    const s = source();
    const frames = new TrackFrames<Frame>();
    let calls = 0;
    expect(frames.start(s.open, () => calls++)).toBe(true);
    const a = new Frame(1);
    const b = new Frame(2);
    await tick();
    s.push(a);
    await tick();
    s.push(b);
    await tick();
    expect(calls).toBe(2);
    expect(a.open).toBe(0);
    const taken = frames.takeLatest()!;
    expect(taken.id).toBe(2);
    expect(b.open).toBe(2);
    taken.close();
    expect(b.open).toBe(1);
  });

  it('releases the frame and the cloned track when stopped or when the track ends', async () => {
    const s = source();
    const frames = new TrackFrames<Frame>();
    frames.start(s.open, () => undefined);
    const a = new Frame(1);
    await tick();
    s.push(a);
    await tick();
    frames.stop();
    expect(a.open).toBe(0);
    expect(s.stopped).toBe(true);
    expect(frames.active).toBe(false);
    expect(frames.takeLatest()).toBeNull();

    const s2 = source();
    frames.start(s2.open, () => undefined);
    await tick();
    s2.push(null);
    await tick();
    expect(frames.active).toBe(false);
    expect(s2.stopped).toBe(true);
  });

  it('reports false when the track cannot be opened', () => {
    expect(new TrackFrames<Frame>().start(() => null, () => undefined)).toBe(false);
  });
});
