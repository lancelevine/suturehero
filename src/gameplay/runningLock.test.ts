import { describe, expect, it } from 'vitest';
import { describeLocks, RunningLockTracker } from './runningLock';

const exit = { x: -0.2, y: 0.41, z: 0.3 };
const at = (dx: number, dy: number) => ({ x: exit.x + dx, y: exit.y + dy, z: exit.z });

describe('running lock tracker', () => {
  it('locks when the tip drops through the zone above the newest exit, out of tissue, with a running thread', () => {
    const tracker = new RunningLockTracker();
    const newest = { order: 4, exit };
    expect(tracker.update(newest, 2, at(0, 0.3), false)).toBe(false);
    expect(tracker.update(newest, 2, at(0.05, 0.02), false)).toBe(true);
    expect(tracker.locked.has(4)).toBe(true);
  });

  it('ignores an unthreaded pass, a tip that is in tissue, or one that does not come from above', () => {
    const tracker = new RunningLockTracker();
    const newest = { order: 1, exit };
    tracker.update(newest, 0, at(0, 0.3), false);
    expect(tracker.update(newest, 0, at(0, 0), false)).toBe(false);
    tracker.update(newest, 2, at(0, 0.3), true);
    expect(tracker.update(newest, 2, at(0, 0), true)).toBe(false);
    tracker.update(newest, 2, at(0.5, 0.3), false);
    expect(tracker.update(newest, 2, at(0, 0), false)).toBe(false);
    tracker.keepOnly([]);
    expect(tracker.locked.size).toBe(0);
  });

  it('summarises locks, uneven tension and strangling locks', () => {
    expect(describeLocks([])).toBe('');
    expect(describeLocks([{ locked: false, slackMm: 1 }])).toContain('0/1');
    const text = describeLocks([{ locked: true, slackMm: 1 }, { locked: true, slackMm: 1.2 }, { locked: true, slackMm: 0.1 }, { locked: false, slackMm: 1 }]);
    expect(text).toContain('3/4 stitches locked');
    expect(text).toContain('strangle');
  });
});
