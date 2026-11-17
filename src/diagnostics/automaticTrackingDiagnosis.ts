import type { TimingRow } from './TrackingPerformance';

export interface DiagnosisInput {
  elapsedSeconds: number;
  rows: TimingRow[];
  counters: Record<string, number>;
}

export interface DiagnosisContext {
  camera1?: { width?: number; height?: number };
  camera2?: { width?: number; height?: number };
  staleDecodeDrops?: number;
  stereoActive?: boolean;
  stereoRejections?: Record<string, string>;
}

export interface TrackingFinding { severity: 'good' | 'info' | 'warning'; message: string }

/** Converts profiler numbers into short, evidence-based next actions. */
export function automaticTrackingDiagnosis(performance: DiagnosisInput, context: DiagnosisContext): TrackingFinding[] {
  if (performance.elapsedSeconds < 3) return [{ severity: 'info', message: 'Collecting at least 3 seconds of tracking data…' }];
  const findings: TrackingFinding[] = [];
  const row = (name: string) => performance.rows.find((entry) => entry.name === name);
  for (const camera of [1, 2] as const) {
    const size = context[`camera${camera}`];
    const pixels = (size?.width ?? 0) * (size?.height ?? 0);
    const searched = performance.counters[`Camera ${camera} searched pixels`] ?? 0;
    if (pixels && searched) {
      const equivalents = searched / pixels / performance.elapsedSeconds;
      if (equivalents > 1) findings.push({ severity: 'warning', message: `Camera ${camera} search load is ${equivalents.toFixed(1)} full frames/s; repeated recovery scans dominate.` });
      else findings.push({ severity: 'info', message: `Camera ${camera} search load: ${equivalents.toFixed(2)} full-frame equivalents/s.` });
    }
    const decode = row(`Camera ${camera} decode worker`);
    if (decode && decode.p95Ms > 100) findings.push({ severity: 'warning', message: `Camera ${camera} decode P95 is ${decode.p95Ms.toFixed(0)} ms; marker results will arrive late.` });
    const age = row(`Camera ${camera} decode frame age`);
    if (age && age.p95Ms > 180) findings.push({ severity: 'warning', message: `Camera ${camera} decode frames reach tracking ${age.p95Ms.toFixed(0)} ms old at P95.` });
  }
  const stages = ['thresholding', 'contour detection', 'quadrilateral candidates']
    .map((stage) => ({ stage, value: row(`Camera 1 decode ${stage}`)?.meanMs ?? 0 }))
    .sort((a, b) => b.value - a.value);
  if (stages[0].value > 20) findings.push({ severity: 'info', message: `Largest Camera 1 decode stage: ${stages[0].stage} (${stages[0].value.toFixed(0)} ms average).` });
  if ((context.staleDecodeDrops ?? 0) > 0) findings.push({ severity: 'warning', message: `${context.staleDecodeDrops} stale decode result(s) were discarded; reduce scan/decode latency.` });
  const rejections = Object.entries(context.stereoRejections ?? {});
  if (context.stereoActive && rejections.length) findings.push({ severity: 'warning', message: `Stereo fallback active: ${rejections.map(([instrument, reason]) => `${instrument}: ${reason}`).join(' · ')}` });
  if (!findings.some((finding) => finding.severity === 'warning')) findings.unshift({ severity: 'good', message: 'No automatic performance warning in the current window.' });
  return findings;
}
