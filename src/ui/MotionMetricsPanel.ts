import { setDisabled } from './setText';
import { motionRecorder, type MotionSummary } from '../gameplay/motionMetrics';

/**
 * Diagnostics → "Motion metrics": start/stop recording the calibrated stereo
 * tips, a live summary, and a JSON export for research (src/gameplay/motionMetrics.ts).
 */

const LABELS: Record<string, string> = { needleDriver: 'Needle driver', forceps: 'Forceps', scissors: 'Scissors' };
/** How often the live summary refreshes (ms). */
const REFRESH_MS = 500;

function table(summary: MotionSummary): string {
  if (!summary.instruments.length) return '<p class="tracking-message">No calibrated tips recorded yet. Calibrate tips and track with both cameras.</p>';
  const rows = summary.instruments.map((m) => `<tr><td>${LABELS[m.instrument] ?? m.instrument}</td><td>${m.trackedSeconds.toFixed(1)} s</td><td>${m.pathLengthMm.toFixed(0)} mm</td><td>${m.meanSpeedMmS.toFixed(0)} mm/s</td><td>${m.idleSeconds.toFixed(1)} s</td><td>${m.movements}</td></tr>`).join('');
  const both = summary.bimanualFraction === null ? '' : `<p class="tracking-message">Both hands moving: ${(summary.bimanualFraction * 100).toFixed(0)}% of the time.</p>`;
  return `<table class="motion-metrics-table"><thead><tr><th>Instrument</th><th>Tracked</th><th>Path</th><th>Mean speed</th><th>Idle</th><th>Movements</th></tr></thead><tbody>${rows}</tbody></table>${both}`;
}

export function mountMotionMetricsPanel(host: HTMLElement, build: () => string) {
  const details = document.createElement('details');
  details.className = 'tracking-details';
  details.innerHTML = `<summary>Motion metrics (research)</summary><div class="tracking-details-body">
<p class="tracking-message">Records the calibrated tips (two cameras) and measures time, path length, speed, idle time and movements per instrument. Approximate; for comparing attempts, not for assessment.</p>
<div class="tracking-actions"><button type="button" data-motion-toggle>Start recording</button><button type="button" data-motion-export disabled>Export JSON</button><span data-motion-count></span></div>
<div data-motion-summary></div></div>`;
  host.append(details);
  const toggle = details.querySelector<HTMLButtonElement>('[data-motion-toggle]')!;
  const exportButton = details.querySelector<HTMLButtonElement>('[data-motion-export]')!;
  const count = details.querySelector<HTMLElement>('[data-motion-count]')!;
  const summary = details.querySelector<HTMLElement>('[data-motion-summary]')!;
  const refresh = () => {
    toggle.textContent = motionRecorder.active ? 'Stop recording' : 'Start recording';
    setDisabled(exportButton, motionRecorder.active || motionRecorder.count === 0);
    count.textContent = motionRecorder.count ? `${motionRecorder.count} samples${motionRecorder.active ? ' · recording…' : ''}` : '';
    if (details.open) summary.innerHTML = table(motionRecorder.summary());
  };
  toggle.addEventListener('click', () => {
    if (motionRecorder.active) motionRecorder.stop();
    else motionRecorder.start();
    refresh();
  });
  exportButton.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(motionRecorder.exportData(build()), null, 1)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `suturehero-motion-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  });
  details.addEventListener('toggle', refresh);
  setInterval(refresh, REFRESH_MS);
  refresh();
}
