import { afterEach, describe, it, expect, vi } from 'vitest';
import { Recorder } from './recorder';
import type { RecordingStore } from './store';
import type { Session, Diagnostics } from './model';
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
describe('Asynchronous bounded frame recording', () => {
    function setup() {
        vi.useFakeTimers();
        vi.stubGlobal('window', globalThis);
        vi.stubGlobal('navigator', { storage: { estimate: async () => ({ quota: 1024 * 1024 * 1024, usage: 0 }) } });
        vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ close() { } })));
        class Encoder {
            onmessage?: (e: {
                data: {
                    image: Blob;
                };
            }) => void;
            onerror?: () => void;
            postMessage() { setTimeout(() => this.onmessage?.({ data: { image: new Blob(['jpeg'], { type: 'image/jpeg' }) } }), 10); }
            terminate() { }
        }
        vi.stubGlobal('Worker', Encoder);
        let callback: VideoFrameRequestCallback | undefined;
        const video = { videoWidth: 640, videoHeight: 480, readyState: 4, paused: false, srcObject: { getVideoTracks: () => [{ readyState: 'live' }] }, requestVideoFrameCallback: (fn: VideoFrameRequestCallback) => { callback = fn; return 1; }, cancelVideoFrameCallback: vi.fn() } as unknown as HTMLVideoElement;
        const session: Session = { id: 'record', version: 1, name: 'test', createdAt: new Date().toISOString(), duration: 0, status: 'recording', cameras: [{ index: 0, id: 'cam', label: 'cam', width: 640, height: 480 }], configuration: { storage: {}, controls: [], activeInstrument: 'needleDriver' }, algorithm: 'test', frames: 0, bytes: 0, dropped: [0, 0] };
        const store = { save: vi.fn(async () => { }), append: vi.fn(async () => { }) }, update = vi.fn();
        const recorder = new Recorder(session, [video], store as unknown as RecordingStore, () => ({} as Diagnostics), update);
        return { recorder, session, store, update, video, frame: () => callback!(performance.now(), {} as VideoFrameCallbackMetadata) };
    }
    it('saves compressed frames asynchronously and drops additional frames while one encode/write is in flight', async () => { const s = setup(); await s.recorder.start(); s.frame(); s.frame(); expect(s.session.dropped[0]).toBe(1); await vi.advanceTimersByTimeAsync(20); expect(s.store.append).toHaveBeenCalledOnce(); expect(s.session.frames).toBe(1); await s.recorder.stop(); expect(s.session.status).toBe('complete'); expect(s.video.cancelVideoFrameCallback).toHaveBeenCalled(); });
    it('automatically stops at the requested duration and permits early manual stopping', async () => { const s = setup(); await s.recorder.start(100); await vi.advanceTimersByTimeAsync(101); expect(s.session.status).toBe('complete'); const t = setup(); await t.recorder.start(30000); await t.recorder.stop(); expect(t.session.status).toBe('complete'); });
    it('keeps a usable partial session when a storage write fails', async () => { const s = setup(); s.store.append.mockRejectedValueOnce(new Error('Quota exceeded')); await s.recorder.start(); s.frame(); await vi.advanceTimersByTimeAsync(20); await s.recorder.stop(); expect(s.session.status).toBe('partial'); expect(s.session.note).toContain('Quota exceeded'); });
    it('refuses to begin if insufficient browser storage remains', async () => { const s = setup(); vi.stubGlobal('navigator', { storage: { estimate: async () => ({ quota: 100, usage: 99 }) } }); await expect(s.recorder.start()).rejects.toThrow('Not enough'); expect(s.store.append).not.toHaveBeenCalled(); });
});
