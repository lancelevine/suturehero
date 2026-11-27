import { expect, it } from 'vitest';
import { FrameCadence } from './frameCadence';

it('reports arrival rate, missed presentations, capture age and frame size', () => {
  const cadence = new FrameCadence();
  for (let i = 0; i < 10; i++) cadence.frame(1000 + i * 20, { presentedFrames: i === 9 ? 12 : i, captureTime: 1000 + i * 20 - 5, width: 1280, height: 800 });
  const report = cadence.report(1200);
  expect(report.arrivalFps).toBeCloseTo(50);
  expect(report.missedPresentations).toBe(3);
  expect(report.captureToCallback?.meanMs).toBeCloseTo(5);
  expect([report.frameWidth, report.frameHeight]).toEqual([1280, 800]);
});

it('ignores capture times from the future and resets', () => {
  const cadence = new FrameCadence('currentTime polling');
  cadence.frame(100, { captureTime: 150 });
  cadence.frame(120);
  const report = cadence.report(130);
  expect(report.source).toBe('currentTime polling');
  expect(report.captureToCallback).toBeNull();
  cadence.reset();
  expect(cadence.report(200).arrivalFps).toBeNull();
});
