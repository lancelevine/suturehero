import { expect, it, vi } from 'vitest';
import { STEREO_WAITING_TEXT, stereoPairingStep, type StereoPairingDeps } from './stereoPairingStep';

function deps(overrides: Partial<StereoPairingDeps<string, string>>): StereoPairingDeps<string, string> {
  return {
    pair: () => ({ at: 10 }),
    lastFailure: () => null,
    rigid: (name) => 'pose-' + name,
    report: () => ({ note: null, fitErrorPx: null }),
    feedFitError: vi.fn(),
    lastSample: () => undefined,
    accept: vi.fn(),
    ...overrides,
  };
}

it('accepts each new pair once and reports waiting when there are no notes', () => {
  const d = deps({ lastSample: (name) => (name === 'b' ? 10 : undefined) });
  expect(stereoPairingStep(0, ['a', 'b'], d)).toEqual({ status: STEREO_WAITING_TEXT, pairingFailure: null });
  expect(d.accept).toHaveBeenCalledTimes(1);
  expect(d.accept).toHaveBeenCalledWith('a', 'pose-a', 10);
});

it('reports an unpaired frame and instrument notes without accepting poses', () => {
  const d = deps({ pair: () => null, lastFailure: () => 'too far apart', report: (name) => ({ note: name + ' lost', fitErrorPx: 2 }) });
  expect(stereoPairingStep(5, ['a'], d)).toEqual({ status: 'No time-matched camera pair: too far apart | a lost', pairingFailure: 'too far apart' });
  expect(d.accept).not.toHaveBeenCalled();
  expect(d.feedFitError).toHaveBeenCalledWith(5, 2);
});
