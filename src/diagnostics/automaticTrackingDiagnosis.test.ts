import { expect, it } from 'vitest';
import { automaticTrackingDiagnosis } from './automaticTrackingDiagnosis';

it('identifies full-scan pressure, late decode, stale results, and stereo fallback', () => {
  const findings = automaticTrackingDiagnosis({
    elapsedSeconds: 10,
    rows: [
      { name: 'Camera 1 decode worker', count: 10, rate: 1, meanMs: 100, p95Ms: 210, maxMs: 240 },
      { name: 'Camera 1 decode frame age', count: 10, rate: 1, meanMs: 150, p95Ms: 260, maxMs: 280 },
      { name: 'Camera 1 decode thresholding', count: 10, rate: 1, meanMs: 50, p95Ms: 60, maxMs: 70 },
    ],
    counters: { 'Camera 1 searched pixels': 1920 * 1080 * 15 },
  }, { camera1: { width: 1920, height: 1080 }, staleDecodeDrops: 4, stereoActive: true, stereoRejections: { needleDriver: 'pair gap too large' } });
  const text = findings.map((finding) => finding.message).join(' ');
  expect(text).toMatch(/1.5 full frames\/s/);
  expect(text).toMatch(/decode P95 is 210/);
  expect(text).toMatch(/thresholding/);
  expect(text).toMatch(/4 stale/);
  expect(text).toMatch(/Stereo fallback/);
});

it('waits for useful data and reports a healthy window without inventing accuracy', () => {
  expect(automaticTrackingDiagnosis({ elapsedSeconds: 1, rows: [], counters: {} }, {})[0].message).toMatch(/Collecting/);
  expect(automaticTrackingDiagnosis({ elapsedSeconds: 5, rows: [], counters: {} }, {})[0]).toEqual({ severity: 'good', message: 'No automatic performance warning in the current window.' });
});
