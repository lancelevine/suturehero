import { expect, it } from 'vitest';
import { tieKnot, type TrialOptions } from '../gameplay/test-support/knotTrials';
import { KNOT_ENGINES } from './engines';

/**
 * Knot engine comparison (2026-11-16): every registered engine ties the same knots under
 * the same conditions; reports which gave the right result and the computer time per
 * second of tying. Long (tens of minutes), so it only runs when asked:
 *   KNOT_TRIALS=1 npx vitest run src/knot/engineTrials.test.ts
 * KNOT_TRIALS=quick runs a smaller matrix; KNOT_ENGINES=a,b limits the engines.
 */
const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const mode = env.KNOT_TRIALS;

interface Scenario {
  knot: string;
  throws: Array<[number, number]>;
  /** The result that counts as correct. */
  expect: (sequence: { technique: string; locked: boolean; throws: readonly { wraps: number }[] } | undefined) => boolean;
}
const SCENARIOS: Scenario[] = [
  { knot: "surgeon's", throws: [[2, 1], [1, -1]], expect: (s) => !!s && s.technique === 'surgeon' && s.locked },
  { knot: 'square', throws: [[1, 1], [1, -1]], expect: (s) => !!s && s.technique === 'square' && s.locked },
  { knot: '3-throw', throws: [[2, 1], [1, -1], [1, 1]], expect: (s) => !!s && s.locked && s.throws.length === 3 },
  // A granny (same direction twice) is not a locked square knot.
  { knot: 'granny', throws: [[1, 1], [1, 1]], expect: (s) => !!s && !s.locked },
];
const CONDITIONS: Array<{ label: string; speed: number; fps: number } & TrialOptions> =
  mode === 'quick'
    ? [{ label: '1× 60fps', speed: 1, fps: 60 }, { label: '2× 60fps jitter', speed: 2, fps: 60, jitter: 0.01 }]
    : [
        { label: '1× 60fps', speed: 1, fps: 60 },
        { label: '1× 30fps', speed: 1, fps: 30 },
        { label: '2× 60fps', speed: 2, fps: 60 },
        { label: '2× 120fps', speed: 2, fps: 120 },
        { label: '1× 60fps jitter', speed: 1, fps: 60, jitter: 0.01 },
        { label: '2× 30fps jitter', speed: 2, fps: 30, jitter: 0.01 },
      ];

it.skipIf(!mode)('compares knot engines', async () => {
  const wanted = env.KNOT_ENGINES?.split(',');
  const engines = KNOT_ENGINES.filter((e) => !wanted || wanted.includes(e.id));
  const rows: string[] = [];
  for (const engine of engines) {
    let correct = 0, total = 0, cpuMs = 0, simulated = 0;
    const failures: string[] = [];
    for (const scenario of SCENARIOS) for (const condition of CONDITIONS) {
      const started = performance.now();
      const model = await tieKnot(engine.create(), condition.speed, condition.fps, scenario.throws, condition);
      cpuMs += performance.now() - started;
      simulated += scenario.throws.length * 20 / condition.speed;
      total++;
      if (scenario.expect(model.sequence)) correct++;
      else failures.push(`${scenario.knot} @ ${condition.label} → ${model.sequence?.technique ?? 'none'}, ${model.sequence?.throws.length ?? 0} throws, locked ${!!model.sequence?.locked}`);
    }
    rows.push(`${engine.id}: ${correct}/${total} correct · ${(cpuMs / simulated).toFixed(0)} ms of computer time per second of tying${failures.length ? '\n    ' + failures.join('\n    ') : ''}`);
  }
  console.log(`KNOT ENGINE TRIALS\n${rows.join('\n')}`);
  expect(rows.length).toBe(engines.length);
}, 7200000);
