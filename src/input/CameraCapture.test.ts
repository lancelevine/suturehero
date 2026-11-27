import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CameraCapture, type CaptureEnvironment } from './CameraCapture';

const context = { drawImage: vi.fn(), getImageData: vi.fn(() => ({ width: 1, height: 1 }) as ImageData) };

beforeEach(() => {
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => context }) });
});
afterEach(() => vi.unstubAllGlobals());

function setup(useBitmapFlow: boolean) {
  const video = { videoWidth: 1280, videoHeight: 800, currentTime: 1 } as HTMLVideoElement;
  const overlay = { width: 0, height: 0 } as HTMLCanvasElement;
  const tracker = { detect: vi.fn().mockResolvedValue([]), detectBitmap: vi.fn(), store: vi.fn() };
  const env: CaptureEnvironment = {
    useBitmapFlow: () => useBitmapFlow,
    trackFramesActive: () => false,
    flowMinIntervalMs: () => 0,
    roiDecode: () => true,
    decodeSearchGroups: () => [],
    postFlowBitmap: vi.fn(() => ({ result: Promise.resolve([]), seed: undefined })),
    decodeViaBitmap: vi.fn(),
  };
  return { capture: new CameraCapture(1, video, overlay, tracker, tracker, env), overlay, tracker, env };
}

it('does nothing until flow or decode is due', () => {
  const { capture } = setup(true);
  capture.lastFlowAt = 1000;
  capture.lastDecodeAt = 1000;
  expect(capture.begin(1001, false)).toBeNull();
});

it('captures a flow-only frame, sizes the overlay, and sends it by bitmap', async () => {
  const { capture, overlay, env } = setup(true);
  capture.lastDecodeAt = 10_000;
  const frame = capture.begin(10_000, false)!;
  expect(frame.doFlow).toBe(true);
  expect(frame.doDecode).toBe(false);
  expect(frame.snapshot).toBeNull();
  expect(overlay.width).toBe(frame.w);
  expect(env.postFlowBitmap).toHaveBeenCalledOnce();
  await capture.requestFlow(frame, 10_000);
  expect(capture.flowBusy).toBe(true);
  expect(capture.lastFlowAt).toBe(10_000);
  frame.close();
});

it('falls back to canvas readback for flow when bitmaps are off', async () => {
  const { capture, tracker } = setup(false);
  capture.lastDecodeAt = 10_000;
  const frame = capture.begin(10_000, false)!;
  await capture.requestFlow(frame, 10_000);
  expect(context.drawImage).toHaveBeenCalled();
  expect(tracker.detect).toHaveBeenCalledOnce();
});
