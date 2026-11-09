import { describe, expect, it } from 'vitest';
import { CameraMovedMonitor, fitErrorFromReason, type HealthInput, holdingReasons, type InstrumentHealth, setupChecklist } from './trackingHealth';

const instrument = (change: Partial<InstrumentHealth> = {}): InstrumentHealth => ({
  label: 'Needle driver',
  lastSeenAgoMs: 10,
  neutralSaved: true,
  jawsCalibrated: true,
  depthHeld: false,
  stereoRejection: null,
  ...change,
});
const input = (change: Partial<HealthInput> = {}): HealthInput => ({
  stereoMode: false,
  camera1Running: true,
  camera2Running: false,
  stereoCalibrationProblem: null,
  pairingFailure: null,
  instruments: [instrument()],
  ...change,
});
const status = (items: ReturnType<typeof setupChecklist>) => Object.fromEntries(items.map((i) => [i.key, i.ok]));

describe('setup checklist', () => {
  it('is all ready for one camera with neutral and jaws set', () => {
    expect(status(setupChecklist(input()))).toEqual({ cameras: true, neutral: true, jaws: true });
  });

  it('needs both cameras and a calibration in stereo mode', () => {
    const items = setupChecklist(input({ stereoMode: true, stereoCalibrationProblem: 'No stereo calibration loaded' }));
    expect(status(items)).toMatchObject({ cameras: false, stereo: false });
    expect(items.find((i) => i.key === 'stereo')!.detail).toBe('No stereo calibration loaded');
  });

  it('names the instruments that still need neutral or jaws, ignoring unseen ones', () => {
    const items = setupChecklist(input({
      instruments: [instrument({ neutralSaved: false, jawsCalibrated: false }), instrument({ label: 'Forceps', lastSeenAgoMs: null, neutralSaved: false })],
    }));
    expect(items.find((i) => i.key === 'neutral')!.detail).toBe('Set neutral: Needle driver');
    expect(items.find((i) => i.key === 'jaws')!.detail).toBe('Calibrate jaws: Needle driver');
  });

  it('asks to show an instrument when none was seen, and hides jaws for the classic tracker', () => {
    expect(setupChecklist(input({ instruments: [instrument({ lastSeenAgoMs: null })] })).find((i) => i.key === 'neutral')).toMatchObject({ ok: false, detail: 'Show an instrument to the camera' });
    expect(setupChecklist(input({ instruments: [instrument({ jawsCalibrated: null })] })).some((i) => i.key === 'jaws')).toBe(false);
  });
});

describe('holding reasons', () => {
  it('is empty while tracking normally', () => {
    expect(holdingReasons(input())).toEqual([]);
  });

  it('explains lost markers, held depth, single-camera fallback and unpaired frames', () => {
    expect(holdingReasons(input({ instruments: [instrument({ lastSeenAgoMs: 2300 })] }))).toEqual(['Needle driver: holding · markers not visible for 2.3 s']);
    expect(holdingReasons(input({ instruments: [instrument({ depthHeld: true })] }))).toEqual(['Needle driver: depth held · marker too tilted or small']);
    const stereo = holdingReasons(input({ stereoMode: true, camera2Running: true, pairingFailure: 'camera 1 frame gap 176 ms', instruments: [instrument({ stereoRejection: 'fit error 3.9 px (limit 3)' })] }));
    expect(stereo).toEqual(['Stereo paused: cameras out of step (camera 1 frame gap 176 ms)', 'Needle driver: one camera only · fit error 3.9 px (limit 3)']);
  });
});

describe('camera moved monitor', () => {
  it('warns only after the fit stays poor, and clears once it recovers', () => {
    const monitor = new CameraMovedMonitor();
    for (let t = 0; t < 1000; t += 100) monitor.feed(t, 6);
    expect(monitor.check(1000)).toBeNull(); // too few samples yet
    for (let t = 1000; t < 3000; t += 100) monitor.feed(t, 6);
    expect(monitor.check(3000)).toMatch(/camera may have moved/);
    for (let t = 3000; t < 7000; t += 100) monitor.feed(t, 1);
    expect(monitor.check(7000)).toBeNull();
  });

  it('ignores brief poor fits among good ones', () => {
    const monitor = new CameraMovedMonitor();
    for (let t = 0; t < 4000; t += 100) monitor.feed(t, t % 1000 < 300 ? 6 : 1);
    expect(monitor.check(4000)).toBeNull();
  });

  it('reads the fit error from a rejection reason', () => {
    expect(fitErrorFromReason('fit error 3.9 px (limit 3), worst corner 5.5 px (limit 6)')).toBe(3.9);
    expect(fitErrorFromReason('no shared faces')).toBeNull();
  });
});
