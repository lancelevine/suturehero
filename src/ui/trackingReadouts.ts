import * as THREE from 'three';

/** Tracking-page readouts and overlay drawing helpers (moved out of src/tracking.ts, 2026-11-27). */

/** After this long without a fresh pose (ms) the readout says "Last seen". */
export const LAST_SEEN_AFTER_MS = 130;

export interface ReadoutTarget {
  lastSeen: number;
  pose: { id: number; position: THREE.Vector3; quaternion: THREE.Quaternion; reprojectionError: number };
}

/** One instrument's pose line: ID, position (mm), roll/pitch/yaw and reprojection error. */
export function poseReadoutText(target: ReadoutTarget | undefined, now: number, holdMs: number): string {
  if (!target) return 'Not visible';
  const age = now - target.lastSeen;
  if (age > holdMs) return 'Not visible';
  const pose = target.pose;
  const position = pose.position;
  const euler = new THREE.Euler().setFromQuaternion(pose.quaternion, 'XYZ');
  const degrees = (radians: number) => ((radians * 180) / Math.PI).toFixed(0);
  return `${age > LAST_SEEN_AFTER_MS ? 'Last seen · ' : ''}ID ${pose.id} · X ${position.x.toFixed(1)}, Y ${position.y.toFixed(1)}, Z ${position.z.toFixed(1)} mm · RPY ${degrees(euler.x)}°/${degrees(euler.y)}°/${degrees(euler.z)}° · error ${pose.reprojectionError.toFixed(1)} px (uncalibrated)`;
}

/** Start a closed path through a marker's four corners (the caller strokes or fills it). */
export function traceQuad(context: Pick<CanvasRenderingContext2D, 'beginPath' | 'moveTo' | 'lineTo' | 'closePath'>, corners: readonly { x: number; y: number }[]) {
  context.beginPath();
  context.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < 4; i++) context.lineTo(corners[i].x, corners[i].y);
  context.closePath();
}

/** One instrument's depth-filter state, as shown under Diagnostics. */
export interface FilterMeasurement {
  rawZ: number;
  filteredZ: number;
  angle: number;
  locked: boolean;
  valid: boolean;
  source: string;
}

/** Depth-filter line for the three instruments ("waiting" before the first measurement). */
export function filterDiagnosticsText(measurements: ReadonlyMap<string, FilterMeasurement>): string {
  return (['needleDriver', 'forceps', 'scissors'] as const)
    .map((name) => {
      const m = measurements.get(name);
      if (!m) return `${name}: waiting`;
      const state = m.locked ? 'stationary lock' : m.valid ? 'tracking' : 'depth unavailable';
      return `${name}: distance ${m.rawZ.toFixed(0)} mm · virtual Z ${m.filteredZ.toFixed(2)} · Δ rotation ${m.angle.toFixed(1)}° · ${state} · depth from ${m.source}`;
    })
    .join(' | ');
}

/** Which tracker faces each instrument shows (two or more at once is an overlap). */
export function faceOverlapText(groups: Readonly<Record<string, readonly number[]>>, visibleIds: readonly number[], geometry: { faceCount: number; sideStepRadians: number }): string {
  const spacing = THREE.MathUtils.radToDeg(geometry.sideStepRadians).toFixed(0);
  return Object.keys(groups)
    .map((name) => {
      const visible = visibleIds.filter((id) => groups[name].includes(id));
      const faces = visible.length > 1 ? 'OVERLAP ' + visible.join('+') : visible.length ? 'face ' + visible[0] : 'none';
      return `${name}: ${faces} · ${visible.length}/${geometry.faceCount} visible · ${spacing}° side spacing`;
    })
    .join(' | ');
}

/** The decoder diagnostics rows (Diagnostics panel, "#diag-<name>") after a camera 1 decode. */
export function decodeDiagnosticsText(input: {
  frames: number;
  matched: number;
  outlines: number;
  cropped: boolean;
  regionW: number;
  regionH: number;
  regionKind: string;
  decoder: { candidateCount: number | null; rawMarkerCount: number; durationMs: number; pass: string; contrast: string; note: string };
  flowNote: string;
}): Record<string, string> {
  const d = input.decoder;
  return {
    frames: String(input.frames),
    candidates: d.candidateCount === null ? 'Unavailable' : String(d.candidateCount),
    outlines: String(input.outlines),
    decoded: `${input.matched} matched · ${d.rawMarkerCount} total`,
    time: d.durationMs.toFixed(0) + ' ms · ' + (input.cropped ? 'ROI' : 'full') + ' ' + input.regionW + '×' + input.regionH,
    pass: input.regionKind + ' · ' + d.pass,
    contrast: d.contrast,
    note: d.note + ' · ' + input.flowNote,
  };
}
