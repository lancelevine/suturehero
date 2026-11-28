import { describeBiteHands } from '../gameplay/biteHand';
import { describeThreadBudget } from '../gameplay/threadBudget';
import { describePatterns, recognisePatterns } from '../gameplay/stitchPatterns';
import { biteShape, describeBiteShapes } from '../gameplay/biteShape';
import { describeBiteDepths } from '../gameplay/biteDepth';
import { describeDeadSpace } from '../gameplay/deadSpace';
import { describeEdgeShear } from '../gameplay/edgeShear';
import { describeNextDrill } from '../gameplay/nextDrill';
import { describeFirstPass } from '../gameplay/firstPassRate';
import { describeHealingOutlook } from '../gameplay/healingOutlook';
import { describeLanger, langerAngle } from '../environments/langerLines';
import { addToGallery, galleryCaption, loadGallery } from '../gameplay/closureGallery';
import { siteTunedTargets } from '../gameplay/siteTargets';
import { describeRubric, osatsRubric } from '../gameplay/osatsRubric';
import type { SkillReport } from '../gameplay/skillAnalysis';
import { describeStitchDensity } from '../gameplay/stitchDensity';
import { PRACTICE_SETUP } from '../setup/PracticeSetup';
import { SCENE_MM_PER_UNIT } from '../setup/sceneScale';
import { describeWarmups, loadWarmups, localDay, saveWarmup, WARMUP_SECONDS } from '../gameplay/warmupLog';
import { formatClock } from './practiceHud';
import { setText } from './setText';
import { describeBiteConsistency } from '../gameplay/biteConsistency';
import { describeStitchOrder } from '../gameplay/stitchOrder';
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
  /** Skill Analysis report for the session export (roadmap "Exportable skills report"). */
  skillReport?(): unknown;
  /** A small image of the view for the closure gallery (null if unavailable). */
  snapshot?(): Promise<string | null>;
  /** Bites backed out / undone (first-pass rate). */
  firstPass?(): { backOuts: number; undone: number };
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
/** How often the warm-up countdown updates (ms). */
const WARMUP_TICK_MS = 1000;

export function mountSandboxSummaryPanel(host: HTMLElement, source: SandboxSource) {
  const storage = browserStorage();
  let targets = loadTargets(storage);
  const panel = document.createElement('section');
  panel.className = 'sandbox-summary';
  panel.setAttribute('aria-label', 'Sandbox session summary');
  panel.innerHTML = `<h3>Sandbox session</h3><div class="sandbox-warmup"><button type="button" data-action="warmup">Start 5-minute warm-up</button><span class="sandbox-warmup-status" role="status"></span></div><p class="sandbox-summary-line" role="status"></p><p class="sandbox-spacing"></p><p class="sandbox-bites"></p><p class="sandbox-depths"></p><p class="sandbox-shapes"></p><p class="sandbox-patterns"></p><p class="sandbox-thread"></p><p class="sandbox-hands"></p><ul class="sandbox-targets"></ul>
<details><summary>Instructor targets</summary><form class="sandbox-target-form">${TARGET_FIELDS.map((f) => `<label>${f.label} <input type="number" name="${f.key}" step="${f.step}" min="0"></label>`).join('')}<button type="button" data-action="defaults">Defaults</button></form></details>
<label class="sandbox-trainee">Trainee name or ID <input type="text" name="trainee" maxlength="80" autocomplete="off"></label>
<div class="sandbox-summary-actions"><button type="button" data-action="save">Save session to progress</button><button type="button" data-action="export">Export session JSON</button><button type="button" data-action="stitches-csv">Export stitches CSV</button><button type="button" data-action="progress-csv">Export progress CSV</button></div><p class="sandbox-trend"></p><div class="closure-gallery" aria-label="Closure gallery"></div>
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
  // 5-minute warm-up drill and daily log (src/gameplay/warmupLog.ts): counts the passes made during it.
  const warmupButton = panel.querySelector<HTMLButtonElement>('[data-action="warmup"]')!;
  const warmupStatus = panel.querySelector<HTMLElement>('.sandbox-warmup-status')!;
  let warmup: { startedAt: number; firstPass: number } | null = null;
  const finishWarmup = (completed: boolean) => {
    if (!warmup) return;
    const passes = source.passes().slice(warmup.firstPass);
    warmup = null;
    if (completed) saveWarmup(storage, { day: localDay(new Date()), passes: passes.length, meanBiteMm: summarizeSandbox(passes, [], []).meanBiteMm });
    setText(warmupButton, 'Start 5-minute warm-up');
    updateWarmup();
  };
  const updateWarmup = () => {
    if (!warmup) {
      setText(warmupStatus, describeWarmups(loadWarmups(storage), new Date()));
      return;
    }
    const left = WARMUP_SECONDS - (performance.now() - warmup.startedAt) / 1000;
    if (left <= 0) {
      finishWarmup(true);
      return;
    }
    const passes = source.passes().length - warmup.firstPass;
    setText(warmupStatus, `Warm-up ${formatClock(left)} left · ${passes} pass${passes === 1 ? '' : 'es'} so far · keep bites even and square to the wound`);
  };
  setInterval(updateWarmup, WARMUP_TICK_MS);
  updateWarmup();
  panel.addEventListener('click', (event) => {
    const action = (event.target as HTMLElement).closest('button')?.dataset.action;
    if (action === 'warmup') {
      if (warmup) finishWarmup(false);
      else {
        warmup = { startedAt: performance.now(), firstPass: source.passes().length };
        setText(warmupButton, 'Stop warm-up');
        updateWarmup();
      }
    } else if (action === 'defaults') {
      targets = loadTargets(null);
      saveTargets(storage, targets);
      fillForm();
      render(true);
    } else if (action === 'save') {
      appendProgress(storage, saved());
      render(true);
      const results = checkTargets(current(), siteTunedTargets(targets, PRACTICE_SETUP.skin.site?.id));
      void source.snapshot?.().then((image) => {
        if (!image) return;
        addToGallery(storage, { at: new Date().toISOString(), image, met: results.filter((r) => r.met === true).length, total: results.length });
        renderGallery();
      });
    } else if (action === 'export') {
      const data = { build: source.build(), trainee: trainee() || null, sessionSeconds: Math.round(source.sessionSeconds()), summary: current(), targets, targetResults: checkTargets(current(), siteTunedTargets(targets, PRACTICE_SETUP.skin.site?.id)), passes: source.passes(), torn: source.torn(), stitches: source.stitches(), stitchRecords: source.stitchRecords(), progress: loadProgress(storage), skills: source.skillReport?.() ?? null };
      download(JSON.stringify(data, null, 2), 'application/json', fileName('session', 'json'));
    } else if (action === 'stitches-csv') {
      download(stitchesCsv(source.stitchRecords(), trainee(), source.build()), 'text/csv', fileName('stitches', 'csv'));
    } else if (action === 'progress-csv') {
      download(sessionsCsv(loadProgress(storage)), 'text/csv', fileName('progress', 'csv'));
    }
  });
  let key = '';
  // Closure gallery (gameplay/closureGallery.ts): saved snapshots, newest first; rebuilt only when it changes.
  let galleryKey = '';
  const renderGallery = () => {
    const entries = loadGallery(storage);
    const key = entries.map((e) => e.at).join('|');
    if (key === galleryKey) return;
    galleryKey = key;
    const host = panel.querySelector<HTMLElement>('.closure-gallery')!;
    host.replaceChildren(...entries.map((entry) => {
      const figure = document.createElement('figure');
      const image = document.createElement('img');
      image.src = entry.image;
      image.alt = `Closure saved ${galleryCaption(entry)}`;
      const caption = document.createElement('figcaption');
      caption.textContent = galleryCaption(entry);
      figure.append(image, caption);
      return figure;
    }));
  };
  const render = (force = false) => {
    panel.hidden = !source.active();
    if (panel.hidden) return;
    const s = current();
    const nextKey = JSON.stringify([s.passes, s.tears, s.cutThroughs, s.stitches, s.meanBiteMm, s.spacingMm, s.worstSquareOffDeg, s.stitchOrder, s.biteConsistency]);
    if (!force && nextKey === key) return;
    key = nextKey;
    const n = (v: number | null, digits = 1, unit = ' mm') => (v === null ? '–' : `${v.toFixed(digits)}${unit}`);
    panel.querySelector('.sandbox-summary-line')!.textContent = `${s.passes} pass${s.passes === 1 ? '' : 'es'} · ${s.tears} torn · ${s.cutThroughs} cut through · mean bite ${n(s.meanBiteMm)} · depth ${n(s.meanDepthMm)} · entry ${n(s.meanEntryAngleDeg, 0, '°')} · ${s.stitches} tied (${s.secureKnots} secure)`;
    panel.querySelector('.sandbox-hands')!.textContent = describeBiteHands(source.passes());
    panel.querySelector('.sandbox-thread')!.textContent = describeThreadBudget(source.passes());
    panel.querySelector('.sandbox-patterns')!.textContent = describePatterns(recognisePatterns(source.passes()));
    panel.querySelector('.sandbox-shapes')!.textContent = describeBiteShapes(source.passes().filter((p) => p.exit).map((p) => biteShape(p.depth, Math.hypot(p.exit!.x - p.entry.x, p.exit!.z - p.entry.z))));
    panel.querySelector('.sandbox-depths')!.textContent = [source.firstPass ? describeFirstPass(source.passes().length, source.firstPass().backOuts, source.firstPass().undone) : '', describeBiteDepths(source.passes().map((p) => ({ deepestLayer: p.deepestLayer, depthMm: p.depth * SCENE_MM_PER_UNIT })))].filter(Boolean).join(' · ') + (source.passes().length ? ' · ' + describeDeadSpace(source.passes().map((p) => p.depth), SCENE_MM_PER_UNIT) : '');
    panel.querySelector('.sandbox-bites')!.textContent = [s.biteConsistency ? describeBiteConsistency(s.biteConsistency) : '', describeEdgeShear(source.passes().map((p) => ({ entryEdgeMm: p.entryEdge * SCENE_MM_PER_UNIT, exitEdgeMm: p.exitEdge === null ? null : p.exitEdge * SCENE_MM_PER_UNIT })))].filter(Boolean).join(' · ');
    panel.querySelector('.sandbox-spacing')!.textContent = describeSpacing(s.spacingMm) + (s.stitchOrder?.total ? ' · ' + describeStitchOrder(s.stitchOrder) : '') + (s.stitchZ && s.stitchZ.length > 1 ? ' · ' + describeStitchDensity(s.stitchZ, PRACTICE_SETUP.skin.site?.tension ?? 1, SCENE_MM_PER_UNIT) : '');
    {
      const outlook = describeHealingOutlook({ reviews: source.stitches().map((st) => st.review), spacingMm: s.spacingMm });
      const langer = describeLanger(langerAngle(PRACTICE_SETUP.skin.site?.id));
      if (outlook) panel.querySelector('.sandbox-spacing')!.textContent += ' · ' + outlook + (langer ? ' · ' + langer : '');
    }
    const targetResults = checkTargets(s, siteTunedTargets(targets, PRACTICE_SETUP.skin.site?.id));
    const drillNote = describeNextDrill(targetResults);
    const skill = source.skillReport?.() as SkillReport | undefined;
    const rubricNote = s.passes > 0 && skill && typeof skill.seconds === 'number' ? describeRubric(osatsRubric(skill, s.tears + s.cutThroughs)) : '';
    panel.querySelector('.sandbox-targets')!.innerHTML = targetResults.map((r) => `<li class="${r.met === null ? 'pending' : r.met ? 'met' : 'missed'}">${r.met === null ? '○' : r.met ? '✓' : '✗'} ${r.label} · ${r.detail}</li>`).join('') + (drillNote ? `<li class="next-drill">→ ${drillNote}</li>` : '') + (rubricNote ? `<li class="osats-rubric">${rubricNote}</li>` : '');
    panel.querySelector('.sandbox-trend')!.textContent = describeTrend(loadProgress(storage), targets);
    renderGallery();
  };
  render(true);
  setInterval(render, REFRESH_MS);
  return panel;
}
