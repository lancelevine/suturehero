import type { SkillReport } from '../gameplay/skillAnalysis';
import { formatClock } from './practiceHud';

/**
 * Skill Analysis panel (2026-11-27, mockup): stat list, instrument path chart (actual path solid
 * blue, ideal route through the needle entries dashed cyan, seen from above) and a small speed graph.
 */
const CHART_W = 300;
const CHART_H = 170;
const SPEED_H = 64;
const PAD = 10;
/** How often the open panel redraws (ms). */
const REFRESH_MS = 500;

const pct = (value: number | null) => (value === null ? '–' : `${Math.round(value * 100)}%`);

/** The stat rows: label, value, definition (tooltip) and whether the value is good. */
export function skillRows(report: SkillReport): Array<{ label: string; value: string; help: string; good: boolean }> {
  return [
    { label: 'Time', value: formatClock(report.seconds), help: 'Time since the practice session started', good: false },
    { label: 'Path length', value: `${report.pathLengthCm.toFixed(1)} cm`, help: 'Distance the needle-driver tip has travelled', good: false },
    { label: 'Smoothness', value: pct(report.smoothness), help: 'Share of movement without abrupt speed changes', good: (report.smoothness ?? 0) >= 0.8 },
    { label: 'Accuracy', value: report.accuracyMm === null ? '–' : `${report.accuracyMm.toFixed(1)} mm`, help: 'Mean entry/exit symmetry of completed needle passes', good: report.accuracyMm !== null && report.accuracyMm <= 1 },
    { label: 'Jaws control', value: pct(report.jawsControl), help: 'Share of forceps hold time without over-stretching or slipping the skin', good: (report.jawsControl ?? 0) >= 0.8 },
    ...(report.tipCollisions === undefined ? [] : [{ label: 'Tip collisions', value: String(report.tipCollisions), help: 'Times the needle-driver and forceps tips bumped together outside a needle handoff', good: report.tipCollisions === 0 }]),
    ...(report.regrasps === undefined ? [] : [{ label: 'Regrasp on tip', value: report.regrasps.total ? `${report.regrasps.onTip}/${report.regrasps.total}` : '–', help: 'In-tissue needle regrasps that gripped the tip (grip behind the tip and follow the curve)', good: report.regrasps.total > 0 && report.regrasps.onTip === 0 }]),
    ...(report.blindExits === undefined ? [] : [{ label: 'Blind exits', value: report.blindExits.total ? `${report.blindExits.hidden}/${report.blindExits.total}` : '–', help: 'Needle exits hidden behind an instrument from this view when they happened (approximate)', good: report.blindExits.total > 0 && report.blindExits.hidden === 0 }]),
  ];
}

/** SVG polyline points for a path, fitted (same scale on both axes) into the chart. */
export function fitPath(points: ReadonlyArray<{ x: number; z: number }>, extra: ReadonlyArray<{ x: number; z: number }> = [], width = CHART_W, height = CHART_H) {
  const all = [...points, ...extra];
  if (!all.length) return { path: '', ideal: '' };
  const xs = all.map((p) => p.x), zs = all.map((p) => p.z);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs);
  const scale = Math.min((width - 2 * PAD) / Math.max(1e-6, maxX - minX), (height - 2 * PAD) / Math.max(1e-6, maxZ - minZ));
  const offsetX = (width - (maxX - minX) * scale) / 2, offsetZ = (height - (maxZ - minZ) * scale) / 2;
  const map = (p: { x: number; z: number }) => `${(offsetX + (p.x - minX) * scale).toFixed(1)},${(offsetZ + (p.z - minZ) * scale).toFixed(1)}`;
  return { path: points.map(map).join(' '), ideal: extra.map(map).join(' ') };
}

export function speedLine(speed: ReadonlyArray<{ t: number; v: number }>, width = CHART_W, height = SPEED_H) {
  if (speed.length < 2) return '';
  const t0 = speed[0].t, t1 = speed.at(-1)!.t, top = Math.max(1, ...speed.map((s) => s.v));
  return speed.map((s) => `${(((s.t - t0) / Math.max(1e-6, t1 - t0)) * width).toFixed(1)},${(height - 4 - (s.v / top) * (height - 8)).toFixed(1)}`).join(' ');
}

/** Below this path length (cm) the chart shows a hint instead of a dot. */
const EMPTY_PATH_CM = 0.5;

export function mountSkillAnalysisPanel(host: HTMLElement, report: () => SkillReport, isOpen: () => boolean) {
  const panel = document.createElement('div');
  panel.className = 'skill-analysis';
  panel.innerHTML = `
<ul class="skill-stats" data-skill="stats"></ul>
<div class="skill-chart"><div class="skill-chart-head"><span>Instrument path</span><span class="skill-legend" title="Ideal: the shortest route through your needle entry points"><i class="actual"></i>Actual <i class="ideal"></i>Ideal</span></div>
<svg viewBox="0 0 ${CHART_W} ${CHART_H}" role="img" aria-label="Needle-driver tip path seen from above, with the shortest route through the needle entry points"><polyline class="ideal" data-skill="ideal"/><polyline class="actual" data-skill="path"/><text class="skill-empty" data-skill="path-empty" x="${CHART_W / 2}" y="${CHART_H / 2}" text-anchor="middle">Move the needle driver to draw its path</text></svg></div>
<div class="skill-chart"><div class="skill-chart-head"><span>Velocity</span><span data-skill="peak"></span></div>
<svg viewBox="0 0 ${CHART_W} ${SPEED_H}" role="img" aria-label="Tip speed over time"><polyline class="speed" data-skill="speed"/></svg></div>
<small>Approximate practice measures from the 3D scene; not a validated assessment.</small>`;
  host.append(panel);
  let lastRows = '';
  const pathEmpty = panel.querySelector<SVGTextElement>('[data-skill="path-empty"]')!;
  const render = () => {
    if (!isOpen()) return;
    const data = report();
    const rows = skillRows(data).map((row) => `<li title="${row.help}"><span>${row.label}</span><strong class="${row.good ? 'good' : ''}">${row.value}</strong></li>`).join('');
    // Rebuild the stat list only when it changed (it is refreshed several times a second).
    if (rows !== lastRows) {
      panel.querySelector('[data-skill="stats"]')!.innerHTML = rows;
      lastRows = rows;
    }
    const fitted = fitPath(data.path, data.ideal ?? []);
    panel.querySelector('[data-skill="path"]')!.setAttribute('points', fitted.path);
    panel.querySelector('[data-skill="ideal"]')!.setAttribute('points', fitted.ideal);
    pathEmpty.parentElement!.classList.toggle('empty', data.pathLengthCm < EMPTY_PATH_CM);
    panel.querySelector('[data-skill="speed"]')!.setAttribute('points', speedLine(data.speed));
    const peak = data.speed.length ? Math.max(...data.speed.map((s) => s.v)) : 0;
    panel.querySelector('[data-skill="peak"]')!.textContent = data.speed.length ? `peak ${Math.round(peak)} mm/s` : '';
  };
  render();
  setInterval(render, REFRESH_MS);
  return { render };
}
