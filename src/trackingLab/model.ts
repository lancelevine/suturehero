export const FORMAT_VERSION = 1;
export const MAX_BYTES = 256 * 1024 * 1024;
export const MAX_MANIFEST_BYTES = 32 * 1024 * 1024;
export const MAX_FRAMES = 20000;
export type Diagnostics = {
    at: number;
    markerCurrent?: boolean;
    ballProcessed?: boolean;
    ballSupported?:boolean;
    jawEngine?:string;
    markers: {
        id: number;
        current?:boolean;
        corners: {
            x: number;
            y: number;
        }[];
    }[];
    width: number;
    height: number;
    ballWidth: number;
    ballHeight: number;
    balls: {
        id: string;
        x: number;
        y: number;
        radius: number;
        state: string;
        confidence: number | null;
    }[];
    status: string;
    confidence: number | null;
    poses: {
        instrument: string;
        markerId?: number;
        markerPose?:{camera:number;translationMm:number[];quaternion:number[];reprojectionErrorPx:number};
        position: number[];
        quaternion: number[];
        at: number;
    }[];
    stereo: boolean;
};
export interface Frame {
    session: string;
    index: number;
    camera: number;
    at: number;
    width: number;
    height: number;
    image: Blob;
    diagnostics?: Diagnostics;
}
export interface Session {
    id: string;
    version: 1;
    name: string;
    createdAt: string;
    duration: number;
    status: 'recording' | 'complete' | 'partial';
    cameras: {
        index: number;
        id: string;
        label: string;
        width: number;
        height: number;
        settings?: MediaTrackSettings;
    }[];
    configuration: {
        storage: Record<string, string | null>;
        controls: {
            id: string;
            value: string;
            checked?: boolean;
        }[];
        activeInstrument: string;
    };
    monotonicStartMs?:number;
    timeOrigin?:number;
    algorithm: string;
    frames: number;
    bytes: number;
    dropped: number[];
    note?: string;
    stationary?: {
        start: number;
        end: number;
    }[];
}
export const orderedFrames = <T extends {
    at: number;
    camera: number;
    index: number;
}>(frames: T[]) => [...frames].sort((a, b) => a.at - b.at || a.index - b.index || a.camera - b.camera);
const MAGIC = 'SUTUREHERO-TRACKING-LAB\n1\n';
export function exportRecording(session: Session, frames: Frame[]): Blob {
    const sorted = orderedFrames(frames);
    const manifest = JSON.stringify({ session, frames: sorted.map(({ image, ...f }) => ({ ...f, length: image.size, type: image.type })) });
    const header = new TextEncoder().encode(manifest);
    if (header.length > MAX_MANIFEST_BYTES)
        throw new Error('Recording metadata exceeds the portable format limit');
    // Explicit little endian, independent of the host architecture.
    const prefix = new ArrayBuffer(4);
    new DataView(prefix).setUint32(0, header.length, true);
    return new Blob([MAGIC, prefix, header, ...sorted.map(f => f.image)], { type: 'application/octet-stream' });
}
export async function importRecording(file: Blob): Promise<{
    session: Session;
    frames: Frame[];
}> {
    if (file.size > MAX_BYTES + MAX_MANIFEST_BYTES + 64)
        throw new Error('Recording exceeds the 256 MiB image limit');
    const magicSize = new TextEncoder().encode(MAGIC).length;
    if (await file.slice(0, magicSize).text() !== MAGIC)
        throw new Error('Unsupported Tracking Lab file or format version');
    const prefix = await file.slice(magicSize, magicSize + 4).arrayBuffer();
    if (prefix.byteLength !== 4)
        throw new Error('Truncated recording');
    const length = new DataView(prefix).getUint32(0, true);
    if (length > MAX_MANIFEST_BYTES || length < 2)
        throw new Error('Invalid recording manifest');
    let offset = magicSize + 4 + length;
    if (offset > file.size)
        throw new Error('Truncated manifest');
    const data = JSON.parse(await file.slice(magicSize + 4, offset).text());
    const s = data.session as Session;
    if (s?.version !== FORMAT_VERSION || typeof s.name !== 'string' || s.name.length > 256 || typeof s.createdAt !== 'string' || !Number.isFinite(Date.parse(s.createdAt)) || typeof s.algorithm !== 'string' || !Array.isArray(s.dropped) || s.dropped.length !== 2 || !s.dropped.every(n => Number.isInteger(n) && n >= 0) || !Number.isFinite(s.duration) || s.duration < 0 || !Array.isArray(s.cameras) || s.cameras.length > 2 || !s.configuration || !Array.isArray(s.configuration.controls) || s.configuration.controls.length > 500 || !['needleDriver', 'forceps', 'scissors'].includes(s.configuration.activeInstrument) || !s.configuration.storage || !Array.isArray(data.frames) || data.frames.length > MAX_FRAMES)
        throw new Error('Invalid recording metadata');
    if (!s.cameras.every(c => [0, 1].includes(c.index) && typeof c.id === 'string' && typeof c.label === 'string' && Number.isInteger(c.width) && Number.isInteger(c.height) && c.width > 0 && c.height > 0 && c.width * c.height <= 33554432) || new Set(s.cameras.map(c => c.index)).size !== s.cameras.length)
        throw new Error('Invalid camera metadata');
    if (!s.configuration.controls.every(c => typeof c.id === 'string' && typeof c.value === 'string') || !Object.entries(s.configuration.storage).every(([k, v]) => k.startsWith('suturehero') && (v === null || typeof v === 'string')))
        throw new Error('Invalid tracking configuration');
    if (s.stationary && (!Array.isArray(s.stationary) || !s.stationary.every(i => Number.isFinite(i.start) && Number.isFinite(i.end) && i.start >= 0 && i.end >= i.start && i.end <= s.duration)))
        throw new Error('Invalid stationary intervals');
    const id = crypto.randomUUID(), seen = new Set<number>(), frames: Frame[] = [];
    for (const f of data.frames) {
        if (!Number.isInteger(f.index) || f.index < 0 || seen.has(f.index) || !s.cameras.some(c => c.index === f.camera) || !Number.isFinite(f.at) || f.at < 0 || f.at > s.duration + 1000 || !Number.isInteger(f.width) || !Number.isInteger(f.height) || f.width <= 0 || f.height <= 0 || f.width * f.height > 33554432 || !Number.isInteger(f.length) || f.length <= 0 || f.length > MAX_BYTES || !['image/jpeg', 'image/webp', 'image/png'].includes(f.type) || offset + f.length > file.size)
            throw new Error('Invalid or truncated camera frame');
        seen.add(f.index);
        const image = file.slice(offset, offset + f.length, f.type);
        offset += f.length;
        // Stored diagnostics are observations only. They are never trusted as replay results.
        frames.push({ session: id, index: f.index, camera: f.camera, at: f.at, width: f.width, height: f.height, image, diagnostics: validDiagnostics(f.diagnostics) ? f.diagnostics : undefined });
    }
    if (offset !== file.size)
        throw new Error('Unexpected recording data');
    return { session: { ...s, id, frames: frames.length, bytes: frames.reduce((a, f) => a + f.image.size, 0), status: s.status === 'complete' ? 'complete' : 'partial' }, frames: orderedFrames(frames) };
}
export interface ReplayProcessor {
    reset(): Promise<void>;
    process(frame: Frame): Promise<Diagnostics>;
    dispose(): void;
}
/** All seeks rebuild from the beginning: no stale smoothing, flow, jaw or stereo state. */
export class ReplayCursor {
    position = -1;
    results = new Map<number, Diagnostics>();
    private initialized = false;
    private cancelled = false;
    cancel() { this.cancelled = true; }
    constructor(readonly frames: Frame[], private processor: ReplayProcessor) { }
    async seek(index: number) { this.cancelled = false; if (!this.frames.length) {
        this.position = -1;
        this.results.clear();
        return -1;
    } index = Math.max(-1, Math.min(this.frames.length - 1, index)); if (index < this.position || !this.initialized) {
        this.initialized = false;
        await this.processor.reset();
        this.initialized = true;
        this.position = -1;
        this.results.clear();
    } while (this.position < index && !this.cancelled) {
        const next = this.frames[this.position + 1];
        let result: Diagnostics;
        try {
            result = await this.processor.process(next);
        }
        catch (error) {
            this.initialized = false;
            throw error;
        }
        this.position++;
        this.results.set(next.index, result);
    } return this.position; }
    step(delta: number) { return this.seek(this.position + delta); }
    get complete() { return this.position === this.frames.length - 1; }
    dispose() { this.processor.dispose(); }
}
export function metrics(frames: Frame[], results: Map<number, Diagnostics>) {
    return [0, 1].map(camera => {
        const f = frames.filter(f => f.camera === camera);
        let markers = 0, balls = 0, losses = 0, was = false, lostAt: number | null = null;
        const reacquisition: number[] = [];
        let pairs = 0, pairLosses = 0, hadPair = false, pairLostAt: number | null = null;
        const pairReacquisition: number[] = [];
        for (const frame of f) {
            const d = results.get(frame.index);
            if (!d)
                continue;
            const valid = !!d.markers.length && d.markerCurrent !== false;
            markers += Number(valid);
            balls += Number(d.balls.some(b => b.state === 'detected'));
            if (was && !valid) {
                losses++;
                lostAt = frame.at;
            }
            if (!was && valid && lostAt !== null) {
                reacquisition.push(frame.at - lostAt);
                lostAt = null;
            }
            was = valid;
            const detected = d.balls.filter(b => b.state === 'detected');
            const paired = detected.some(b => b.id.endsWith(' A') && detected.some(other => other.id === b.id.slice(0, -1) + 'B'));
            pairs += Number(paired);
            if (d.ballProcessed !== false) {
                if (hadPair && !paired) {
                    pairLosses++;
                    pairLostAt = frame.at;
                }
                if (!hadPair && paired && pairLostAt !== null) {
                    pairReacquisition.push(frame.at - pairLostAt);
                    pairLostAt = null;
                }
                hadPair = paired;
            }
        }
        const processed = f.filter(f => results.has(f.index)).length;
        const span = f.length > 1 ? f[f.length - 1].at - f[0].at : 0;
        const ballsSupported=f.some(frame=>{const d=results.get(frame.index);return d&&d.ballSupported!==false;});
        const pairsSupported=f.some(frame=>{const d=results.get(frame.index);return d&&d.jawEngine!=='marker';});
        return { ballsSupported,pairsSupported,camera, frames: f.length, fps: span ? (f.length - 1) * 1000 / span : 0, processed, markers, balls, pairs, pairLosses, pairReacquisitionMs: pairReacquisition.length ? pairReacquisition.reduce((a, b) => a + b, 0) / pairReacquisition.length : null, losses, reacquisitionMs: reacquisition.length ? reacquisition.reduce((a, b) => a + b, 0) / reacquisition.length : null };
    });
}
export function jitter(frames: Frame[], results: Map<number, Diagnostics>, start: number, end: number) {
    const poses = frames.filter(f => f.camera === 0 && f.at >= start && f.at <= end).flatMap(f => results.get(f.index)?.poses ?? []);
    return [...new Set(poses.map(p => p.instrument))].flatMap(instrument => { const p = poses.filter(p => p.instrument === instrument); if (p.length < 2)
        return []; const mean = [0, 1, 2].map(i => p.reduce((a, v) => a + v.position[i], 0) / p.length), q = p[0].quaternion; return [{ instrument, samples: p.length, positionRms: Math.sqrt(p.reduce((a, v) => a + v.position.reduce((s, x, i) => s + (x - mean[i]) ** 2, 0), 0) / p.length), orientationRmsDeg: Math.sqrt(p.reduce((a, v) => a + (2 * Math.acos(Math.min(1, Math.abs(v.quaternion.reduce((s, x, i) => s + x * q[i], 0))))) ** 2, 0) / p.length) * 180 / Math.PI }]; });
}
/** Imported observations remain data only; reject malformed overlays without rejecting usable images. */
function validDiagnostics(d: unknown): d is Diagnostics {
    if (!d || typeof d !== 'object')
        return false;
    const v = d as Diagnostics;
    return Number.isFinite(v.at) && Number.isFinite(v.width) && v.width > 0 && Number.isFinite(v.height) && v.height > 0 && Number.isFinite(v.ballWidth) && v.ballWidth > 0 && Number.isFinite(v.ballHeight) && v.ballHeight > 0 && typeof v.status === 'string' && Array.isArray(v.markers) && v.markers.length <= 100 && v.markers.every(m => Number.isInteger(m.id) && Array.isArray(m.corners) && m.corners.length === 4 && m.corners.every(p => Number.isFinite(p.x) && Number.isFinite(p.y))) && Array.isArray(v.balls) && v.balls.length <= 12 && v.balls.every(b => typeof b.id === 'string' && Number.isFinite(b.x) && Number.isFinite(b.y) && Number.isFinite(b.radius) && typeof b.state === 'string') && Array.isArray(v.poses) && v.poses.length <= 3 && v.poses.every(p => typeof p.instrument === 'string' && Array.isArray(p.position) && p.position.length === 3 && p.position.every(Number.isFinite) && Array.isArray(p.quaternion) && p.quaternion.length === 4 && p.quaternion.every(Number.isFinite));
}
