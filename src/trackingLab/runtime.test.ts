import { afterEach, describe, it, expect, vi } from 'vitest';
import { cameraImage, type RecordedInput } from './runtime';
import { frameClock } from '../input/CameraFrameClock';
import { videoSnapshot } from '../input/videoSnapshot';
import {openCamera,availableCameras} from '../input/cameraDevices';
import {groupMarkers} from '../input/arucoTracking';
afterEach(() => vi.unstubAllGlobals());
describe('Shared live/recorded frame source', () => {
    it('routes only an injected replay context to recorded cameras and images, without touching mediaDevices', async () => {
        const image = {} as HTMLCanvasElement, video = {} as HTMLVideoElement, stream = {} as MediaStream, devices = [] as MediaDeviceInfo[];
        const source: RecordedInput = { image: () => image, frameId: () => 1, open: vi.fn(async () => stream), devices };
        vi.stubGlobal('window', { sutureRecordedInput: source });
        vi.stubGlobal('navigator', { get mediaDevices() { throw new Error('Hardware must not be accessed'); } });
        expect(cameraImage(video)).toBe(image);
        expect(videoSnapshot(video, {} as HTMLCanvasElement, {} as CanvasRenderingContext2D).source).toBe(image);
        expect(await openCamera('recorded-id')).toBe(stream);
        expect(await availableCameras()).toBe(devices);
        expect(source.open).toHaveBeenCalledWith('recorded-id');
    });
    it('consumes a recorded image once and accepts a later source frame independently of wall-clock FPS', () => {
        let id = 1;
        const video = {} as HTMLVideoElement;
        vi.stubGlobal('window', { sutureRecordedInput: { frameId: () => id } });
        const first = frameClock(video)!;
        expect(first.fresh).toBe(true);
        first.consume();
        expect(frameClock(video)!.fresh).toBe(false);
        id = 7;
        expect(frameClock(video)!.fresh).toBe(true);
        expect(frameClock(video)!.frameId).toBe(7);
    });
    it('leaves live source and marker grouping behavior intact when no replay source is installed', () => {
        const video = {} as HTMLVideoElement;
        expect(cameraImage(video)).toBe(video);
        expect(frameClock(video)).toBeUndefined();
        expect(groupMarkers([{ id: 3, corners: [{ x: 1, y: 1 }] }])[0].name).toBe('forceps');
    });
});
