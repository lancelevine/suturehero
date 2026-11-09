import { expect, it } from 'vitest';
import { captureDue, captureSettings, FLOW_MIN_INTERVAL_MS, FRAME_DRIVEN_STORAGE_KEY, frameDrivenEnabled, parseFrameDrivenSetting, setFrameDriven } from './captureScheduling';

it('is frame-driven for OV9281 cameras by default, never without requestVideoFrameCallback', () => {
  expect(frameDrivenEnabled('auto', 'ov9281', true)).toBe(true);
  expect(frameDrivenEnabled('auto', 'webcam1080', true)).toBe(false);
  expect(frameDrivenEnabled('on', 'webcam1080', true)).toBe(true);
  expect(frameDrivenEnabled('off', 'ov9281', true)).toBe(false);
  expect(frameDrivenEnabled('on', 'ov9281', false)).toBe(false);
  expect(parseFrameDrivenSetting('nonsense')).toBe('auto');
});

it('remembers the frame-driven setting under a versioned key', () => {
  const store = new Map<string, string>();
  const original = globalThis.localStorage;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) } });
  try {
    setFrameDriven('off');
    expect(captureSettings.frameDriven).toBe('off');
    expect(FRAME_DRIVEN_STORAGE_KEY).toMatch(/^suturehero\..*\.v\d+$/);
    expect(store.get(FRAME_DRIVEN_STORAGE_KEY)).toBe('off');
  } finally {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: original });
    captureSettings.frameDriven = 'auto';
  }
});

it('lets flow run often enough for 120 fps only when frame-driven', () => {
  const frameMs = 1000 / 120;
  expect(FLOW_MIN_INTERVAL_MS.frameDriven).toBeLessThan(frameMs);
  expect(FLOW_MIN_INTERVAL_MS.display).toBeGreaterThan(frameMs);
});

it('decides when flow and decoding are due', () => {
  const base = { now: 1000, lastFlowAt: 990, lastDecodeAt: 900, flowBusy: false, decodeBusy: false, clock: { fresh: true }, flowIntervalMs: 4, fastDecode: false };
  expect(captureDue(base)).toEqual({ doFlow: true, doDecode: false, skippedDuplicate: false });
  expect(captureDue({ ...base, clock: { fresh: false } })).toMatchObject({ doFlow: false, skippedDuplicate: true });
  expect(captureDue({ ...base, clock: null })).toMatchObject({ doFlow: false, skippedDuplicate: false }); // 33 ms without callbacks
  expect(captureDue({ ...base, fastDecode: true })).toMatchObject({ doDecode: true });
  expect(captureDue({ ...base, flowBusy: true, decodeBusy: true, fastDecode: true })).toMatchObject({ doFlow: false, doDecode: false });
});
