import type { CameraProfile, LiveProfiler, ProfilerSnapshot, ProfilerStage } from '../diagnostics/LiveProfiler';
import type { StageStats } from '../diagnostics/profilerStats';
import { flowFrameSettings, setDecodeBitmaps, setFlowBitmaps } from '../input/flowFrames';
import { captureSettings, parseFrameDrivenSetting, setFrameDriven } from '../input/captureScheduling';

/** The visible panel refreshes at most this often (ms): twice a second. */
const UI_INTERVAL_MS = 500;

const NOTES = `Rolling statistics over the last ~120 samples per stage. "Busy" is time per second of wall
time; worker stages run in parallel with the main thread and with each other, so stage times must not be
added up to get frame rate. Main-thread percentages are shares of the summed top-level stages (nested rows
are excluded; asynchronous stages can still overlap slightly). Rendering is CPU submission, not GPU time.
Frame arrival is when decoded frames reach the page (requestVideoFrameCallback); the camera's and
browser's MJPEG decoding is not visible to the page. Frame age starts at the app's capture unless a
capture→callback time is shown.`;

const f = (value: number | null | undefined, digits = 1) => (value === null || value === undefined || !Number.isFinite(value) ? '—' : value.toFixed(digits));
const ms = (s: StageStats | null) => (s ? `${f(s.medianMs)} median / ${f(s.p95Ms)} p95 ms` : '—');

/** Collapsible "Performance" profiler, off by default. */
export function mountProfilerPanel(host: HTMLElement, profiler: LiveProfiler, context: () => Record<string, unknown>) {
  const panel = document.createElement('details');
  panel.id = 'live-profiler';
  panel.className = 'tracking-details';
  panel.innerHTML = `<summary>Performance</summary>
<div class="tracking-details-body" style="font-size:12px">
 <div class="tracking-actions" style="flex-wrap:wrap;gap:6px">
  <label><input type="checkbox" data-profiler-enable> Enable live profiler</label>
  <button type="button" data-profiler-copy>Copy JSON</button>
  <button type="button" data-profiler-download>Download JSON</button>
  <button type="button" data-profiler-reset>Reset</button>
 </div>
 <label title="Stage 1 optimisation (build 0.111). Turn off to compare with the previous canvas readback; applies immediately."><input type="checkbox" data-flow-bitmaps> Optical-flow frames as transferred bitmaps (new; off = previous canvas readback)</label>
 <label title="Build 0.123. Auto = on for the OV9281 camera type. Applies immediately.">Camera frames processed <select data-frame-driven><option value="auto">Auto (as they arrive for OV9281)</option><option value="on">As they arrive</option><option value="off">At display refresh (previous)</option></select></label>
 <label title="Build 0.121. Off by default until measured on real hardware; applies immediately."><input type="checkbox" data-decode-bitmaps> ArUco decode regions as transferred bitmaps (experimental; off = main-thread canvas readback)</label>
 <p role="status" data-profiler-summary>Off. Tick “Enable live profiler”, run the cameras for ~10 s, then copy or download the report.</p>
 <div data-profiler-body hidden>
  <div data-profiler-cameras style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:8px"></div>
  <h4 style="margin:8px 0 4px">Where the time goes</h4>
  <div data-profiler-breakdown></div>
  <details style="margin-top:6px"><summary>All stages</summary>
   <div style="overflow:auto;max-height:45vh"><table class="calibration-axis-table" style="font-size:11px;width:100%">
    <thead><tr><th>Stage</th><th>Cam</th><th>Thread</th><th>n</th><th>Mean</th><th>Median</th><th>P95</th><th>/s</th><th>Busy ms/s</th></tr></thead>
    <tbody data-profiler-rows></tbody></table></div>
  </details>
  <p style="opacity:.8">${NOTES}</p>
 </div>
 <p role="status" data-profiler-copy-status></p>
</div>`;
  host.append(panel);
  const $ = <T extends Element>(s: string) => panel.querySelector<T>(s)!;
  const enable = $<HTMLInputElement>('[data-profiler-enable]');
  const summary = $<HTMLElement>('[data-profiler-summary]');
  const body = $<HTMLElement>('[data-profiler-body]');
  const copyStatus = $<HTMLElement>('[data-profiler-copy-status]');

  const json = () => JSON.stringify(profiler.report(context()), null, 2);
  let timer: number | undefined;
  const visible = () => panel.open && document.visibilityState === 'visible' && (!panel.closest('dialog') || panel.closest('dialog')!.open);

  function render() {
    if (!profiler.enabled || !visible()) return;
    const snap = profiler.snapshot();
    const b = snap.breakdown.bottleneck;
    summary.textContent = b
      ? `Largest measured cost: ${b.info.label} (${b.info.camera === 'shared' ? 'shared' : `Camera ${b.info.camera}`}, ${b.info.thread}) · ${f(b.busyMsPerSec, 0)} ms per second.`
      : `Collecting… (${f(snap.enabledForSeconds, 0)} s)`;
    $('[data-profiler-cameras]').replaceChildren(...snap.cameras.map(cameraCard));
    $('[data-profiler-breakdown]').replaceChildren(breakdownView(snap));
    $('[data-profiler-rows]').replaceChildren(...stageRows(snap.stages));
  }

  function start() {
    profiler.enable();
    body.hidden = false;
    timer = window.setInterval(render, UI_INTERVAL_MS);
    render();
  }
  function stop() {
    profiler.disable();
    window.clearInterval(timer);
    timer = undefined;
    body.hidden = true;
    summary.textContent = 'Off. Profiling hooks and frame callbacks are removed.';
  }
  enable.addEventListener('change', () => (enable.checked ? start() : stop()));
  const frameDrivenSelect = $<HTMLSelectElement>('[data-frame-driven]');
  frameDrivenSelect.value = captureSettings.frameDriven;
  frameDrivenSelect.addEventListener('change', () => {
    setFrameDriven(parseFrameDrivenSetting(frameDrivenSelect.value));
    if (profiler.enabled) {
      profiler.disable();
      profiler.enable();
    }
  });
  const decodeBitmaps = $<HTMLInputElement>('[data-decode-bitmaps]');
  decodeBitmaps.checked = flowFrameSettings.useDecodeBitmaps;
  decodeBitmaps.addEventListener('change', () => {
    setDecodeBitmaps(decodeBitmaps.checked);
    if (profiler.enabled) {
      profiler.disable();
      profiler.enable();
    }
  });
  const bitmaps = $<HTMLInputElement>('[data-flow-bitmaps]');
  bitmaps.checked = flowFrameSettings.useBitmaps;
  bitmaps.addEventListener('change', () => {
    setFlowBitmaps(bitmaps.checked);
    // Fresh statistics for the new setting.
    if (profiler.enabled) {
      profiler.disable();
      profiler.enable();
    }
  });
  panel.addEventListener('toggle', render);
  $('[data-profiler-reset]').addEventListener('click', () => {
    if (!profiler.enabled) return;
    profiler.disable();
    profiler.enable();
    render();
  });
  $('[data-profiler-copy]').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(json());
      copyStatus.textContent = 'Profile copied.';
    } catch {
      copyStatus.textContent = 'Copy was blocked by the browser; use Download JSON.';
    }
  });
  $('[data-profiler-download]').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([json()], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `suturehero-profile-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    copyStatus.textContent = 'Profile downloaded.';
  });
  window.addEventListener('pagehide', stop, { once: true });
}

function cameraCard(c: CameraProfile): HTMLElement {
  const card = document.createElement('div');
  card.style.cssText = 'border:1px solid rgba(127,127,127,.35);border-radius:6px;padding:6px 8px';
  card.dataset.profilerCamera = String(c.index);
  const s = c.settings as { width?: number; height?: number; frameRate?: number };
  const lines: Array<[string, string]> = c.running
    ? [
        ['Requested', `${c.requested.width}×${c.requested.height} @ ${c.requested.frameRate} fps`],
        ['Track settings', `${s.width ?? '—'}×${s.height ?? '—'} @ ${f(s.frameRate)} fps`],
        ['Video element', `${c.video.width}×${c.video.height}`],
        ['Frame arrival', `${f(c.cadence.arrivalFps)} fps (${c.cadence.source}) · interval ${ms(c.cadence.interval)}`],
        ['Missed presentations', String(c.cadence.missedPresentations) + (c.playbackQuality ? ` · browser dropped ${c.playbackQuality.droppedVideoFrames}/${c.playbackQuality.totalVideoFrames}` : '')],
        ['Capture → page', c.cadence.captureToCallback ? ms(c.cadence.captureToCallback) : 'not reported by this browser'],
        ['Processed', `marker decodes ${f(c.processed.markerDecodesPerSec)}/s · optical flow ${f(c.processed.opticalFlowPerSec)}/s`],
        ['Frame age at result', `decode ${ms(c.decodeFrameAge)} · flow ${ms(c.flowFrameAge)}`],
        ['Skipped/discarded', Object.entries(c.skipped).map(([k, v]) => `${k}: ${v}`).join(' · ') || 'none'],
      ]
    : [['Status', 'Not running']];
  card.innerHTML = `<strong>Camera ${c.index}</strong>`;
  for (const [k, v] of lines) {
    const row = document.createElement('div');
    row.innerHTML = `<span style="opacity:.75">${k}:</span> `;
    row.append(v);
    card.append(row);
  }
  return card;
}

function breakdownView(snap: ProfilerSnapshot): HTMLElement {
  const wrap = document.createElement('div');
  const bar = (label: string, percent: number, detail: string) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:grid;grid-template-columns:minmax(120px,1.4fr) 2fr auto;gap:6px;align-items:center;margin:2px 0';
    const name = document.createElement('span');
    name.textContent = label;
    const track = document.createElement('span');
    track.style.cssText = 'height:8px;background:rgba(127,127,127,.2);border-radius:4px;overflow:hidden';
    const fill = document.createElement('span');
    fill.style.cssText = `display:block;height:100%;width:${Math.max(0, Math.min(100, percent)).toFixed(1)}%;background:#2f7d6b`;
    track.append(fill);
    const value = document.createElement('span');
    value.textContent = detail;
    row.append(name, track, value);
    return row;
  };
  const title = (text: string) => {
    const p = document.createElement('p');
    p.style.margin = '6px 0 2px';
    p.textContent = text;
    return p;
  };
  const where = (c: 1 | 2 | 'shared') => (c === 'shared' ? 'shared' : `Cam ${c}`);
  wrap.append(title('Main thread — % of summed top-level stage time:'));
  for (const r of snap.breakdown.main.slice(0, 8)) wrap.append(bar(`${r.info.label} (${where(r.info.camera)})`, r.percent, `${f(r.percent, 0)}% · ${f(r.busyMsPerSec, 0)} ms/s`));
  if (!snap.breakdown.main.length) wrap.append(title('No main-thread stages measured yet.'));
  wrap.append(title('Workers — % of each worker kept busy (they run in parallel):'));
  for (const r of snap.breakdown.workers) wrap.append(bar(`${r.info.label} (${where(r.info.camera)})`, r.percent, `${f(r.percent, 0)}% busy · ${f(r.busyMsPerSec, 0)} ms/s`));
  if (!snap.breakdown.workers.length) wrap.append(title('No worker stages measured yet.'));
  return wrap;
}

function stageRows(stages: ProfilerStage[]): HTMLTableRowElement[] {
  const order = (s: ProfilerStage) => (s.info.camera === 1 ? 0 : s.info.camera === 2 ? 1 : 2);
  return [...stages]
    .sort((a, b) => order(a) - order(b) || b.busyMsPerSec - a.busyMsPerSec)
    .map((s) => {
      const tr = document.createElement('tr');
      const cells = [
        (s.info.nestedIn ? '↳ ' : '') + s.name,
        s.info.camera === 'shared' ? 'shared' : String(s.info.camera),
        s.info.thread,
        String(s.count),
        f(s.meanMs, 2),
        f(s.medianMs, 2),
        f(s.p95Ms, 2),
        f(s.ratePerSec),
        s.info.thread === 'latency' || s.info.thread === 'event' ? '—' : f(s.busyMsPerSec, 0),
      ];
      for (const value of cells) {
        const td = document.createElement('td');
        td.textContent = value;
        tr.append(td);
      }
      tr.title = s.info.label + (s.info.nestedIn ? ` (inside ${s.info.nestedIn})` : '');
      return tr;
    });
}
