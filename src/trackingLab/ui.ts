import './lab.css';
import { Recorder } from './recorder';
import { RecordingStore } from './store';
import { exportRecording, importRecording, orderedFrames, ReplayCursor, metrics, jitter, type Session, type Frame, type Diagnostics } from './model';
import { RecordedFrameProcessor } from './processor';
declare const __SUTUREHERO_REVISION__: string;
export function mountTrackingLab(app: HTMLElement) {
    const store = new RecordingStore();
    let recorder: Recorder | undefined, session: Session | undefined, cursor: ReplayCursor | undefined, playing = false, busy = false, epoch = 0, stationaryStart: number | undefined, frames: Frame[] = [];
    const pane = document.createElement('section');
    pane.className = 'tracking-lab';
    pane.hidden = true;
    pane.id = 'tracking-lab';
    pane.setAttribute('aria-label', 'Tracking Lab');
    pane.innerHTML = `<h1>Tracking Lab</h1><p class="lab-note">Record a tracking failure once. Replay the images through the current tracking algorithms. Recordings stay in this browser.</p><div class="lab-toolbar"><button id="lab-record">Record</button><button id="lab-stop" disabled>Stop</button><button id="lab-replay" disabled>Replay</button><label>Duration <select id="lab-duration"><option value="5000">5 seconds</option><option value="30000" selected>30 seconds</option><option value="60000">60 seconds</option></select></label><progress id="lab-progress" max="30000" value="0"></progress><label><input id="lab-overlays" type="checkbox" checked> Tracking overlays</label><span id="lab-mode">Ready</span></div><div class="lab-cameras">${[0, 1].map(i => `<section class="lab-camera"><h2>Camera ${i + 1}</h2><div class="lab-image"><span>No frames</span><video muted playsinline autoplay></video><canvas class="lab-frame" hidden></canvas><canvas class="lab-overlay"></canvas></div></section>`).join('')}</div><div class="lab-timeline"><button id="lab-pause" disabled>Pause</button><button id="lab-back" disabled aria-label="Previous frame">← Frame</button><button id="lab-next" disabled aria-label="Next frame">Frame →</button><input id="lab-seek" type="range" min="0" max="0" value="0" aria-label="Playback time"><output id="lab-time">0.00 / 0.00 s</output><label>Speed <select id="lab-speed"><option value="0.25">0.25×</option><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select></label></div><div class="lab-error" id="lab-message" role="status"></div><section class="lab-diagnostics"><strong id="lab-diagnostics-title">Tracking diagnostics</strong><pre id="lab-diagnostics">Detection confidence: Unavailable\nNo recording selected.</pre><div class="lab-stationary"><button id="lab-stationary-start" disabled>Mark stationary start</button><button id="lab-stationary-end" disabled>Mark stationary end</button><span id="lab-jitter">Jitter: designate a stationary interval during replay.</span></div><p class="lab-note">Green: current detection · Gray dashed: predicted / searching · No position: lost. Camera frames keep their individual timestamps. Replay speed may be limited by detector processing. Position jitter uses simulator practice units; it is not absolute accuracy.</p></section><section class="lab-library"><div class="lab-library-head"><strong>Recording library</strong><button id="lab-import">Import recording</button><input id="lab-import-file" class="lab-file" type="file" accept=".suturetrack,application/octet-stream"></div><div id="lab-library-list">Loading local recordings…</div></section>`;
    // Keep Lab controls independent of the practice page's global keyboard handlers.
    pane.addEventListener('keydown',event=>event.stopPropagation());
    pane.addEventListener('keyup',event=>event.stopPropagation());
    app.append(pane);
    const q = <T extends HTMLElement = HTMLElement>(id: string) => pane.querySelector<T>('#lab-' + id)!;
    const videos = Array.from(pane.querySelectorAll<HTMLVideoElement>('video')), images = Array.from(pane.querySelectorAll<HTMLCanvasElement>('.lab-frame')), overlays = Array.from(pane.querySelectorAll<HTMLCanvasElement>('.lab-overlay'));
    const nav = document.createElement('div');
    nav.className = 'workspace-lab-tabs';
    nav.setAttribute('role', 'tablist');
    nav.setAttribute('aria-label', 'Workspace');
    nav.addEventListener('keydown',event=>event.stopPropagation());
    nav.addEventListener('keyup',event=>event.stopPropagation());
    const simulator = document.createElement('button'), tab = document.createElement('button');
    simulator.textContent = 'Simulator';
    tab.textContent = 'Tracking Lab';
    for (const b of [simulator, tab]) {
        b.className = 'lab-tab';
        b.setAttribute('role', 'tab');
        nav.append(b);
    }
    app.querySelector('header')!.insertBefore(nav, app.querySelector('header')!.children[1]);
    simulator.setAttribute('aria-selected', 'true');
    tab.setAttribute('aria-controls', pane.id);
    const open = (lab: boolean) => {window.dispatchEvent(new Event('blur'));pane.hidden = !lab; document.body.classList.toggle('tracking-lab-active', lab); tab.setAttribute('aria-selected', String(lab)); simulator.setAttribute('aria-selected', String(!lab)); if (!lab) {
        cursor?.cancel();
        playing = false;
        epoch++;
    }
    else {
        void library().catch(fail);
        if (!cursor && !busy)
            void import('../tracking').then(async ({ trackingLabBridge: live }) => { if (cursor || busy)
                return; const sources = live.videos(); for (let i = 0; i < 2; i++)
                if (sources[i].srcObject) {
                    videos[i].srcObject = sources[i].srcObject;
                    videos[i].hidden = false;
                    images[i].hidden = true;
                    videos[i].parentElement!.style.aspectRatio = `${sources[i].videoWidth}/${sources[i].videoHeight}`;
                    await videos[i].play();
                } }).catch(fail);
    } };
    tab.onclick = () => open(true);
    simulator.onclick = () => open(false);
    const liveStats = [{ at: 0, count: 0, fps: 0 }, { at: 0, count: 0, fps: 0 }];
    const fail = (e: unknown) => { console.error('Tracking Lab', e); q('message').textContent = e instanceof Error ? e.message : String(e); playing = false; buttons(); };
    const time = () => cursor && cursor.position >= 0 ? frames[cursor.position].at : 0;
    function buttons() { const recording = !!recorder && recorder.session.status === 'recording'; q<HTMLButtonElement>('record').disabled = recording || busy; q<HTMLButtonElement>('stop').disabled = !recording && !playing && !(cursor && busy); q<HTMLButtonElement>('replay').disabled = recording || busy || !session?.frames; q<HTMLButtonElement>('pause').disabled = !cursor || busy; q<HTMLButtonElement>('back').disabled = !cursor || busy || cursor.position < 0; q<HTMLButtonElement>('next').disabled = !cursor || busy || cursor.complete; q<HTMLInputElement>('seek').disabled = !cursor || busy; q<HTMLButtonElement>('stationary-start').disabled = !cursor || busy; q<HTMLButtonElement>('stationary-end').disabled = stationaryStart === undefined || busy; q<HTMLButtonElement>('import').disabled = recording || busy; q('pause').textContent = playing ? 'Pause' : 'Resume'; q('stop').textContent = recording ? 'Stop' : 'Stop replay'; }
    function confidenceLabel(d?:Diagnostics){return d?.confidence==null?'Detection confidence: Unavailable':`Jaw visibility confidence: ${(d.confidence*100).toFixed(0)}% of measurable balls · ArUco confidence: Unavailable`;}
    function diagnostics() {
        if (!cursor || !session)
            return;
        q('diagnostics-title').textContent = 'Reprocessed tracking diagnostics';
        const lines = metrics(frames, cursor.results).filter(m => m.frames).map(m => `Camera ${m.camera + 1}: ${m.fps.toFixed(1)} recorded FPS · ${m.processed}/${m.frames} frames reprocessed\nMarkers ${m.markers}/${m.processed} (${m.processed ? (m.markers / m.processed * 100).toFixed(1) : '0'}%) · Balls ${m.ballsSupported?`${m.balls}/${m.processed} (${m.processed?(m.balls/m.processed*100).toFixed(1):'0'}%)`:'Unavailable (marker-relative jaws use Camera 1)'}\nMarker tracking-loss events ${m.losses} · Mean reacquisition ${m.reacquisitionMs === null ? 'Unavailable' : (m.reacquisitionMs / 1000).toFixed(2) + ' s'}\nClassic jaw pairs ${m.pairsSupported?`${m.pairs}/${m.processed}`:'Unavailable (marker-relative engine)'} · Pair-loss events ${m.pairLosses} · Mean reacquisition ${m.pairReacquisitionMs === null ? 'Unavailable' : (m.pairReacquisitionMs / 1000).toFixed(2) + ' s'}`);
        const latest = cursor.position >= 0 ? cursor.results.get(frames[cursor.position].index) : undefined;
        q('diagnostics').textContent = `${latest?.status ?? 'Waiting for frames'}\n${confidenceLabel(latest)}\n${lines.join('\n')}\nDropped during recording: ${session.dropped.join(' / ')} · Algorithm ${__SUTUREHERO_REVISION__}`;
        q<HTMLOutputElement>('time').value = `${(time() / 1000).toFixed(3)} / ${(session.duration / 1000).toFixed(3)} s · Frame ${cursor.position+1}/${frames.length}`;
        q<HTMLInputElement>('seek').value = String(time());
    }
    function overlay(camera: number, d?: Diagnostics) {
        const canvas = overlays[camera], ctx = canvas.getContext('2d')!;
        canvas.width = (!images[camera].hidden ? images[camera].width : videos[camera].videoWidth) || 640;
        canvas.height = (!images[camera].hidden ? images[camera].height : videos[camera].videoHeight) || 360;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (!d || !q<HTMLInputElement>('overlays').checked)
            return;
        ctx.font = `${Math.max(12, canvas.width / 75)}px sans-serif`;
        ctx.lineWidth = Math.max(2, canvas.width / 500);
        for (const marker of d.markers) {
            ctx.strokeStyle = ctx.fillStyle = d.markerCurrent===false||marker.current===false?'#a8adb5':'#35dc87';
            ctx.setLineDash(d.markerCurrent===false||marker.current===false?[6,6]:[]);
            ctx.beginPath();
            marker.corners.forEach((p, i) => { const x = p.x * canvas.width / d.width, y = p.y * canvas.height / d.height; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
            ctx.closePath();
            ctx.stroke();
            const p = marker.corners[0];
            ctx.fillText('ID ' + marker.id, p.x * canvas.width / d.width, p.y * canvas.height / d.height - 5);
        }
        for (const b of d.balls) {
            const current = b.state === 'detected', x = b.x * canvas.width / d.ballWidth, y = b.y * canvas.height / d.ballHeight;
            ctx.strokeStyle = ctx.fillStyle = current ? '#35dc87' : '#a8adb5';
            ctx.setLineDash(current ? [] : [6, 6]);
            ctx.beginPath();
            ctx.arc(x, y, Math.max(5, b.radius * canvas.width / d.ballWidth), 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillText(b.id + ' · ' + (current ? 'Detected' : b.state === 'lost' ? 'Lost · searching' : 'Predicted · searching'), x + 12, y);
        }
        // Body orientation is shared with the live pose solver (quaternion in practice coordinates).
        for (const p of d.poses) {
            const marker = d.markers.find(m => m.id === p.markerId);
            if (!marker)
                continue;
            const c = marker.corners, x = c.reduce((a, p) => a + p.x, 0) / 4 * canvas.width / d.width, y = c.reduce((a, p) => a + p.y, 0) / 4 * canvas.height / d.height;
            const [qx, qy, qz, qw] = p.quaternion;
            const axes = [[1 - 2 * (qy * qy + qz * qz), 2 * (qx * qy + qz * qw), '#ff7373'], [2 * (qx * qy - qz * qw), 1 - 2 * (qx * qx + qz * qz), '#7ae4a4'], [2 * (qx * qz + qy * qw), 2 * (qy * qz - qx * qw), '#80baff']];
            ctx.setLineDash([]);
            for (const [dx, dy, color] of axes) {
                ctx.strokeStyle = String(color);
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + Number(dx) * 45, y - Number(dy) * 45);
                ctx.stroke();
            }
        }
    }
    async function display() { if (!cursor)
        return; for (let camera = 0; camera < 2; camera++) {
        const frame = frames.slice(0, cursor.position + 1).reverse().find(f => f.camera === camera);
        if (!frame) {
            images[camera].hidden = true;
            overlays[camera].getContext('2d')!.clearRect(0, 0, overlays[camera].width, overlays[camera].height);
            continue;
        }
        const bitmap = await createImageBitmap(frame.image);
        const canvas = images[camera];
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
        bitmap.close();
        canvas.hidden = false;
        videos[camera].hidden = true;
        canvas.parentElement!.style.aspectRatio = `${frame.width}/${frame.height}`;
        const d = cursor.results.get(frame.index);
        overlay(camera, d && time() - frame.at < 220 ? d : undefined);
    } diagnostics(); buttons(); }
    async function seek(index: number) { playing = false; epoch++; busy = true; buttons(); q('mode').textContent = 'Reconstructing tracker state…'; try {
        await cursor?.seek(index);
        await display();
        q('mode').textContent = cursor?.complete ? 'Replay complete' : 'Paused';
    }
    finally {
        busy = false;
        buttons();
    } }
    async function play() { if (!cursor || busy)
        return; if (cursor.complete)
        await seek(-1); playing = true; const generation = ++epoch; buttons(); q('mode').textContent = 'Reprocessing'; try {
        while (playing && generation === epoch && !cursor.complete) {
            const before = time(), start = performance.now();
            busy = true;
            buttons();
            await cursor.step(1);
            await display();
            busy = false;
            buttons();
            const delay = (time() - before) / Number(q<HTMLSelectElement>('speed').value) - (performance.now() - start);
            if (delay > 0)
                await new Promise(r => setTimeout(r, delay));
        }
        if (generation === epoch) {
            playing = false;
            q('mode').textContent = cursor.complete ? 'Replay complete' : 'Paused';
            buttons();
        }
    }
    catch (e) {
        busy = false;
        fail(e);
    } }
    async function select(s: Session) {q('message').textContent=''; playing = false; epoch++; cursor?.dispose(); session = s; frames = orderedFrames(await store.frames(s.id)); cursor = new ReplayCursor(frames, new RecordedFrameProcessor(s)); q<HTMLInputElement>('seek').max = String(s.duration); stationaryStart = undefined; images.forEach(c => c.hidden = true); overlays.forEach(c => c.getContext('2d')!.clearRect(0, 0, c.width, c.height)); videos.forEach(v => { v.srcObject = null; v.hidden = true; }); q('mode').textContent = s.name; await seek(-1); }
    async function library() { const list = q('library-list'); list.replaceChildren(); for (const s of await store.list()) {
        const row = document.createElement('div');
        row.className = 'lab-session';
        const title = document.createElement('div');
        title.className = 'lab-session-title';
        const name = document.createElement('input');
        name.value = s.name;
        name.setAttribute('aria-label', 'Recording name');name.maxLength=256;
        name.onchange = () => { s.name = name.value.trim() || 'Untitled recording'; void store.save(s).catch(fail); if (session?.id === s.id)
            session.name = s.name; };
        const details = document.createElement('small');
        details.textContent = `${new Date(s.createdAt).toLocaleString()} · ${(s.duration / 1000).toFixed(1)}s · ${s.frames} frames · ${s.cameras.map(c => `${c.width}×${c.height}`).join(' / ')} · ${s.status}${s.note ? ' · ' + s.note : ''}`;
        title.append(name, details);
        row.append(title);
        for (const [label, action] of [['Replay', async () => { await select(s); await play(); }], ['Export', async () => { const blob = exportRecording(s, await store.frames(s.id)), url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = s.name.replace(/[^a-z0-9_-]/gi, '_') + '.suturetrack'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 60000); }], ['Delete', async () => { if (session?.id === s.id) {
                    playing = false;
                    epoch++;
                    cursor?.dispose();
                    cursor = undefined;
                    session = undefined;frames=[];images.forEach(c=>c.hidden=true);overlays.forEach(c=>c.getContext('2d')!.clearRect(0,0,c.width,c.height));q('mode').textContent='Ready';q('diagnostics').textContent='No recording selected.';
                    buttons();
                } await store.delete(s.id); await library(); }]] as const) {
            const button = document.createElement('button');
            button.textContent = label;
            button.disabled = (!!recorder && recorder.session.status === 'recording')||(label==='Replay'&&!s.frames);
            button.onclick = () => { if (busy)
                return; void action().catch(fail); };
            row.append(button);
        }
        list.append(row);
    } if (!list.childElementCount)
        list.textContent = 'No recordings yet. Click Record to start.'; }
    q('record').onclick = () => {
        void (async () => {
            busy = true;
            playing = false;
            epoch++;
            cursor?.dispose();
            cursor = undefined;
            buttons();
            q('message').textContent = '';
            const live = (await import('../tracking')).trackingLabBridge;
            await live.start();
            const sources = live.videos();
            sources.forEach((source, i) => { videos[i].srcObject = source.srcObject; videos[i].hidden = false; images[i].hidden = true; videos[i].parentElement!.style.aspectRatio = `${source.videoWidth || 16}/${source.videoHeight || 9}`; });
            await Promise.all(videos.filter(v => v.srcObject).map(v => v.play()));
            session = { id: crypto.randomUUID(), version: 1, name: 'Tracking ' + new Date().toLocaleString(), createdAt: new Date().toISOString(), duration: 0, status: 'recording', cameras: sources.flatMap((v, index) => v.srcObject && v.videoWidth ? [{ index, id: (v.srcObject as MediaStream).getVideoTracks()[0].getSettings().deviceId || document.querySelector<HTMLSelectElement>(index?'#camera-select-2':'#camera-select')?.value || `camera-${index}`, label: (v.srcObject as MediaStream).getVideoTracks()[0].label, settings: (v.srcObject as MediaStream).getVideoTracks()[0].getSettings(), width: v.videoWidth, height: v.videoHeight }] : []), configuration: live.configuration(), algorithm: __SUTUREHERO_REVISION__, frames: 0, bytes: 0, dropped: [0, 0] };
            if (!session.cameras.length)
                throw new Error('No camera frames available');
            const duration = Number(q<HTMLSelectElement>('duration').value);
            q<HTMLProgressElement>('progress').max = duration;
            recorder = new Recorder(session, videos, store, c => live.snapshot(c), s => { q<HTMLProgressElement>('progress').value = s.duration; q('mode').textContent = s.status === 'recording' ? `Recording ${(s.duration / 1000).toFixed(1)} s · ${s.frames} frames` : `Saved ${s.frames} frames${s.note ? ' · ' + s.note : ''}`; if (s.status !== 'recording') {
                buttons();
                void library().catch(fail);
            } q('time').textContent = `${(s.duration / 1000).toFixed(1)} s`; });
            await recorder.start(duration);
            busy = false;
            buttons();
            await library();
        })().catch(e => {busy=false;if(recorder?.session.status==='recording')void recorder.stop(true);recorder=undefined;fail(e);});
    };
    q('stop').onclick = () => { if (recorder?.session.status === 'recording') {
        busy = true;
        buttons();
        void recorder.stop().then(async (s) => { busy = false; await library(); await select(s); }).catch(e => { busy = false; fail(e); });
    }
    else {
        cursor?.cancel();
        playing = false;
        epoch++;
        q('mode').textContent = 'Paused';
        buttons();
    } };
    q('replay').onclick = () => { void (async () => { if (!session)
        return; if (!cursor)
        await select(session); await seek(-1); await play(); })().catch(fail); };
    q('pause').onclick = () => { if (playing) {
        playing = false;
        epoch++;
        buttons();
    }
    else
        void play(); };
    q('back').onclick = () => void seek((cursor?.position ?? 0) - 1).catch(fail);
    q('next').onclick = () => void seek((cursor?.position ?? -1) + 1).catch(fail);
    q('seek').onchange = () => { const at = Number(q<HTMLInputElement>('seek').value); let index = frames.findIndex(f => f.at > at) - 1; if (index === -2)
        index = frames.length - 1; void seek(index).catch(fail); };
    q('overlays').onchange = () => void display().catch(fail);
    q('stationary-start').onclick = () => { stationaryStart = time(); q('jitter').textContent = `Stationary interval starts at ${(time() / 1000).toFixed(2)}s`; buttons(); };
    q('stationary-end').onclick = () => { if (stationaryStart === undefined || !session || !cursor)
        return; const interval = { start: Math.min(stationaryStart, time()), end: Math.max(stationaryStart, time()) }; session.stationary ??= []; session.stationary.push(interval); q('jitter').textContent = jitter(frames, cursor.results, interval.start, interval.end).map(j => `${j.instrument}: position RMS ${j.positionRms.toFixed(4)} practice units; orientation RMS ${j.orientationRmsDeg.toFixed(2)}° from first pose (${j.samples} samples)`).join(' · ') || 'Jitter: Unavailable (need at least two valid poses)'; void store.save(session).catch(fail); stationaryStart = undefined; buttons(); };
    q('import').onclick = () => q<HTMLInputElement>('import-file').click();
    q('import-file').onchange = () => { const file = q<HTMLInputElement>('import-file').files?.[0]; if (!file)
        return; void (async () => { playing = false; epoch++; busy = true; buttons(); const imported = await importRecording(file); await store.save({ ...imported.session, status: 'recording' }); try {
        for (const f of imported.frames)
            await store.append(f);
        await store.save(imported.session);
    }
    catch (e) {
        await store.delete(imported.session.id);
        throw e;
    } await library(); await select(imported.session); })().catch(fail).finally(() => { busy = false; buttons(); q<HTMLInputElement>('import-file').value = ''; }); };
    window.addEventListener('pagehide', () => { cursor?.dispose(); if (recorder?.session.status === 'recording')
        void recorder.stop(true); });
    void store.recover().then(library).catch(fail);
    buttons();
    // Live overlays use only fresh tracking observations, never the saved diagnostics.
    const livePreview = () => { if (!pane.hidden && !cursor && videos.some(v => v.srcObject))
        void import('../tracking').then(({ trackingLabBridge: live }) => { if (cursor || pane.hidden)
            return; const snapshots = [live.snapshot(0), live.snapshot(1)]; for (let c = 0; c < 2; c++) {
            overlay(c, snapshots[c]);
            const stats = liveStats[c], now = performance.now(), count = videos[c].getVideoPlaybackQuality?.().totalVideoFrames ?? 0;
            if (now - stats.at >= 1000) {
                stats.fps = Math.max(0, (count - stats.count) * 1000 / (now - stats.at));
                stats.at = now;
                stats.count = count;
            }
        } q('diagnostics-title').textContent = 'Live tracking diagnostics'; q('diagnostics').textContent = snapshots[0].status+'\n'+confidenceLabel(snapshots[0])+'\n' + snapshots.map((s, c) => `Camera ${c + 1}: ${videos[c].srcObject ? liveStats[c].fps.toFixed(1) + ' FPS' : 'off'} · ${s.markers.length} marker(s) · ${s.balls.filter(b => b.state === 'detected').length} currently detected ball(s)`).join('\n'); }); setTimeout(livePreview, 150); };
    livePreview();
}
