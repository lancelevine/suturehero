import { appendProgress, checkTargets, describeSpacing, describeTrend, loadProgress, loadTargets, saveTargets, summarizeSandbox, type SandboxStitchInfo, type SandboxSummary, type SandboxTargets } from '../gameplay/sandboxSummary';
import type { FreePassRecord } from '../tissue/FreeNeedlePass';
import { sessionsCsv, stitchesCsv, type ExportStitch, type SavedSession } from '../gameplay/sessionRecord';
import { bindTraineeInput, downloadText, exportFileName } from './traineeExport';

/**
 * Sandbox session panel (2026-11-15): summary, instructor targets (editable,
 * saved in this browser), progress over saved sessions, and a JSON export.
 */

export interface SandboxSource {
  active(): boolean;
  passes(): readonly FreePassRecord[];
  torn(): readonly FreePassRecord[];
  stitches(): readonly SandboxStitchInfo[];
  build(): string;
  /** Every completed stitch with its knot and timing, for the CSV export. */
  stitchRecords(): readonly ExportStitch[];
  /** Seconds since the practice session started. */
  sessionSeconds(): number;
}

/** Trainee name or ID, kept in this browser and written into every export (traineeExport.ts). */
export { TRAINEE_STORAGE_KEY } from './traineeExport';

const TARGET_FIELDS: { key: keyof SandboxTargets; label: string; step: number }[] = [
  { key: 'biteMinMm', label: 'Bite min (mm)', step: 0.5 },
  { key: 'biteMaxMm', label: 'Bite max (mm)', step: 0.5 },
  { key: 'maxAsymmetryMm', label: 'Max entry/exit difference (mm)', step: 0.5 },
  { key: 'minEntryAngleDeg', label: 'Min entry angle (°)', step: 5 },
  { key: 'maxTears', label: 'Max tears', step: 1 },
  { key: 'maxSpacingSpreadMm', label: 'Max spacing spread (mm)', step: 0.5 },
  { key: 'maxSquareOffDeg', label: 'Max stitch angle off square (°)', step: 5 },
];

const browserStorage = () => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
};

/** How often the panel refreshes (ms). */
const REFRESH_MS = 500;

export function mountSandboxSummaryPanel(host: HTMLElement, source: SandboxSource) {
  const storage = browserStorage();
  let targets = loadTargets(storage);
  const panel = document.createElement('section');
  panel.className = 'sandbox-summary';
  panel.setAttribute('aria-label', 'Sandbox session summary');
  panel.innerHTML = `<h3>Sandbox session</h3><p class="sandbox-summary-line" role="status"></p><p class="sandbox-spacing"></p><ul class="sandbox-targets"></ul>
<details><summary>Instructor targets</summary><form class="sandbox-target-form">${TARGET_FIELDS.map((f) => `<label>${f.label} <input type="number" name="${f.key}" step="${f.step}" min="0"></label>`).join('')}<button type="button" data-action="defaults">Defaults</button></form></details>
<label class="sandbox-trainee">Trainee name or ID <input type="text" name="trainee" maxlength="80" autocomplete="off"></label>
<div class="sandbox-summary-actions"><button type="button" data-action="save">Save session to progress</button><button type="button" data-action="export">Export session JSON</button><button type="button" data-action="stitches-csv">Export stitches CSV</button><button type="button" data-action="progress-csv">Export progress CSV</button></div><p class="sandbox-trend"></p>
<small>Approximate practice measures (mm on the practice scale); not a validated assessment.</small>`;
  host.append(panel);
  const form = panel.querySelector<HTMLFormElement>('.sandbox-target-form')!;
  const fillForm = () => {
    for (const f of TARGET_FIELDS) (form.elements.namedItem(f.key) as HTMLInputElement).value = String(targets[f.key]);
  };
  fillForm();
  form.addEventListener('change', () => {
    for (const f of TARGET_FIELDS) {
      const value = Number((form.elements.namedItem(f.key) as HTMLInputElement).value);
      if (Number.isFinite(value) && value >= 0) targets[f.key] = value;
    }
    saveTargets(storage, targets);
    render(true);
  });
  const trainee = bindTraineeInput(panel.querySelector<HTMLInputElement>('input[name="trainee"]')!, storage);
  const fileName = (kind: string, extension: string) => exportFileName(kind, trainee(), extension);
  const download = downloadText;
  const current = (): SandboxSummary => summarizeSandbox(source.passes(), source.torn(), source.stitches());
  const saved = (): SavedSession => ({ ...current(), trainee: trainee() || undefined, durationSeconds: Math.round(source.sessionSeconds()) });
  panel.addEventListener('click', (event) => {
    const action = (event.target as HTMLElement).closest('button')?.dataset.action;
    if (action === 'defaults') {
      targets = loadTargets(null);
      saveTargets(storage, targets);
      fillForm();
      render(true);
    } else if (action === 'save') {
      appendProgress(storage, saved());
      render(true);
    } else if (action === 'export') {
      const data = { build: source.build(), trainee: trainee() || null, sessionSeconds: Math.round(source.sessionSeconds()), summary: current(), targets, targetResults: checkTargets(current(), targets), passes: source.passes(), torn: source.torn(), stitches: source.stitches(), stitchRecords: source.stitchRecords(), progress: loadProgress(storage) };
      download(JSON.stringify(data, null, 2), 'application/json', fileName('session', 'json'));
    } else if (action === 'stitches-csv') {
      download(stitchesCsv(source.stitchRecords(), trainee(), source.build()), 'text/csv', fileName('stitches', 'csv'));
    } else if (action === 'progress-csv') {
      download(sessionsCsv(loadProgress(storage)), 'text/csv', fileName('progress', 'csv'));
    }
  });
  let key = '';
  const render = (force = false) => {
    panel.hidden = !source.active();
    if (panel.hidden) return;
    const s = current();
    const nextKey = JSON.stringify([s.passes, s.tears, s.cutThroughs, s.stitches, s.meanBiteMm, s.spacingMm]);
    if (!force && nextKey === key) return;
    key = nextKey;
    const n = (v: number | null, digits = 1, unit = ' mm') => (v === null ? '–' : `${v.toFixed(digits)}${unit}`);
    panel.querySelector('.sandbox-summary-line')!.textContent = `${s.passes} pass${s.passes === 1 ? '' : 'es'} · ${s.tears} torn · ${s.cutThroughs} cut through · mean bite ${n(s.meanBiteMm)} · depth ${n(s.meanDepthMm)} · entry ${n(s.meanEntryAngleDeg, 0, '°')} · ${s.stitches} tied (${s.secureKnots} secure)`;
    panel.querySelector('.sandbox-spacing')!.textContent = describeSpacing(s.spacingMm);
    panel.querySelector('.sandbox-targets')!.innerHTML = checkTargets(s, targets).map((r) => `<li class="${r.met === null ? 'pending' : r.met ? 'met' : 'missed'}">${r.met === null ? '○' : r.met ? '✓' : '✗'} ${r.label} · ${r.detail}</li>`).join('');
    panel.querySelector('.sandbox-trend')!.textContent = describeTrend(loadProgress(storage), targets);
  };
  render(true);
  setInterval(render, REFRESH_MS);
  return panel;
}
