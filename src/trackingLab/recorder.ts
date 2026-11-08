import { MAX_BYTES, MAX_FRAMES, type Session, type Diagnostics } from './model';
import { RecordingStore } from './store';
/** One in-flight encode/write per camera, independent asynchronous workers. */
export class Recorder {
    private stopped = false;
    private lastReportAt=-Infinity;
    private jobs = new Set<Promise<void>>();
    private sequence = 0;
    private started = performance.now();
    private timers: number[] = [];
    private callbacks = new Map<HTMLVideoElement, number>();
    private workers: Worker[] = [];
    private bytesLimit = MAX_BYTES;
    private reservedBytes = 0;
    private finished?: Promise<Session>;
    constructor(readonly session: Session, private videos: HTMLVideoElement[], private store: RecordingStore, private diagnostics: (camera: number) => Diagnostics, private update: (s: Session) => void) { }
    async start(duration = 30000) {
        const estimate = await navigator.storage?.estimate?.().catch(() => null);
        if (estimate?.quota) {
            this.bytesLimit = Math.min(MAX_BYTES, Math.max(0, (estimate.quota - (estimate.usage ?? 0)) * .8));
            if (this.bytesLimit < 1024 * 1024)
                throw new Error('Not enough browser storage. Export/delete older recordings first.');
        }
        this.started = performance.now();
        this.session.monotonicStartMs=this.started;
        this.session.timeOrigin=performance.timeOrigin;
        await this.store.save(this.session);
        this.videos.forEach((video, camera) => {
            if (!video.srcObject || !video.videoWidth)
                return;
            const worker = new Worker(new URL('./encodeWorker.ts', import.meta.url), { type: 'module' });
            this.workers.push(worker);
            let busy = false, lastTime = -1;
            const capture = () => {
                if (this.stopped)
                    return;
                const at = performance.now() - this.started;
                this.session.duration = at;
                if(at-this.lastReportAt>=100){this.lastReportAt=at;this.update(this.session);}
                if (!video.srcObject || video.readyState < 2 || video.paused)
                    return;
                if (busy) {
                    this.session.dropped[camera]++;
                    return;
                }
                if (this.sequence >= MAX_FRAMES) {
                    this.session.note = 'Stopped at recording frame budget';
                    void this.stop(true);
                    return;
                }
                busy = true;
                const index = this.sequence++, width = video.videoWidth, height = video.videoHeight, diagnostics = this.diagnostics(camera);
                const job = (async () => { try {
                    const bitmap = await createImageBitmap(video);
                    const image = await new Promise<Blob>((resolve, reject) => { const timer = setTimeout(() => reject(new Error('Frame encoder timed out')), 10000); worker.onmessage = e => { clearTimeout(timer); e.data.error ? reject(new Error(e.data.error)) : resolve(e.data.image); }; worker.onerror = () => { clearTimeout(timer); reject(new Error('Frame encoder failed')); }; worker.postMessage({ id: index, bitmap }, [bitmap]); });
                    if (this.reservedBytes + image.size > this.bytesLimit) {
                        this.session.note = 'Stopped at local storage budget';
                        void this.stop(true);
                        return;
                    }
                    this.reservedBytes += image.size;
                    await this.store.append({ session: this.session.id, index, camera, at, width, height, image, diagnostics });
                    this.session.frames++;
                    this.session.bytes += image.size;
                }
                catch (error) {
                    this.session.note = String(error);
                    void this.stop(true);
                }
                finally {
                    busy = false;
                } })();
                this.jobs.add(job);
                void job.finally(() => this.jobs.delete(job));
            };
            if (video.requestVideoFrameCallback) {
                const next: VideoFrameRequestCallback = () => { capture(); if (!this.stopped)
                    this.callbacks.set(video, video.requestVideoFrameCallback(next)); };
                this.callbacks.set(video, video.requestVideoFrameCallback(next));
            }
            else {
                this.timers.push(window.setInterval(() => { if (video.currentTime !== lastTime) {
                    lastTime = video.currentTime;
                    capture();
                } }, 16));
            }
        });
        this.timers.push(window.setTimeout(() => void this.stop(), duration));
        this.timers.push(window.setInterval(() => { this.session.duration = performance.now() - this.started; this.update(this.session); if (this.videos.every(v => !v.srcObject || (v.srcObject as MediaStream).getVideoTracks().every(t => t.readyState === 'ended'))) {
            this.session.note = 'Cameras disconnected';
            void this.stop(true);
        } }, 250));
        return this;
    }
    stop(partial = false) { return this.finished ??= this.finish(partial); }
    private async finish(partial: boolean) { this.stopped = true; this.session.duration = performance.now() - this.started; this.callbacks.forEach((id, v) => v.cancelVideoFrameCallback(id)); this.timers.forEach(t => { clearTimeout(t); clearInterval(t); }); await Promise.allSettled([...this.jobs]); this.workers.forEach(w => w.terminate()); this.session.status = partial || !!this.session.note ? 'partial' : 'complete'; try {
        await this.store.save(this.session);
    }
    catch (error) {
        this.session.status = 'partial';
        this.session.note = 'Images saved, but recording metadata could not be finalized: ' + String(error);
    } this.update(this.session); return this.session; }
}
