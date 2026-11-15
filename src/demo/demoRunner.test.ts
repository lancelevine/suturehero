import { describe, expect, it } from 'vitest';
import { DemoRunner, type DemoEnvironment } from './demoRunner';

const fakeEnv = (buttons: string[] = []) => {
  let time = 0;
  const log: string[] = [];
  const env: DemoEnvironment = {
    keyDown: (c) => log.push(`down ${c}`),
    keyUp: (c) => log.push(`up ${c}`),
    click: (b) => (buttons.includes(b) ? (log.push(`click ${b}`), true) : false),
    caption: (t) => log.push(`say ${t}`),
    wait: async (ms) => void (time += ms),
    now: () => time,
  };
  return { env, log, time: () => time };
};

describe('demo runner', () => {
  it('presses keys, waits for stages, clicks buttons and releases held keys', async () => {
    const { env, log } = fakeEnv(['Begin needle pass']);
    let polls = 0;
    const result = await new DemoRunner(env).run([
      { caption: 'Evert' },
      { press: ['KeyZ'] },
      { until: () => ++polls > 3, label: 'edge held' },
      { click: 'Begin needle pass' },
      { press: ['KeyU'] },
    ]);
    expect(result).toEqual({ finished: true });
    expect(log).toEqual(['say Evert', 'down KeyZ', 'click Begin needle pass', 'down KeyU', 'up KeyZ', 'up KeyU']);
  });

  it('stops on a timeout or a missing button and says why', async () => {
    const { env } = fakeEnv();
    expect(await new DemoRunner(env).run([{ until: () => false, timeoutMs: 500, label: 'never' }])).toEqual({ finished: false, reason: 'timed out: never' });
    expect(await new DemoRunner(env).run([{ click: 'Nope' }])).toEqual({ finished: false, reason: 'button not available: Nope' });
  });

  it('can be stopped while waiting', async () => {
    const { env } = fakeEnv();
    const runner = new DemoRunner(env);
    const done = runner.run([{ press: ['KeyU'] }, { until: () => false, label: 'forever' }]);
    runner.cancel();
    expect(await done).toEqual({ finished: false, reason: 'stopped' });
    expect(runner.running).toBe(false);
  });
});
