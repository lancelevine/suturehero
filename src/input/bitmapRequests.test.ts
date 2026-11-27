import { afterEach, expect, it, vi } from 'vitest';
import { bitmapRequests } from './bitmapRequests';
import * as flowFrames from './flowFrames';

afterEach(() => vi.restoreAllMocks());

const fakeBitmap = {} as ImageBitmap;

it('sends a half-size flow bitmap and keeps a seed key when asked', async () => {
  const request = vi.spyOn(flowFrames, 'requestFlowBitmap').mockResolvedValue(fakeBitmap);
  const tracker = { detectBitmap: vi.fn().mockResolvedValue([{ id: 3 }]), store: vi.fn() };
  const { postFlowBitmap } = bitmapRequests(() => {});
  const posted = postFlowBitmap(tracker, 'Camera 1', {} as CanvasImageSource, 641, 400, true, true);
  expect(request).toHaveBeenCalledWith(expect.anything(), 321, 200);
  expect(await posted.result).toEqual([{ id: 3 }]);
  expect(posted.seed?.key).toEqual(expect.any(Number));
  expect(tracker.detectBitmap).toHaveBeenCalledWith(fakeBitmap, posted.seed!.key);
});

it('stores a seed-only frame without detecting, and reports bitmap failures', async () => {
  vi.spyOn(flowFrames, 'requestFlowBitmap').mockResolvedValue(fakeBitmap);
  const tracker = { detectBitmap: vi.fn(), store: vi.fn() };
  const onError = vi.fn();
  const { postFlowBitmap, decodeViaBitmap } = bitmapRequests(onError);
  const posted = postFlowBitmap(tracker, 'Camera 2', {} as CanvasImageSource, 100, 100, false, true);
  expect(posted.result).toBeUndefined();
  await posted.seed!.ready;
  expect(tracker.store).toHaveBeenCalledWith(fakeBitmap, posted.seed!.key);
  vi.spyOn(flowFrames, 'requestCropBitmap').mockRejectedValue(new Error('no bitmaps'));
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  await expect(decodeViaBitmap(tracker, 'Camera 1', {} as CanvasImageSource, 0, 0, 10, 10)).rejects.toThrow('no bitmaps');
  expect(onError).toHaveBeenCalledTimes(1);
});
