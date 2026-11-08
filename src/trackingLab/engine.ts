import type { Session, Frame, Diagnostics } from './model';
import type { RecordedInput } from './runtime';
import type { trackingLabBridge } from '../tracking';
export interface EngineAPI {
    initialize(session: Session): Promise<void>;
    process(frame: Frame): Promise<Diagnostics>;
    dispose(): void;
}
declare global {
    interface Window {
        sutureLabEngine?: EngineAPI;
    }
}
let clock = 10000, bridge: typeof trackingLabBridge;
const canvases = [document.createElement('canvas'), document.createElement('canvas')], ids = [0, 0];
window.sutureLabEngine = {
    dispose() { window.dispatchEvent(new Event('pagehide')); },
    async initialize(session) {
        // A separate browsing context owns workers, filters, calibration and storage.
        // No replay configuration or pose events escape into the live simulator.
        const storage = Object.assign(Object.create(null), session.configuration.storage) as Storage;
        Object.defineProperties(storage, { getItem: { value: (k: string) => storage[k] ?? null }, setItem: { value: (k: string, v: string) => { storage[k] = String(v); } }, removeItem: { value: (k: string) => { delete storage[k]; } }, clear: { value: () => { Object.keys(storage).forEach(k => delete storage[k]); } }, key: { value: (i: number) => Object.keys(storage)[i] ?? null }, length: { get: () => Object.keys(storage).length } });
        if(!storage.getItem('suturehero.jawEngine.v1'))storage.setItem('suturehero.jawEngine.v1','classic');
        Object.defineProperty(window, 'localStorage', { value: storage });
        Object.defineProperty(performance, 'now', { value: () => clock });
        const cameraFor = (video: HTMLVideoElement) => video.id === 'camera-video-2' ? 1 : 0;
        const streams = new Map<string, MediaStream>();
        for (const camera of session.cameras) {
            const canvas = canvases[camera.index];
            canvas.width = camera.width;
            canvas.height = camera.height;
            const stream = canvas.captureStream(0);
            const track = stream.getVideoTracks()[0];
            track.getSettings = () => ({ deviceId: camera.id, width: canvas.width, height: canvas.height });
            streams.set(camera.id, stream);
        }
        const input: RecordedInput = { image: v => canvases[cameraFor(v)], frameId: v => ids[cameraFor(v)], devices: session.cameras.map(c => ({ deviceId: c.id, label: c.label, kind: 'videoinput', groupId: 'recorded', toJSON: () => ({}) } as MediaDeviceInfo)), open: async (id) => { const stream = streams.get(id ?? session.cameras[0]?.id); if (!stream)
                throw new Error('Recorded camera unavailable'); return stream; } };
        window.sutureRecordedInput = input;
        bridge = (await import('../tracking')).trackingLabBridge;
        const videos = bridge.videos();
        videos.forEach((v, i) => {
            Object.defineProperties(v, { videoWidth: { get: () => canvases[i].width }, videoHeight: { get: () => canvases[i].height }, readyState: { get: () => 4 }, paused: { get: () => false }, currentTime: { get: () => clock / 1000 } });
            v.play = async () => { };
            v.getVideoPlaybackQuality = () => ({ totalVideoFrames: ids[i], droppedVideoFrames: 0, corruptedVideoFrames: 0, creationTime: clock }) as VideoPlaybackQuality;
        });
        for (const setting of session.configuration.controls) {
            const element = document.getElementById(setting.id);
            if (!(element instanceof HTMLInputElement || element instanceof HTMLSelectElement) || element.type === 'file')
                continue;
            element.value = setting.value;
            if (element instanceof HTMLInputElement && setting.checked !== undefined)
                element.checked = setting.checked;
        }
        // Apply only mode changes whose handlers establish essential derived state.
        for (const id of ['tracker-type', 'tracking-mode', 'needle-ball-pattern'])
            document.getElementById(id)?.dispatchEvent(new Event('change'));
        for (const camera of session.cameras) {
            const select = document.getElementById(camera.index ? 'camera-select-2' : 'camera-select') as HTMLSelectElement;
            select.replaceChildren(new Option(camera.label, camera.id));
            select.value = camera.id;
        }
        const mode = document.querySelector<HTMLSelectElement>('#tracking-mode');
        if (mode) {
            const saved = session.configuration.controls.find(c => c.id === 'tracking-mode')?.value;
            mode.value = saved === 'mono' || saved === 'stereo' ? saved : session.cameras.length > 1 ? 'stereo' : 'mono';
            mode.dispatchEvent(new Event('change'));
        }
        await bridge.start(session.cameras.map(c => c.index));
    },
    async process(frame) { clock = 10000 + frame.at; const bitmap = await createImageBitmap(frame.image); try {
        if (bitmap.width !== frame.width || bitmap.height !== frame.height)
            throw new Error('Frame dimensions do not match the manifest');
        const canvas = canvases[frame.camera];
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
        ids[frame.camera]++;
    }
    finally {
        bitmap.close();
    } return bridge.process(frame.camera, clock); }
};
